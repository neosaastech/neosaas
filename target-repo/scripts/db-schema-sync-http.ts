/**
 * DB Schema Sync via HTTP - Fallback when drizzle-kit push (TCP) fails
 *
 * This script uses the Neon HTTP driver (HTTPS port 443) to apply schema changes
 * when drizzle-kit push cannot connect via TCP (e.g., non-standard ports blocked
 * in Vercel build environment).
 *
 * It reads the current database state via information_schema and applies
 * CREATE TABLE / ALTER TABLE statements for missing tables and columns.
 *
 * This is NOT a full replacement for drizzle-kit push (no index/constraint management)
 * but covers the most common deployment scenario: adding new tables and columns.
 *
 * Usage: npx tsx scripts/db-schema-sync-http.ts
 */
import { neon } from '@neondatabase/serverless'

function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

// ─── Schema definition: all tables and their columns ───
// Source of truth: db/schema.ts
// Format: { table: string, columns: { name, type, nullable, default }[] }

interface ColumnDef {
  name: string
  type: string        // PostgreSQL type
  nullable?: boolean  // default true
  default_val?: string // SQL default expression
  unique?: boolean
}

interface TableDef {
  name: string
  columns: ColumnDef[]
}

// Enum types that must exist
const REQUIRED_ENUMS = [
  {
    name: 'notification_category',
    values: ['info', 'action', 'urgent'],
  },
]

// All tables from db/schema.ts with their columns
const SCHEMA: TableDef[] = [
  {
    name: 'companies',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'name', type: 'text', nullable: false },
      { name: 'email', type: 'text', nullable: false, unique: true },
      { name: 'city', type: 'text' },
      { name: 'address', type: 'text' },
      { name: 'zip_code', type: 'text' },
      { name: 'siret', type: 'text' },
      { name: 'vat_number', type: 'text' },
      { name: 'phone', type: 'text' },
      { name: 'stripe_customer_id', type: 'text' },
      { name: 'stripe_setup_intent_client_secret', type: 'text' },
      { name: 'stripe_default_payment_method', type: 'text' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'subscriptions',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'stripe_subscription_id', type: 'text', nullable: false, unique: true },
      { name: 'customer_id', type: 'uuid', nullable: false },
      { name: 'stripe_price_id', type: 'text', nullable: false },
      { name: 'status', type: 'text', nullable: false },
      { name: 'current_period_start', type: 'timestamp' },
      { name: 'current_period_end', type: 'timestamp' },
      { name: 'cancel_at_period_end', type: 'boolean', default_val: 'false' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'username', type: 'text', unique: true },
      { name: 'email', type: 'text', nullable: false, unique: true },
      { name: 'password', type: 'text', nullable: false },
      { name: 'first_name', type: 'text', nullable: false },
      { name: 'last_name', type: 'text', nullable: false },
      { name: 'phone', type: 'text' },
      { name: 'address', type: 'text' },
      { name: 'city', type: 'text' },
      { name: 'postal_code', type: 'text' },
      { name: 'country', type: 'text' },
      { name: 'position', type: 'text' },
      { name: 'profile_image', type: 'text' },
      { name: 'company_id', type: 'uuid' },
      { name: 'email_verified', type: 'timestamp' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'is_site_manager', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'is_dpo', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'verification_tokens',
    columns: [
      { name: 'identifier', type: 'text', nullable: false },
      { name: 'token', type: 'text', nullable: false },
      { name: 'expires', type: 'timestamp', nullable: false },
    ],
  },
  {
    name: 'oauth_connections',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'provider_user_id', type: 'text', nullable: false },
      { name: 'email', type: 'text', nullable: false },
      { name: 'access_token', type: 'text' },
      { name: 'refresh_token', type: 'text' },
      { name: 'expires_at', type: 'timestamp' },
      { name: 'scope', type: 'text' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'roles',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'name', type: 'text', nullable: false, unique: true },
      { name: 'scope', type: 'text', nullable: false },
      { name: 'description', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'permissions',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'name', type: 'text', nullable: false, unique: true },
      { name: 'scope', type: 'text', nullable: false },
      { name: 'description', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'user_roles',
    columns: [
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'role_id', type: 'uuid', nullable: false },
      { name: 'assigned_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'role_permissions',
    columns: [
      { name: 'role_id', type: 'uuid', nullable: false },
      { name: 'permission_id', type: 'uuid', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'user_invitations',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'email', type: 'text', nullable: false },
      { name: 'company_id', type: 'uuid', nullable: false },
      { name: 'role_id', type: 'uuid', nullable: false },
      { name: 'invited_by', type: 'uuid' },
      { name: 'token', type: 'text', nullable: false, unique: true },
      { name: 'status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'expires_at', type: 'timestamp', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'accepted_at', type: 'timestamp' },
    ],
  },
  {
    name: 'email_provider_configs',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'provider', type: 'text', nullable: false, unique: true },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'is_default', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'config', type: 'jsonb', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'email_templates',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'type', type: 'text', nullable: false, unique: true },
      { name: 'name', type: 'text', nullable: false },
      { name: 'description', type: 'text' },
      { name: 'from_name', type: 'text', nullable: false },
      { name: 'from_email', type: 'text', nullable: false },
      { name: 'subject', type: 'text', nullable: false },
      { name: 'html_content', type: 'text' },
      { name: 'text_content', type: 'text' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'provider', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'email_history',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'template_type', type: 'text' },
      { name: 'message_id', type: 'text' },
      { name: 'from', type: 'text', nullable: false },
      { name: 'to', type: 'jsonb', nullable: false },
      { name: 'cc', type: 'jsonb' },
      { name: 'bcc', type: 'jsonb' },
      { name: 'subject', type: 'text', nullable: false },
      { name: 'html_content', type: 'text' },
      { name: 'text_content', type: 'text' },
      { name: 'status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'error_message', type: 'text' },
      { name: 'tags', type: 'jsonb' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'sent_at', type: 'timestamp' },
      { name: 'delivered_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'email_events',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'email_history_id', type: 'uuid' },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'message_id', type: 'text' },
      { name: 'event_type', type: 'text', nullable: false },
      { name: 'event_data', type: 'jsonb' },
      { name: 'ip_address', type: 'text' },
      { name: 'user_agent', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'email_statistics',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'date', type: 'timestamp', nullable: false },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'total_sent', type: 'integer', nullable: false, default_val: '0' },
      { name: 'total_delivered', type: 'integer', nullable: false, default_val: '0' },
      { name: 'total_failed', type: 'integer', nullable: false, default_val: '0' },
      { name: 'total_bounced', type: 'integer', nullable: false, default_val: '0' },
      { name: 'total_opened', type: 'integer', nullable: false, default_val: '0' },
      { name: 'total_clicked', type: 'integer', nullable: false, default_val: '0' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'service_api_configs',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'service_name', type: 'text', nullable: false },
      { name: 'service_type', type: 'text', nullable: false },
      { name: 'environment', type: 'text', nullable: false, default_val: "'production'" },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'is_default', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'config', type: 'jsonb', nullable: false },
      { name: 'metadata', type: 'jsonb' },
      { name: 'last_tested_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'service_api_usage',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'config_id', type: 'uuid', nullable: false },
      { name: 'service_name', type: 'text', nullable: false },
      { name: 'operation', type: 'varchar(255)', nullable: false },
      { name: 'status', type: 'text', nullable: false },
      { name: 'status_code', type: 'varchar(10)' },
      { name: 'request_data', type: 'jsonb' },
      { name: 'response_data', type: 'jsonb' },
      { name: 'error_message', type: 'text' },
      { name: 'response_time', type: 'integer' },
      { name: 'cost_estimate', type: 'integer' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'user_api_keys',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'name', type: 'varchar(255)', nullable: false },
      { name: 'key_hash', type: 'varchar(255)', nullable: false, unique: true },
      { name: 'key_prefix', type: 'varchar(10)', nullable: false },
      { name: 'permissions', type: 'jsonb', nullable: false, default_val: "'[]'::jsonb" },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'expires_at', type: 'timestamp' },
      { name: 'last_used_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'user_api_key_usage',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'api_key_id', type: 'uuid', nullable: false },
      { name: 'endpoint', type: 'varchar(500)', nullable: false },
      { name: 'method', type: 'varchar(10)', nullable: false },
      { name: 'status_code', type: 'varchar(3)', nullable: false },
      { name: 'ip_address', type: 'varchar(45)' },
      { name: 'user_agent', type: 'text' },
      { name: 'response_time', type: 'varchar(50)' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid' },
      { name: 'company_id', type: 'uuid' },
      { name: 'order_number', type: 'varchar(50)', nullable: false, unique: true },
      { name: 'status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'total_amount', type: 'integer', nullable: false },
      { name: 'currency', type: 'varchar(3)', nullable: false, default_val: "'EUR'" },
      { name: 'payment_method', type: 'varchar(50)' },
      { name: 'payment_status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'payment_intent_id', type: 'varchar(255)' },
      { name: 'paid_at', type: 'timestamp' },
      { name: 'notes', type: 'text' },
      { name: 'requires_shipping', type: 'boolean', default_val: 'false' },
      { name: 'shipping_address', type: 'jsonb' },
      { name: 'shipping_status', type: 'text' },
      { name: 'shipping_tracking_number', type: 'text' },
      { name: 'shipping_carrier', type: 'text' },
      { name: 'shipped_at', type: 'timestamp' },
      { name: 'delivered_at', type: 'timestamp' },
      { name: 'shipping_reminder_sent', type: 'boolean', default_val: 'false' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'order_items',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'order_id', type: 'uuid', nullable: false },
      { name: 'item_type', type: 'varchar(50)', nullable: false },
      { name: 'item_id', type: 'varchar(100)' },
      { name: 'product_id', type: 'uuid' },
      { name: 'item_name', type: 'varchar(255)', nullable: false },
      { name: 'item_description', type: 'text' },
      { name: 'quantity', type: 'integer', nullable: false, default_val: '1' },
      { name: 'unit_price', type: 'integer', nullable: false },
      { name: 'total_price', type: 'integer', nullable: false },
      { name: 'delivery_time', type: 'varchar(100)' },
      { name: 'delivery_status', type: 'text', default_val: "'pending'" },
      { name: 'delivered_at', type: 'timestamp' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'shipments',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'order_id', type: 'uuid', nullable: false },
      { name: 'order_item_id', type: 'uuid' },
      { name: 'product_id', type: 'uuid' },
      { name: 'status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'tracking_number', type: 'text' },
      { name: 'carrier', type: 'text' },
      { name: 'tracking_url', type: 'text' },
      { name: 'shipping_address', type: 'jsonb', nullable: false },
      { name: 'estimated_delivery_date', type: 'timestamp' },
      { name: 'shipped_at', type: 'timestamp' },
      { name: 'delivered_at', type: 'timestamp' },
      { name: 'notes', type: 'text' },
      { name: 'emails_sent', type: 'jsonb', default_val: "'[]'::jsonb" },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'system_logs',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'category', type: 'text', nullable: false },
      { name: 'level', type: 'text', nullable: false, default_val: "'info'" },
      { name: 'message', type: 'text', nullable: false },
      { name: 'metadata', type: 'jsonb' },
      { name: 'user_id', type: 'uuid' },
      { name: 'resource_id', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'page_permissions',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'path', type: 'text', nullable: false, unique: true },
      { name: 'name', type: 'text', nullable: false },
      { name: 'access', type: 'text', nullable: false, default_val: "'public'" },
      { name: 'group', type: 'text', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'platform_config',
    columns: [
      { name: 'key', type: 'text', nullable: false },
      { name: 'value', type: 'text' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'terms_of_service',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'version', type: 'text', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'published_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'created_by', type: 'uuid' },
    ],
  },
  {
    name: 'user_tos_acceptance',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'tos_id', type: 'uuid', nullable: false },
      { name: 'accepted_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'ip_address', type: 'text' },
      { name: 'user_agent', type: 'text' },
    ],
  },
  {
    name: 'cookie_consents',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'ip_address', type: 'text', nullable: false },
      { name: 'user_agent', type: 'text' },
      { name: 'consent_status', type: 'text', nullable: false },
      { name: 'consented_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'vat_rates',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'name', type: 'text', nullable: false },
      { name: 'country', type: 'text', nullable: false },
      { name: 'rate', type: 'integer', nullable: false },
      { name: 'description', type: 'text' },
      { name: 'is_default', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'products',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'title', type: 'text', nullable: false },
      { name: 'subtitle', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'features', type: 'json' },
      { name: 'price', type: 'integer', nullable: false, default_val: '0' },
      { name: 'hourly_rate', type: 'integer' },
      { name: 'type', type: 'text', nullable: false, default_val: "'physical'" },
      { name: 'is_free', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'digital_delivery_type', type: 'text', default_val: "'license'" },
      { name: 'file_url', type: 'text' },
      { name: 'delivery_code', type: 'text' },
      { name: 'download_url', type: 'text' },
      { name: 'license_key', type: 'text' },
      { name: 'license_instructions', type: 'text' },
      { name: 'requires_shipping', type: 'boolean', default_val: 'false' },
      { name: 'weight', type: 'integer' },
      { name: 'dimensions', type: 'jsonb' },
      { name: 'stock_quantity', type: 'integer' },
      { name: 'shipping_notes', type: 'text' },
      { name: 'appointment_mode', type: 'text' },
      { name: 'appointment_duration', type: 'integer' },
      { name: 'payment_type', type: 'text', default_val: "'one_time'" },
      { name: 'subscription_price_weekly', type: 'integer' },
      { name: 'subscription_price_monthly', type: 'integer' },
      { name: 'subscription_price_yearly', type: 'integer' },
      { name: 'icon', type: 'text' },
      { name: 'image_url', type: 'text' },
      { name: 'vat_rate_id', type: 'uuid' },
      { name: 'currency', type: 'text', nullable: false, default_val: "'EUR'" },
      { name: 'outlook_event_type_id', type: 'text' },
      { name: 'is_published', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'is_featured', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'upsell_product_id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'coupons',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'code', type: 'text', nullable: false, unique: true },
      { name: 'description', type: 'text' },
      { name: 'discount_type', type: 'text', nullable: false },
      { name: 'discount_value', type: 'integer', nullable: false },
      { name: 'currency', type: 'text', default_val: "'EUR'" },
      { name: 'min_purchase_amount', type: 'integer' },
      { name: 'max_discount_amount', type: 'integer' },
      { name: 'usage_limit', type: 'integer' },
      { name: 'usage_count', type: 'integer', nullable: false, default_val: '0' },
      { name: 'per_user_limit', type: 'integer' },
      { name: 'start_date', type: 'timestamp' },
      { name: 'end_date', type: 'timestamp' },
      { name: 'applicable_products', type: 'json' },
      { name: 'excluded_products', type: 'json' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_by', type: 'uuid' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'coupon_usage',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'coupon_id', type: 'uuid', nullable: false },
      { name: 'user_id', type: 'uuid' },
      { name: 'order_id', type: 'uuid' },
      { name: 'discount_amount', type: 'integer', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'carts',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid' },
      { name: 'status', type: 'text', nullable: false, default_val: "'active'" },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'cart_items',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'cart_id', type: 'uuid', nullable: false },
      { name: 'product_id', type: 'uuid', nullable: false },
      { name: 'quantity', type: 'integer', nullable: false, default_val: '1' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'outlook_integrations',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false, unique: true },
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text' },
      { name: 'expires_at', type: 'timestamp', nullable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'product_leads',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'product_id', type: 'uuid', nullable: false },
      { name: 'user_id', type: 'uuid' },
      { name: 'user_email', type: 'text', nullable: false },
      { name: 'user_name', type: 'text' },
      { name: 'user_phone', type: 'text' },
      { name: 'status', type: 'text', nullable: false, default_val: "'new'" },
      { name: 'source', type: 'text', default_val: "'website'" },
      { name: 'notes', type: 'text' },
      { name: 'scheduled_at', type: 'timestamp' },
      { name: 'converted_at', type: 'timestamp' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'calendar_connections',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'email', type: 'text' },
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text' },
      { name: 'expires_at', type: 'timestamp' },
      { name: 'calendar_id', type: 'text' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'last_sync_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'appointments',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'product_id', type: 'uuid' },
      { name: 'assigned_admin_id', type: 'uuid' },
      { name: 'title', type: 'text', nullable: false },
      { name: 'description', type: 'text' },
      { name: 'location', type: 'text' },
      { name: 'meeting_url', type: 'text' },
      { name: 'start_time', type: 'timestamp', nullable: false },
      { name: 'end_time', type: 'timestamp', nullable: false },
      { name: 'timezone', type: 'text', nullable: false, default_val: "'Europe/Paris'" },
      { name: 'status', type: 'text', nullable: false, default_val: "'pending'" },
      { name: 'type', type: 'text', nullable: false, default_val: "'free'" },
      { name: 'price', type: 'integer', nullable: false, default_val: '0' },
      { name: 'currency', type: 'text', nullable: false, default_val: "'EUR'" },
      { name: 'is_paid', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'stripe_payment_intent_id', type: 'text' },
      { name: 'payment_status', type: 'text', default_val: "'pending'" },
      { name: 'paid_at', type: 'timestamp' },
      { name: 'google_event_id', type: 'text' },
      { name: 'microsoft_event_id', type: 'text' },
      { name: 'reminder_sent', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'reminder_at', type: 'timestamp' },
      { name: 'attendee_email', type: 'text' },
      { name: 'attendee_name', type: 'text' },
      { name: 'attendee_phone', type: 'text' },
      { name: 'notes', type: 'text' },
      { name: 'cancellation_reason', type: 'text' },
      { name: 'cancelled_at', type: 'timestamp' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'appointment_slots',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'product_id', type: 'uuid' },
      { name: 'day_of_week', type: 'integer', nullable: false },
      { name: 'start_time', type: 'text', nullable: false },
      { name: 'end_time', type: 'text', nullable: false },
      { name: 'duration', type: 'integer', nullable: false, default_val: '60' },
      { name: 'buffer_before', type: 'integer', default_val: '0' },
      { name: 'buffer_after', type: 'integer', default_val: '0' },
      { name: 'max_appointments', type: 'integer', default_val: '1' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'appointment_exceptions',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'date', type: 'timestamp', nullable: false },
      { name: 'is_available', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'start_time', type: 'text' },
      { name: 'end_time', type: 'text' },
      { name: 'reason', type: 'text' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'chat_conversations',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid' },
      { name: 'guest_email', type: 'text' },
      { name: 'guest_name', type: 'text' },
      { name: 'guest_session_id', type: 'text' },
      { name: 'subject', type: 'text', nullable: false },
      { name: 'category', type: 'notification_category', nullable: false, default_val: "'action'" },
      { name: 'status', type: 'text', nullable: false, default_val: "'open'" },
      { name: 'priority', type: 'text', default_val: "'normal'" },
      { name: 'assigned_admin_id', type: 'uuid' },
      { name: 'last_message_at', type: 'timestamp', default_val: 'now()' },
      { name: 'closed_at', type: 'timestamp' },
      { name: 'closed_by', type: 'uuid' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'chat_messages',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'conversation_id', type: 'uuid', nullable: false },
      { name: 'sender_id', type: 'uuid' },
      { name: 'sender_type', type: 'text', nullable: false },
      { name: 'sender_name', type: 'text' },
      { name: 'sender_email', type: 'text' },
      { name: 'content', type: 'text', nullable: false },
      { name: 'message_type', type: 'text', default_val: "'text'" },
      { name: 'attachment_url', type: 'text' },
      { name: 'attachment_name', type: 'text' },
      { name: 'is_read', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'read_at', type: 'timestamp' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'chat_quick_responses',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'title', type: 'text', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'category', type: 'text' },
      { name: 'shortcut', type: 'text' },
      { name: 'usage_count', type: 'integer', nullable: false, default_val: '0' },
      { name: 'created_by', type: 'uuid' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'chat_settings',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'key', type: 'text', nullable: false, unique: true },
      { name: 'value', type: 'text' },
      { name: 'description', type: 'text' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'llm_api_keys',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'name', type: 'text', nullable: false },
      { name: 'encrypted_key', type: 'text', nullable: false },
      { name: 'key_prefix', type: 'text' },
      { name: 'is_active', type: 'boolean', nullable: false, default_val: 'true' },
      { name: 'is_default', type: 'boolean', nullable: false, default_val: 'false' },
      { name: 'last_used_at', type: 'timestamp' },
      { name: 'usage_count', type: 'integer', nullable: false, default_val: '0' },
      { name: 'metadata', type: 'jsonb' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
  {
    name: 'llm_usage_logs',
    columns: [
      { name: 'id', type: 'uuid', nullable: false, default_val: 'gen_random_uuid()' },
      { name: 'key_id', type: 'uuid', nullable: false },
      { name: 'user_id', type: 'uuid' },
      { name: 'provider', type: 'text', nullable: false },
      { name: 'model', type: 'text' },
      { name: 'prompt_tokens', type: 'integer' },
      { name: 'completion_tokens', type: 'integer' },
      { name: 'total_tokens', type: 'integer' },
      { name: 'estimated_cost', type: 'integer' },
      { name: 'latency_ms', type: 'integer' },
      { name: 'status', type: 'text', nullable: false },
      { name: 'error_message', type: 'text' },
      { name: 'conversation_id', type: 'uuid' },
      { name: 'created_at', type: 'timestamp', nullable: false, default_val: 'now()' },
    ],
  },
]

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!url) {
    console.log('  DATABASE_URL not set, skipping HTTP schema sync')
    return
  }

  const sql = neon(cleanDatabaseUrl(url))

  console.log('  Fetching current database state...')

  // Get all existing tables
  const existingTables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `
  const tableNames = new Set(existingTables.map(t => t.table_name))

  // Get all existing columns per table
  const existingColumns = await sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
  `
  const columnMap = new Map<string, Set<string>>()
  for (const col of existingColumns) {
    if (!columnMap.has(col.table_name)) {
      columnMap.set(col.table_name, new Set())
    }
    columnMap.get(col.table_name)!.add(col.column_name)
  }

  // Ensure enums exist
  for (const enumDef of REQUIRED_ENUMS) {
    try {
      const result = await sql`SELECT 1 FROM pg_type WHERE typname = ${enumDef.name}`
      if (result.length === 0) {
        const values = enumDef.values.map(v => `'${v}'`).join(', ')
        await sql.query(`CREATE TYPE "${enumDef.name}" AS ENUM (${values})`)
        console.log(`  + Created enum: ${enumDef.name}`)
      }
    } catch (e: any) {
      console.error(`  ! Enum ${enumDef.name}: ${e.message?.slice(0, 80)}`)
    }
  }

  let tablesCreated = 0
  let columnsAdded = 0
  let errors = 0

  for (const table of SCHEMA) {
    if (!tableNames.has(table.name)) {
      // Create table
      try {
        const colDefs = table.columns.map(col => {
          let def = `"${col.name}" ${col.type}`
          if (col.default_val) def += ` DEFAULT ${col.default_val}`
          if (col.nullable === false) def += ' NOT NULL'
          return def
        }).join(', ')

        // Find primary key (first 'id' column or composite)
        const idCol = table.columns.find(c => c.name === 'id')
        const pkClause = idCol ? `, PRIMARY KEY ("id")` : ''

        await sql.query(`CREATE TABLE IF NOT EXISTS "${table.name}" (${colDefs}${pkClause})`)
        console.log(`  + Created table: ${table.name} (${table.columns.length} columns)`)
        tablesCreated++
      } catch (e: any) {
        console.error(`  ! Table ${table.name}: ${e.message?.slice(0, 100)}`)
        errors++
      }
    } else {
      // Table exists - check for missing columns
      const existingCols = columnMap.get(table.name) || new Set()

      for (const col of table.columns) {
        if (!existingCols.has(col.name)) {
          try {
            let alterSql = `ALTER TABLE "${table.name}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`
            if (col.default_val) alterSql += ` DEFAULT ${col.default_val}`
            // Don't add NOT NULL for new columns on existing tables (would fail if rows exist)
            await sql.query(alterSql)
            console.log(`  + Added column: ${table.name}.${col.name}`)
            columnsAdded++
          } catch (e: any) {
            console.error(`  ! Column ${table.name}.${col.name}: ${e.message?.slice(0, 80)}`)
            errors++
          }
        }
      }
    }
  }

  console.log('')
  console.log(`  Summary: ${tablesCreated} tables created, ${columnsAdded} columns added, ${errors} errors`)

  if (errors > 0) {
    console.log('  Some errors occurred but the schema is mostly up to date')
  }
}

main().catch((e) => {
  console.error('  HTTP schema sync failed:', e.message)
  process.exit(1)
})
