import { pgTable, text, timestamp, uuid, boolean, primaryKey, integer, jsonb, varchar, json, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Notification Category Enum - Classifies notifications by type and behavior
 * - info: Passive modifications (profile updates, login events) - Display overlay only
 * - action: Active notifications requiring response (orders, support requests) - Opens chat
 * - urgent: Priority notifications (appointments) - Auto-assign + immediate attention
 */
export const notificationCategoryEnum = pgEnum('notification_category', [
  'info',    // Ex: profile.updated, user.logged_in (overlay only, no chat)
  'action',  // Ex: order.physical, support.request (chat + action required)
  'urgent',  // Ex: order.appointment (priority badge + auto-assignment)
])

// =============================================================================
// USERS - Unified User System (Customers and Admins)
// =============================================================================

/**
 * Companies - Customer organizations using the SaaS platform
 */
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  city: text("city"),
  address: text("address"),
  zipCode: text("zip_code"),
  siret: text("siret"),
  vatNumber: text("vat_number"),
  phone: text("phone"),
  stripeCustomerId: text("stripe_customer_id").unique(), // Stripe Customer ID
  stripeSetupIntentClientSecret: text("stripe_setup_intent_client_secret"), // Temporary secret for adding cards
  stripeDefaultPaymentMethod: text("stripe_default_payment_method"), // Default card payment method ID
  isActive: boolean("is_active").default(true).notNull(), // Can be deactivated (revoked)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Subscriptions - Stripe subscriptions linked to companies
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  customerId: uuid("customer_id").references(() => companies.id).notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  status: text("status").notNull(), // 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Payment Methods - Store payment methods (cards) associated with companies
 * Cards are linked to companies (not individual users) for centralized billing
 * Synced regularly from Stripe API to maintain up-to-date card information
 */
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Stripe identifiers
  stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),

  // Card details (non-sensitive - PCI compliant)
  type: text("type").notNull().default("card"), // 'card', 'sepa_debit', etc.
  cardBrand: text("card_brand"), // 'visa', 'mastercard', 'amex', etc.
  cardLast4: text("card_last4"), // Last 4 digits
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardCountry: text("card_country"),
  cardFingerprint: text("card_fingerprint"), // Stripe fingerprint for duplicate detection

  // Status
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // Metadata
  holderName: text("holder_name"), // Cardholder name
  billingAddress: jsonb("billing_address"), // Billing address details
  metadata: jsonb("metadata"), // Additional Stripe metadata

  // Tracking
  addedBy: uuid("added_by").references(() => users.id), // User who added this card

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"), // Last sync with Stripe
  expiresAt: timestamp("expires_at"), // Computed from exp_month/exp_year for easy querying
})

/**
 * Stripe Sync Logs - Track synchronization operations with Stripe API
 * Used for monitoring, debugging, and ensuring data consistency
 */
export const stripeSyncLogs = pgTable("stripe_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  syncType: text("sync_type").notNull(), // 'full', 'cards', 'customer', 'webhook'
  status: text("status").notNull(), // 'success', 'failed', 'partial'
  cardsAdded: integer("cards_added").default(0),
  cardsUpdated: integer("cards_updated").default(0),
  cardsRemoved: integer("cards_removed").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional sync details
  duration: integer("duration"), // Sync duration in milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * Users - Unified user system for both customers and platform administrators
 * - Company users (customers): Have a companyId and company-level roles (reader, writer)
 * - Platform administrators: No companyId, have platform-level roles (admin, super_admin)
 * - A user can transition from customer to admin by receiving admin roles
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed with bcrypt
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  position: text("position"),
  profileImage: text("profile_image"), // Path to profile image in public/profiles
  companyId: uuid("company_id").references(() => companies.id), // Nullable - platform admins don't belong to a company
  emailVerified: timestamp("email_verified", { mode: "date" }),
  isActive: boolean("is_active").default(true).notNull(), // Can be deactivated
  isSiteManager: boolean("is_site_manager").default(false).notNull(), // Designated site manager for legal purposes
  isDpo: boolean("is_dpo").default(false).notNull(), // Data Protection Officer (Responsable RGPD)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Verification Tokens - For email verification and password reset
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

/**
 * OAuth Connections - Store OAuth provider connections for social authentication
 * Supports GitHub and Google OAuth
 * - Encrypted access/refresh tokens using AES-256-GCM
 * - Users can connect multiple providers
 * - Used for social login (GitHub, Google)
 */
export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // 'github' | 'google'
  providerUserId: text("provider_user_id").notNull(), // GitHub user ID or Google sub
  email: text("email").notNull(), // Email from OAuth provider
  accessToken: text("access_token"), // Encrypted OAuth access token
  refreshToken: text("refresh_token"), // Encrypted OAuth refresh token (if available)
  expiresAt: timestamp("expires_at"), // Token expiration timestamp
  scope: text("scope"), // OAuth scopes granted
  metadata: jsonb("metadata"), // Additional provider-specific data (avatar, name, etc.)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// =============================================================================
// ROLES & PERMISSIONS SYSTEM
// =============================================================================

/**
 * Roles - Hierarchical role system for both company and platform levels
 *
 * COMPANY SCOPE (users within a company):
 * - reader: Read-only access to company data
 * - writer: Read and write access to company data
 *
 * PLATFORM SCOPE (platform administrators):
 * - admin: Can manage platform features, companies, and users
 * - super_admin: Full platform access, can manage other admins
 */
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // 'reader', 'writer', 'admin', 'super_admin'
  scope: text("scope").notNull(), // 'company' or 'platform'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * Permissions - Granular permissions assigned to roles
 *
 * COMPANY PERMISSIONS (for reader, writer roles):
 * - read: View company data
 * - write: Create/update company data
 * - invite: Invite new users to company
 * - manage_users: Manage users within company (activate/deactivate, change roles)
 *
 * PLATFORM PERMISSIONS (for admin, super_admin roles):
 * - manage_platform: Manage platform settings and features
 * - manage_companies: View and manage all companies
 * - manage_all_users: Manage any user on the platform
 * - manage_admins: Create and manage other administrators (super_admin only)
 * - manage_emails: Configure email providers and templates
 * - view_analytics: Access platform-wide analytics and statistics
 */
export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  scope: text("scope").notNull(), // 'company' or 'platform'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * User Roles - Many-to-many relationship between users and roles
 * A user can have multiple roles across both company and platform scopes:
 * - Company-scoped roles (reader, writer): User manages data within their company
 * - Platform-scoped roles (admin, super_admin): User manages the entire platform
 * - A user can be both a company member AND a platform admin simultaneously
 */
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
)

/**
 * Role Permissions - Many-to-many relationship between roles and permissions
 * Defines what permissions each role has
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
)

// =============================================================================
// USER INVITATIONS
// =============================================================================

/**
 * User Invitations - Track pending invitations
 * Invitations are sent and must be accepted before user is created
 */
export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  roleId: uuid("role_id")
    .references(() => roles.id)
    .notNull(),
  invitedBy: uuid("invited_by").references(() => users.id), // Who sent the invitation
  token: text("token").notNull().unique(), // Unique token for accepting invitation
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  expiresAt: timestamp("expires_at").notNull(), // Invitations expire after 7 days
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  paymentMethods: many(paymentMethods),
  stripeSyncLogs: many(stripeSyncLogs),
  subscriptions: many(subscriptions),
}))

// Note: usersRelations is defined after orders table to include orders relationship

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  company: one(companies, {
    fields: [userInvitations.companyId],
    references: [companies.id],
  }),
  role: one(roles, {
    fields: [userInvitations.roleId],
    references: [roles.id],
  }),
  invitedByUser: one(users, {
    fields: [userInvitations.invitedBy],
    references: [users.id],
  }),
}))

export const oauthConnectionsRelations = relations(oauthConnections, ({ one }) => ({
  user: one(users, {
    fields: [oauthConnections.userId],
    references: [users.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  company: one(companies, {
    fields: [paymentMethods.companyId],
    references: [companies.id],
  }),
  addedByUser: one(users, {
    fields: [paymentMethods.addedBy],
    references: [users.id],
  }),
}))

export const stripeSyncLogsRelations = relations(stripeSyncLogs, ({ one }) => ({
  company: one(companies, {
    fields: [stripeSyncLogs.companyId],
    references: [companies.id],
  }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  company: one(companies, {
    fields: [subscriptions.customerId],
    references: [companies.id],
  }),
}))

// =============================================================================
// EMAIL SYSTEM - Multi-Provider Transactional Emails
// =============================================================================

/**
 * Email Provider Configs - Store encrypted credentials for email providers
 * Supports AWS SES, Resend, and Scaleway TEM
 */
export const emailProviderConfigs = pgTable("email_provider_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull().unique(), // 'aws-ses', 'resend', 'scaleway-tem'
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  config: jsonb("config").notNull(), // Encrypted provider-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Email Templates - Store email templates for different types
 */
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull().unique(), // 'register', 'invite', 'delete', 'order', etc.
  name: text("name").notNull(),
  description: text("description"),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content"),
  textContent: text("text_content"),
  isActive: boolean("is_active").default(true).notNull(),
  provider: text("provider"), // Override default provider for this template
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Email History - Track all sent emails
 */
export const emailHistory = pgTable("email_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(), // Which provider was used
  templateType: text("template_type"), // Template type if template was used
  messageId: text("message_id"), // Provider-specific message ID
  from: text("from").notNull(),
  to: jsonb("to").notNull(), // Array of recipient emails
  cc: jsonb("cc"), // Array of CC emails
  bcc: jsonb("bcc"), // Array of BCC emails
  subject: text("subject").notNull(),
  htmlContent: text("html_content"),
  textContent: text("text_content"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  errorMessage: text("error_message"),
  tags: jsonb("tags"), // Array of tags
  metadata: jsonb("metadata"), // Additional metadata (variables used, etc.)
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Email Events - Track email events from webhooks (opens, clicks, bounces, etc.)
 */
export const emailEvents = pgTable("email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  emailHistoryId: uuid("email_history_id").references(() => emailHistory.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  messageId: text("message_id"),
  eventType: text("event_type").notNull(), // 'opened', 'clicked', 'bounced', 'complained', 'delivered'
  eventData: jsonb("event_data"), // Raw webhook data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * Email Statistics - Aggregated statistics by day
 */
export const emailStatistics = pgTable("email_statistics", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: timestamp("date").notNull(),
  provider: text("provider").notNull(),
  totalSent: integer("total_sent").default(0).notNull(),
  totalDelivered: integer("total_delivered").default(0).notNull(),
  totalFailed: integer("total_failed").default(0).notNull(),
  totalBounced: integer("total_bounced").default(0).notNull(),
  totalOpened: integer("total_opened").default(0).notNull(),
  totalClicked: integer("total_clicked").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Email Relations
export const emailTemplatesRelations = relations(emailTemplates, () => ({}))

export const emailHistoryRelations = relations(emailHistory, ({ many, one }) => ({
  events: many(emailEvents),
  template: one(emailTemplates, {
    fields: [emailHistory.templateType],
    references: [emailTemplates.type],
  }),
}))

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  emailHistory: one(emailHistory, {
    fields: [emailEvents.emailHistoryId],
    references: [emailHistory.id],
  }),
}))

// =============================================================================
// SERVICE API CONFIGURATIONS - Third-Party Service Integration
// =============================================================================

/**
 * Service API Configs - Centralized storage for third-party service API credentials
 * Supports: Stripe, PayPal, Scaleway (Object Storage, Functions, etc.), Resend, AWS (S3, SES, etc.)
 * All credentials are encrypted using AES-256-GCM before storage
 */
export const serviceApiConfigs = pgTable("service_api_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceName: text("service_name").notNull(), // 'stripe', 'paypal', 'scaleway', 'resend', 'aws'
  serviceType: text("service_type").notNull(), // 'payment', 'email', 'storage', 'compute', etc.
  environment: text("environment").notNull().default("production"), // 'production', 'test', 'sandbox'
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(), // Default config for this service type
  config: jsonb("config").notNull(), // Encrypted service-specific configuration
  metadata: jsonb("metadata"), // Additional service metadata (region, account info, etc.)
  lastTestedAt: timestamp("last_tested_at"), // Last successful connection test
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Service API Usage - Track API calls to third-party services
 */
export const serviceApiUsage = pgTable("service_api_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  configId: uuid("config_id")
    .notNull()
    .references(() => serviceApiConfigs.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  operation: varchar("operation", { length: 255 }).notNull(), // 'create_payment', 'send_email', 'upload_file', etc.
  status: text("status").notNull(), // 'success', 'failed', 'timeout'
  statusCode: varchar("status_code", { length: 10 }), // HTTP status or service-specific code
  requestData: jsonb("request_data"), // Sanitized request data (no sensitive info)
  responseData: jsonb("response_data"), // Sanitized response data
  errorMessage: text("error_message"),
  responseTime: integer("response_time"), // Response time in milliseconds
  costEstimate: integer("cost_estimate"), // Estimated cost in cents (if applicable)
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Service API Relations
export const serviceApiConfigsRelations = relations(serviceApiConfigs, ({ many }) => ({
  usage: many(serviceApiUsage),
}))

export const serviceApiUsageRelations = relations(serviceApiUsage, ({ one }) => ({
  config: one(serviceApiConfigs, {
    fields: [serviceApiUsage.configId],
    references: [serviceApiConfigs.id],
  }),
}))

// =============================================================================
// USER API KEYS - Application API Access Management
// =============================================================================

/**
 * User API Keys - API keys for users to access the application's API
 * These are different from provider API keys (AWS, Scaleway, etc.)
 * Format: sk_live_... or sk_test_...
 */
export const userApiKeys = pgTable("user_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(), // SHA-256 hash
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(), // Display prefix (e.g., "sk_live_abc")
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * User API Key Usage - Track API key usage for analytics and security
 */
export const userApiKeyUsage = pgTable("user_api_key_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  apiKeyId: uuid("api_key_id")
    .notNull()
    .references(() => userApiKeys.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: varchar("status_code", { length: 3 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  responseTime: varchar("response_time", { length: 50 }), // in ms
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// User API Keys Relations
export const userApiKeysRelations = relations(userApiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.id],
  }),
  usage: many(userApiKeyUsage),
}))

export const userApiKeyUsageRelations = relations(userApiKeyUsage, ({ one }) => ({
  apiKey: one(userApiKeys, {
    fields: [userApiKeyUsage.apiKeyId],
    references: [userApiKeys.id],
  }),
}))

// =============================================================================
// ORDERS & PURCHASES - E-commerce System
// =============================================================================

/**
 * Orders - Customer orders for modules, plans, and services
 * Linked to users table (not companies) for individual purchases
 */
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // e.g., "ORD-2024-001234"
  status: text("status").notNull().default("pending"), // pending, processing, shipped, completed, cancelled, refunded
  totalAmount: integer("total_amount").notNull(), // Amount in cents (e.g., 29900 for $299.00)
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  paymentMethod: varchar("payment_method", { length: 50 }), // stripe, paypal, bank_transfer, etc.
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  paymentIntentId: varchar("payment_intent_id", { length: 255 }), // Stripe/PayPal transaction ID
  paidAt: timestamp("paid_at"),
  notes: text("notes"), // Customer notes or admin notes

  // Shipping Fields (for physical products)
  requiresShipping: boolean("requires_shipping").default(false), // true if order contains physical products
  shippingAddress: jsonb("shipping_address"), // { name, street, city, postalCode, country, phone }
  shippingStatus: text("shipping_status"), // pending, processing, shipped, delivered
  shippingTrackingNumber: text("shipping_tracking_number"),
  shippingCarrier: text("shipping_carrier"), // colissimo, chronopost, ups, dhl, etc.
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  shippingReminderSent: boolean("shipping_reminder_sent").default(false), // Admin reminder sent

  // Stripe Invoice PDF links (populated by invoice.paid webhook)
  stripeInvoiceId: text("stripe_invoice_id"), // Stripe Invoice ID (in_xxx)
  invoicePdf: text("invoice_pdf"), // Direct PDF download URL from Stripe
  hostedInvoiceUrl: text("hosted_invoice_url"), // Hosted invoice page URL
  taxAmount: integer("tax_amount"), // Tax/VAT amount in cents from Stripe invoice

  metadata: jsonb("metadata"), // Additional data (delivery details, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Order Items - Individual items within an order
 * Supports modules, plans, consulting hours, or custom products
 */
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 50 }).notNull(), // 'module', 'plan', 'consulting', 'custom'
  itemId: varchar("item_id", { length: 100 }), // Reference to module/plan ID (if applicable)
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  itemName: varchar("item_name", { length: 255 }).notNull(), // Display name
  itemDescription: text("item_description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // Price per unit in cents
  totalPrice: integer("total_price").notNull(), // quantity * unitPrice in cents
  deliveryTime: varchar("delivery_time", { length: 100 }), // e.g., "48 hours", "2-hour session"
  deliveryStatus: text("delivery_status").default("pending"), // pending, in_progress, delivered, cancelled
  deliveredAt: timestamp("delivered_at"),
  metadata: jsonb("metadata"), // Additional item-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Orders Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [orders.companyId],
    references: [companies.id],
  }),
  items: many(orderItems),
  shipments: many(shipments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}))

/**
 * Shipments - Tracking for physical product deliveries
 * Links to orderItems to track individual product shipments
 */
export const shipments = pgTable("shipments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'failed'
  trackingNumber: text("tracking_number"), // Numéro de suivi (Colissimo, Chronopost, etc.)
  carrier: text("carrier"), // 'colissimo' | 'chronopost' | 'ups' | 'dhl' | 'fedex' | 'other'
  trackingUrl: text("tracking_url"), // URL de suivi fournie par le transporteur
  shippingAddress: jsonb("shipping_address").notNull(), // { name, street, city, postalCode, country, phone }
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"), // Notes admin ou instructions spéciales
  emailsSent: jsonb("emails_sent").default("[]"), // Array des emails envoyés [{type: 'shipped', sentAt: '...'}]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  orderItem: one(orderItems, {
    fields: [shipments.orderItemId],
    references: [orderItems.id],
  }),
  product: one(products, {
    fields: [shipments.productId],
    references: [products.id],
  }),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  userRoles: many(userRoles),
  orders: many(orders), // User's purchase history
  tosAcceptances: many(userTosAcceptance),
  // Appointment inverse relations (required: appointmentsRelations has 2 FK → users with relationName)
  appointments: many(appointments, { relationName: "appointmentUser" }),
  assignedAppointments: many(appointments, { relationName: "appointmentAssignedAdmin" }),
  // Chat inverse relations (required: chatConversationsRelations has 3 FK → users with relationName)
  chatConversations: many(chatConversations, { relationName: "conversationUser" }),
  assignedChatConversations: many(chatConversations, { relationName: "assignedAdmin" }),
  closedChatConversations: many(chatConversations, { relationName: "closedBy" }),
}))

// =============================================================================
// SYSTEM LOGS - Generic System-wide Logging
// =============================================================================

/**
 * System Logs - Generic system-wide logging for all events
 * Categories: 'auth', 'email', 'payment', 'system', 'user', 'admin', etc.
 * Levels: 'info', 'warning', 'error', 'critical'
 */
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Additional context (JSON)
  userId: uuid("user_id").references(() => users.id), // Optional: who triggered the event
  resourceId: text("resource_id"), // Optional: ID of the related resource (e.g., order ID, email ID)
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemLogs.userId],
    references: [users.id],
  }),
}))

// =============================================================================
// PAGE PERMISSIONS - Dynamic Page Access Control
// =============================================================================

/**
 * Page Permissions - Dynamic page access control
 */
export const pagePermissions = pgTable("page_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: text("path").notNull().unique(), // e.g., "/dashboard", "/admin"
  name: text("name").notNull(), // Display name
  access: text("access").notNull().default("public"), // 'public', 'user', 'admin', 'super_admin'
  group: text("group").notNull(), // Grouping for UI
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// =============================================================================
// PLATFORM CONFIGURATION
// =============================================================================

/**
 * Platform Configuration - Key-value store for system settings
 */
export const platformConfig = pgTable("platform_config", {
  key: text("key").primaryKey(), // e.g., 'site_name', 'logo', 'auth_enabled'
  value: text("value"), // Stored value (can be JSON)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// =============================================================================
// LEGAL & COMPLIANCE (DSA/GDPR)
// =============================================================================

/**
 * Terms of Service Versions
 */
export const termsOfService = pgTable("terms_of_service", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: text("version").notNull(), // e.g. "1.0", "2023-10-27"
  content: text("content").notNull(), // HTML or Markdown content
  isActive: boolean("is_active").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
})

/**
 * User ToS Acceptance Records
 */
export const userTosAcceptance = pgTable("user_tos_acceptance", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tosId: uuid("tos_id").references(() => termsOfService.id).notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
})

export const termsOfServiceRelations = relations(termsOfService, ({ one, many }) => ({
  creator: one(users, {
    fields: [termsOfService.createdBy],
    references: [users.id],
  }),
  acceptances: many(userTosAcceptance),
}))

export const userTosAcceptanceRelations = relations(userTosAcceptance, ({ one }) => ({
  user: one(users, {
    fields: [userTosAcceptance.userId],
    references: [users.id],
  }),
  tos: one(termsOfService, {
    fields: [userTosAcceptance.tosId],
    references: [termsOfService.id],
  }),
}))

/**
 * Cookie Consents (GDPR)
 */
export const cookieConsents = pgTable("cookie_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  consentStatus: text("consent_status").notNull(), // 'accepted' | 'declined'
  consentedAt: timestamp("consented_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// =============================================================================
// E-COMMERCE & BOOKING MODULE
// =============================================================================

/**
 * VAT Rates - Customizable tax rates by country/region
 */
export const vatRates = pgTable("vat_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g., "France Standard", "UK Reduced"
  country: text("country").notNull(), // ISO country code or "ALL"
  rate: integer("rate").notNull(), // Rate in basis points (20% = 2000)
  description: text("description"), // Optional description
  isDefault: boolean("is_default").default(false).notNull(), // Default rate for the country
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  features: json("features"), // Array of strings for checkmarks
  price: integer("price").notNull().default(0), // in cents
  hourlyRate: integer("hourly_rate"), // For consulting: hourly rate in cents (display only for hourly mode)

  // Product Type System - NEW in v4.0
  // 'physical' = produit physique (envoi postal avec tracking)
  // 'digital' = produit numérique (code/URL de téléchargement instantané)
  // 'appointment' = rendez-vous/consultation (peut être gratuit ou payant avec tarif horaire)
  type: text("type").notNull().default("physical"), // 'physical' | 'digital' | 'appointment'

  // Free Option - Any product type can be free
  isFree: boolean("is_free").default(false).notNull(), // true = no payment required

  // Digital Product Fields
  digitalDeliveryType: text("digital_delivery_type").default("license"), // 'url' | 'license' | 'both' - how to deliver digital product
  fileUrl: text("file_url"), // Download URL for digital products
  deliveryCode: text("delivery_code"), // Generated code for digital delivery (e.g., activation key)
  downloadUrl: text("download_url"), // Direct download link (generated after purchase)
  licenseKey: text("license_key"), // License key template (optional, e.g., "PROD-XXXX-XXXX")
  licenseInstructions: text("license_instructions"), // Instructions for license activation

  // Physical Product Fields
  requiresShipping: boolean("requires_shipping").default(false), // true for physical products
  weight: integer("weight"), // Weight in grams
  dimensions: jsonb("dimensions"), // { length, width, height } in cm
  stockQuantity: integer("stock_quantity"), // Inventory tracking
  shippingNotes: text("shipping_notes"), // Special shipping instructions

  // Appointment Product Fields
  appointmentMode: text("appointment_mode"), // 'packaged' | 'hourly' - packaged = paid upfront, hourly = post-billing
  appointmentDuration: integer("appointment_duration"), // Duration in minutes (default: 60)

  // Payment Type System - v5.0
  // 'one_time' = paiement ponctuel unique
  // 'hourly' = paiement à l'heure (affichage seulement, facturation ultérieure)
  // 'subscription' = abonnement récurrent (hebdomadaire, mensuel, annuel)
  paymentType: text("payment_type").default("one_time"), // 'one_time' | 'hourly' | 'subscription'

  // Subscription Pricing Fields (only when paymentType = 'subscription')
  subscriptionPriceWeekly: integer("subscription_price_weekly"), // Weekly price in cents
  subscriptionPriceMonthly: integer("subscription_price_monthly"), // Monthly price in cents
  subscriptionPriceYearly: integer("subscription_price_yearly"), // Yearly price in cents

  // Stripe Sync Fields - v6.0
  stripeProductId: text("stripe_product_id"), // Stripe Product ID (prod_xxx) for this product
  stripePriceOneTime: text("stripe_price_one_time"), // Stripe Price ID for one-time payment (price_xxx)
  stripePriceWeekly: text("stripe_price_weekly"), // Stripe Price ID for weekly subscription
  stripePriceMonthly: text("stripe_price_monthly"), // Stripe Price ID for monthly subscription
  stripePriceYearly: text("stripe_price_yearly"), // Stripe Price ID for yearly subscription

  // Common Fields
  icon: text("icon"), // Lucide icon name
  imageUrl: text("image_url"), // Custom product image URL
  vatRateId: uuid("vat_rate_id").references(() => vatRates.id), // Reference to VAT rate
  currency: text("currency").default("EUR").notNull(),
  outlookEventTypeId: text("outlook_event_type_id"), // For appointment booking
  isPublished: boolean("is_published").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(), // "Most Popular" badge
  upsellProductId: uuid("upsell_product_id"), // Self-reference for upsell
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const vatRatesRelations = relations(vatRates, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  cartItems: many(cartItems),
  shipments: many(shipments),
  vatRate: one(vatRates, {
    fields: [products.vatRateId],
    references: [vatRates.id],
  }),
  upsellProduct: one(products, {
    fields: [products.upsellProductId],
    references: [products.id],
    relationName: "upsell"
  })
}))

// =============================================================================
// DISCOUNT COUPONS - Système de tickets de réduction
// =============================================================================

/**
 * Coupons - Codes de réduction pour les produits
 */
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // Code unique (ex: PROMO2024)
  description: text("description"), // Description du coupon
  discountType: text("discount_type").notNull(), // 'percentage' | 'fixed_amount'
  discountValue: integer("discount_value").notNull(), // Pourcentage (ex: 20 pour 20%) ou montant en centimes
  currency: text("currency").default("EUR"), // Devise pour les réductions fixes
  minPurchaseAmount: integer("min_purchase_amount"), // Montant minimum d'achat en centimes
  maxDiscountAmount: integer("max_discount_amount"), // Montant maximum de réduction en centimes
  usageLimit: integer("usage_limit"), // Nombre total d'utilisations autorisées (null = illimité)
  usageCount: integer("usage_count").default(0).notNull(), // Nombre d'utilisations actuelles
  perUserLimit: integer("per_user_limit"), // Limite par utilisateur (null = illimité)
  startDate: timestamp("start_date"), // Date de début de validité
  endDate: timestamp("end_date"), // Date de fin de validité
  applicableProducts: json("applicable_products"), // Array d'IDs de produits (null = tous les produits)
  excludedProducts: json("excluded_products"), // Array d'IDs de produits exclus
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Coupon Usage - Historique d'utilisation des coupons
 */
export const couponUsage = pgTable("coupon_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  discountAmount: integer("discount_amount").notNull(), // Montant de la réduction appliquée en centimes
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relations pour les coupons
export const couponsRelations = relations(coupons, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [coupons.createdBy],
    references: [users.id],
  }),
  usages: many(couponUsage),
}))

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsage.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponUsage.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [couponUsage.orderId],
    references: [orders.id],
  }),
}))

// =============================================================================
// CARTS & ORDERS
// =============================================================================

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guest carts
  status: text("status").notNull().default("active"), // active, abandoned, converted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const outlookIntegrations = pgTable("outlook_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Product Leads - Track appointment/consultation product interactions
 * Used for 'appointment' type products where no payment is required
 * but we want to track user interest and conversion
 */
export const productLeads = pgTable("product_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for anonymous
  userEmail: text("user_email").notNull(), // Always capture email
  userName: text("user_name"), // Optional user name
  userPhone: text("user_phone"), // Optional phone number
  status: text("status").notNull().default("new"), // 'new', 'contacted', 'qualified', 'converted', 'lost'
  source: text("source").default("website"), // 'website', 'email', 'direct'
  notes: text("notes"), // Admin notes about the lead
  scheduledAt: timestamp("scheduled_at"), // If appointment was scheduled
  convertedAt: timestamp("converted_at"), // If lead was converted to customer
  metadata: jsonb("metadata"), // Additional data (form responses, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Relations
// productsRelations is defined above with upsellProduct

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}))

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}))

export const outlookIntegrationsRelations = relations(outlookIntegrations, ({ one }) => ({
  user: one(users, {
    fields: [outlookIntegrations.userId],
    references: [users.id],
  }),
}))

export const productLeadsRelations = relations(productLeads, ({ one }) => ({
  product: one(products, {
    fields: [productLeads.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productLeads.userId],
    references: [users.id],
  }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

export type Coupon = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert

export type CouponUsage = typeof couponUsage.$inferSelect
export type NewCouponUsage = typeof couponUsage.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type UserInvitation = typeof userInvitations.$inferSelect
export type NewUserInvitation = typeof userInvitations.$inferInsert

export type EmailProviderConfig = typeof emailProviderConfigs.$inferSelect
export type NewEmailProviderConfig = typeof emailProviderConfigs.$inferInsert

export type EmailTemplate = typeof emailTemplates.$inferSelect
export type NewEmailTemplate = typeof emailTemplates.$inferInsert

export type EmailHistory = typeof emailHistory.$inferSelect
export type NewEmailHistory = typeof emailHistory.$inferInsert

export type EmailEvent = typeof emailEvents.$inferSelect
export type NewEmailEvent = typeof emailEvents.$inferInsert

export type EmailStatistic = typeof emailStatistics.$inferSelect
export type NewEmailStatistic = typeof emailStatistics.$inferInsert

export type ServiceApiConfig = typeof serviceApiConfigs.$inferSelect
export type NewServiceApiConfig = typeof serviceApiConfigs.$inferInsert

export type ServiceApiUsage = typeof serviceApiUsage.$inferSelect
export type NewServiceApiUsage = typeof serviceApiUsage.$inferInsert

export type UserApiKey = typeof userApiKeys.$inferSelect
export type NewUserApiKey = typeof userApiKeys.$inferInsert

export type UserApiKeyUsage = typeof userApiKeyUsage.$inferSelect
export type NewUserApiKeyUsage = typeof userApiKeyUsage.$inferInsert

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert

export type SystemLog = typeof systemLogs.$inferSelect
export type NewSystemLog = typeof systemLogs.$inferInsert

export type PagePermission = typeof pagePermissions.$inferSelect
export type NewPagePermission = typeof pagePermissions.$inferInsert

export type PlatformConfig = typeof platformConfig.$inferSelect
export type NewPlatformConfig = typeof platformConfig.$inferInsert

export type TermsOfService = typeof termsOfService.$inferSelect
export type NewTermsOfService = typeof termsOfService.$inferInsert

export type UserTosAcceptance = typeof userTosAcceptance.$inferSelect
export type NewUserTosAcceptance = typeof userTosAcceptance.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type ProductLead = typeof productLeads.$inferSelect
export type NewProductLead = typeof productLeads.$inferInsert

export type Cart = typeof carts.$inferSelect
export type NewCart = typeof carts.$inferInsert

export type CartItem = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert

export type OutlookIntegration = typeof outlookIntegrations.$inferSelect
export type NewOutlookIntegration = typeof outlookIntegrations.$inferInsert

export type VatRate = typeof vatRates.$inferSelect
export type NewVatRate = typeof vatRates.$inferInsert

// =============================================================================
// CALENDAR & APPOINTMENTS MODULE
// =============================================================================

/**
 * Calendar Connections - OAuth tokens for Google Calendar and Microsoft Outlook
 * Supports multiple calendar providers per user
 */
export const calendarConnections = pgTable("calendar_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(), // 'google' | 'microsoft'
  email: text("email"), // Calendar account email
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  expiresAt: timestamp("expires_at"),
  calendarId: text("calendar_id"), // Primary calendar ID
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Appointments - Manage paid and free appointments
 * Integrates with Lago for payments and external calendars for sync
 */
export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "set null" }), // Optional link to appointment product
  assignedAdminId: uuid("assigned_admin_id")
    .references(() => users.id, { onDelete: "set null" }), // Admin assigned to handle this appointment
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"), // Physical or virtual meeting location
  meetingUrl: text("meeting_url"), // Virtual meeting link (Zoom, Teams, etc.)
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timezone: text("timezone").default("Europe/Paris").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  type: text("type").notNull().default("free"), // 'free' | 'paid'
  price: integer("price").default(0).notNull(), // Price in cents
  currency: text("currency").default("EUR").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe PaymentIntent ID for paid appointments
  paymentStatus: text("payment_status").default("pending"), // 'pending' | 'paid' | 'failed' | 'refunded'
  paidAt: timestamp("paid_at"),
  googleEventId: text("google_event_id"), // Google Calendar event ID
  microsoftEventId: text("microsoft_event_id"), // Microsoft Outlook event ID
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  reminderAt: timestamp("reminder_at"), // When to send reminder
  attendeeEmail: text("attendee_email"), // External attendee email
  attendeeName: text("attendee_name"), // External attendee name
  attendeePhone: text("attendee_phone"), // External attendee phone
  notes: text("notes"), // Internal notes
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  metadata: jsonb("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Appointment Slots - Define available time slots for booking
 * Allows users to set their availability for appointments
 */
export const appointmentSlots = pgTable("appointment_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" }), // Optional: specific to a product
  dayOfWeek: integer("day_of_week").notNull(), // 0 (Sunday) to 6 (Saturday)
  startTime: text("start_time").notNull(), // "09:00" format
  endTime: text("end_time").notNull(), // "17:00" format
  duration: integer("duration").notNull().default(60), // Duration in minutes
  bufferBefore: integer("buffer_before").default(0), // Buffer time before appointment (minutes)
  bufferAfter: integer("buffer_after").default(0), // Buffer time after appointment (minutes)
  maxAppointments: integer("max_appointments").default(1), // Max concurrent appointments
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Appointment Exceptions - Override availability for specific dates
 * Used for vacations, holidays, or special availability
 */
export const appointmentExceptions = pgTable("appointment_exceptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  date: timestamp("date").notNull(), // Specific date
  isAvailable: boolean("is_available").default(false).notNull(), // false = blocked, true = extra availability
  startTime: text("start_time"), // Override start time (if available)
  endTime: text("end_time"), // Override end time (if available)
  reason: text("reason"), // e.g., "Vacation", "Holiday"
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Calendar Connections Relations
export const calendarConnectionsRelations = relations(calendarConnections, ({ one }) => ({
  user: one(users, {
    fields: [calendarConnections.userId],
    references: [users.id],
  }),
}))

// Appointments Relations
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, {
    fields: [appointments.userId],
    references: [users.id],
    relationName: "appointmentUser",
  }),
  product: one(products, {
    fields: [appointments.productId],
    references: [products.id],
  }),
  assignedAdmin: one(users, {
    fields: [appointments.assignedAdminId],
    references: [users.id],
    relationName: "appointmentAssignedAdmin",
  }),
}))

// Appointment Slots Relations
export const appointmentSlotsRelations = relations(appointmentSlots, ({ one }) => ({
  user: one(users, {
    fields: [appointmentSlots.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [appointmentSlots.productId],
    references: [products.id],
  }),
}))

// Appointment Exceptions Relations
export const appointmentExceptionsRelations = relations(appointmentExceptions, ({ one }) => ({
  user: one(users, {
    fields: [appointmentExceptions.userId],
    references: [users.id],
  }),
}))

// Types
export type CalendarConnection = typeof calendarConnections.$inferSelect
export type NewCalendarConnection = typeof calendarConnections.$inferInsert

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert

export type AppointmentSlot = typeof appointmentSlots.$inferSelect
export type NewAppointmentSlot = typeof appointmentSlots.$inferInsert

export type AppointmentException = typeof appointmentExceptions.$inferSelect
export type NewAppointmentException = typeof appointmentExceptions.$inferInsert

// =============================================================================
// LIVE CHAT MODULE - Guest & User Support Chat System
// =============================================================================

/**
 * Chat Conversations - Container for chat threads
 * Supports both guests (via email) and registered users
 */
export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guests
  guestEmail: text("guest_email"), // For guest conversations
  guestName: text("guest_name"), // Guest display name
  guestSessionId: text("guest_session_id"), // Browser session ID for guest tracking
  subject: text("subject").notNull(),
  category: notificationCategoryEnum("category").default("action").notNull(), // 'info' | 'action' | 'urgent'
  status: text("status").notNull().default("open"), // 'open' | 'pending' | 'resolved' | 'closed'
  priority: text("priority").default("normal"), // 'low' | 'normal' | 'high' | 'urgent'
  assignedAdminId: uuid("assigned_admin_id").references(() => users.id, { onDelete: "set null" }), // Admin assigned to this conversation
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"), // Additional context (page URL, browser info, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Chat Messages - Individual messages within a conversation
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .references(() => chatConversations.id, { onDelete: "cascade" })
    .notNull(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guest messages
  senderType: text("sender_type").notNull(), // 'guest' | 'user' | 'admin' | 'system'
  senderName: text("sender_name"), // Display name (for guests or system)
  senderEmail: text("sender_email"), // Sender email
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text' | 'image' | 'file' | 'system'
  attachmentUrl: text("attachment_url"), // URL to attached file
  attachmentName: text("attachment_name"), // Original filename
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

/**
 * Chat Quick Responses - Predefined responses for admins
 */
export const chatQuickResponses = pgTable("chat_quick_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(), // Short title for selection
  content: text("content").notNull(), // Full response text
  category: text("category"), // Category for organization
  shortcut: text("shortcut"), // Keyboard shortcut (e.g., "/greeting")
  usageCount: integer("usage_count").default(0).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * Chat Settings - Configuration for the chat system
 */
export const chatSettings = pgTable("chat_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(), // Setting key
  value: text("value"), // Setting value (can be JSON)
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Chat Conversations Relations
export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
    relationName: "conversationUser",
  }),
  assignedAdmin: one(users, {
    fields: [chatConversations.assignedAdminId],
    references: [users.id],
    relationName: "assignedAdmin",
  }),
  closedByUser: one(users, {
    fields: [chatConversations.closedBy],
    references: [users.id],
    relationName: "closedBy",
  }),
  messages: many(chatMessages),
}))

// Chat Messages Relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}))

// Chat Quick Responses Relations
export const chatQuickResponsesRelations = relations(chatQuickResponses, ({ one }) => ({
  creator: one(users, {
    fields: [chatQuickResponses.createdBy],
    references: [users.id],
  }),
}))

// Chat Types
export type ChatConversation = typeof chatConversations.$inferSelect
export type NewChatConversation = typeof chatConversations.$inferInsert

export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert

export type ChatQuickResponse = typeof chatQuickResponses.$inferSelect
export type NewChatQuickResponse = typeof chatQuickResponses.$inferInsert

export type ChatSetting = typeof chatSettings.$inferSelect
export type NewChatSetting = typeof chatSettings.$inferInsert

// =============================================================================
// LLM API KEYS - External AI Provider Keys (Mistral, OpenAI, etc.)
// =============================================================================

/**
 * LLM API Keys - Store encrypted API keys for AI providers
 * Supports: Mistral, OpenAI, Anthropic, etc.
 * Keys are encrypted using AES-256-GCM before storage
 */
export const llmApiKeys = pgTable("llm_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(), // 'mistral' | 'openai' | 'anthropic' | 'groq'
  name: text("name").notNull(), // Display name for the key
  encryptedKey: text("encrypted_key").notNull(), // AES-256-GCM encrypted API key
  keyPrefix: text("key_prefix"), // First few chars for identification (e.g., "sk-proj-***")
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(), // Default key for this provider
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0).notNull(),
  metadata: jsonb("metadata"), // Provider-specific settings (model preferences, limits, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * LLM Usage Logs - Track AI API usage for billing and analytics
 */
export const llmUsageLogs = pgTable("llm_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyId: uuid("key_id")
    .references(() => llmApiKeys.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  model: text("model"), // e.g., 'gpt-4', 'mistral-large'
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  estimatedCost: integer("estimated_cost"), // In cents
  latencyMs: integer("latency_ms"),
  status: text("status").notNull(), // 'success' | 'error' | 'rate_limited'
  errorMessage: text("error_message"),
  conversationId: uuid("conversation_id").references(() => chatConversations.id, { onDelete: "set null" }), // Optional link to chat
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// LLM API Keys Relations
export const llmApiKeysRelations = relations(llmApiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [llmApiKeys.userId],
    references: [users.id],
  }),
  usageLogs: many(llmUsageLogs),
}))

export const llmUsageLogsRelations = relations(llmUsageLogs, ({ one }) => ({
  key: one(llmApiKeys, {
    fields: [llmUsageLogs.keyId],
    references: [llmApiKeys.id],
  }),
  user: one(users, {
    fields: [llmUsageLogs.userId],
    references: [users.id],
  }),
  conversation: one(chatConversations, {
    fields: [llmUsageLogs.conversationId],
    references: [chatConversations.id],
  }),
}))

// LLM Types
export type LlmApiKey = typeof llmApiKeys.$inferSelect
export type NewLlmApiKey = typeof llmApiKeys.$inferInsert

export type LlmUsageLog = typeof llmUsageLogs.$inferSelect
export type NewLlmUsageLog = typeof llmUsageLogs.$inferInsert

// OAuth Types
export type OAuthConnection = typeof oauthConnections.$inferSelect
export type NewOAuthConnection = typeof oauthConnections.$inferInsert

