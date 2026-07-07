-- NeoSaaS Database Schema Setup
-- Execute this SQL script in your Neon Database Console
-- https://console.neon.tech/

-- 1. Drop old schema (if exists)
DROP TABLE IF EXISTS page_permissions CASCADE;
DROP TABLE IF EXISTS platform_config CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS user_api_key_usage CASCADE;
DROP TABLE IF EXISTS user_api_keys CASCADE;
DROP TABLE IF EXISTS email_events CASCADE;
DROP TABLE IF EXISTS email_statistics CASCADE;
DROP TABLE IF EXISTS email_history CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_provider_configs CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS saas_admins CASCADE;
DROP TYPE IF EXISTS role CASCADE;

-- 2. Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    city TEXT,
    address TEXT,
    zip_code TEXT,
    siret TEXT,
    vat_number TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create unified users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    position TEXT,
    profile_image TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create roles & permissions tables
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    scope TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Create indexes
CREATE INDEX idx_companies_email ON companies(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_scope ON permissions(scope);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 6. Seed default roles
INSERT INTO roles (name, scope, description) VALUES
    ('reader', 'company', 'Read-only access to company data'),
    ('writer', 'company', 'Read and write access to company data')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, scope, description) VALUES
    ('admin', 'platform', 'Platform administrator - can manage companies and users'),
    ('super_admin', 'platform', 'Super administrator - full platform access including admin management')
ON CONFLICT (name) DO NOTHING;

-- 7. Seed default permissions
INSERT INTO permissions (name, scope, description) VALUES
    ('read', 'company', 'View company data and analytics'),
    ('write', 'company', 'Create and update company data'),
    ('invite', 'company', 'Invite new users to the company'),
    ('manage_users', 'company', 'Manage users within the company')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, scope, description) VALUES
    ('manage_platform', 'platform', 'Manage platform settings and features'),
    ('manage_companies', 'platform', 'View and manage all companies'),
    ('manage_all_users', 'platform', 'Manage any user on the platform'),
    ('manage_admins', 'platform', 'Create and manage other administrators'),
    ('manage_emails', 'platform', 'Configure email providers and templates'),
    ('view_analytics', 'platform', 'Access platform-wide analytics and statistics')
ON CONFLICT (name) DO NOTHING;

-- 8. Assign permissions to roles
-- Reader
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'reader' AND r.scope = 'company'
    AND p.name = 'read' AND p.scope = 'company'
ON CONFLICT DO NOTHING;

-- Writer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'writer' AND r.scope = 'company'
    AND p.scope = 'company'
ON CONFLICT DO NOTHING;

-- Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' AND r.scope = 'platform'
    AND p.scope = 'platform' AND p.name != 'manage_admins'
ON CONFLICT DO NOTHING;

-- Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin' AND r.scope = 'platform'
    AND p.scope = 'platform'
ON CONFLICT DO NOTHING;

-- 9. Create user invitations table
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMP
);

CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);

-- 10. Create email system tables
CREATE TABLE email_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    provider TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    template_type TEXT,
    message_id TEXT,
    "from" TEXT NOT NULL,
    "to" JSONB NOT NULL,
    cc JSONB,
    bcc JSONB,
    subject TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    tags JSONB,
    metadata JSONB,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_history_id UUID REFERENCES email_history(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    message_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE email_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP NOT NULL,
    provider TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0 NOT NULL,
    total_delivered INTEGER DEFAULT 0 NOT NULL,
    total_failed INTEGER DEFAULT 0 NOT NULL,
    total_bounced INTEGER DEFAULT 0 NOT NULL,
    total_opened INTEGER DEFAULT 0 NOT NULL,
    total_clicked INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 11. Create system logs table
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    metadata JSONB,
    user_id UUID REFERENCES users(id),
    resource_id TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- 12. Create user API keys tables
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_key_hash ON user_api_keys(key_hash);
CREATE INDEX idx_user_api_keys_is_active ON user_api_keys(is_active);

CREATE TABLE user_api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES user_api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code VARCHAR(3) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    response_time VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_api_key_usage_api_key_id ON user_api_key_usage(api_key_id);
CREATE INDEX idx_user_api_key_usage_created_at ON user_api_key_usage(created_at);

-- 13. Create orders & purchases tables
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_intent_id VARCHAR(255),
    paid_at TIMESTAMP,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    delivery_time VARCHAR(100),
    delivery_status TEXT DEFAULT 'pending',
    delivered_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_type ON order_items(item_type);
CREATE INDEX idx_order_items_delivery_status ON order_items(delivery_status);

-- 14. Create service API configs tables
CREATE TABLE IF NOT EXISTS service_api_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'production',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    config JSONB NOT NULL,
    metadata JSONB,
    last_tested_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_api_configs_service_name ON service_api_configs(service_name);
CREATE INDEX IF NOT EXISTS idx_service_api_configs_environment ON service_api_configs(environment);
CREATE INDEX IF NOT EXISTS idx_service_api_configs_is_active ON service_api_configs(is_active);

CREATE TABLE IF NOT EXISTS service_api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES service_api_configs(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    operation VARCHAR(255) NOT NULL,
    status TEXT NOT NULL,
    status_code VARCHAR(10),
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    response_time INTEGER,
    cost_estimate INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_api_usage_config_id ON service_api_usage(config_id);
CREATE INDEX IF NOT EXISTS idx_service_api_usage_service_name ON service_api_usage(service_name);
CREATE INDEX IF NOT EXISTS idx_service_api_usage_created_at ON service_api_usage(created_at);

-- 15. Create page permissions table
CREATE TABLE IF NOT EXISTS page_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    access TEXT NOT NULL DEFAULT 'public',
    "group" TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_path ON page_permissions(path);
CREATE INDEX IF NOT EXISTS idx_page_permissions_access ON page_permissions(access);

-- 16. Create platform config table
CREATE TABLE IF NOT EXISTS platform_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
