# NeoSaaS Database Configuration

## Overview

NeoSaaS uses **Drizzle ORM** with **Neon PostgreSQL** for database management. This provides type-safe database access with excellent performance.

## Initial Setup

### 1. Run the SQL Script

Execute the initialization script in your Neon database:

\`\`\`bash
# The script is located at: scripts/001-init-database.sql
\`\`\`

You can run this script:
- In the Neon dashboard SQL editor
- Using the Neon CLI
- Or execute it from your application

### 2. Verify Connection

Test the database connection:

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

You should see:
\`\`\`json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-10T..."
}
\`\`\`

## Database Schema

### Tables

#### Users
- `id` - UUID primary key
- `email` - Unique email address
- `name` - User's display name
- `password` - Hashed password (optional for OAuth users)
- `image` - Profile image URL
- `email_verified` - Email verification status
- `created_at`, `updated_at` - Timestamps

#### Sessions
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `token` - Unique session token
- `expires_at` - Session expiration
- `created_at` - Timestamp

#### Accounts
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `provider` - OAuth provider (google, github, etc.)
- `provider_account_id` - Provider's user ID
- `access_token`, `refresh_token` - OAuth tokens
- `expires_at`, `created_at` - Timestamps

#### Subscriptions
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `plan` - Subscription plan (starter, pro, enterprise)
- `status` - Current status (active, canceled, etc.)
- `stripe_customer_id`, `stripe_subscription_id` - Stripe references
- `current_period_start`, `current_period_end` - Billing period
- `cancel_at_period_end` - Cancellation flag
- `created_at`, `updated_at` - Timestamps

#### Payments
- `id` - UUID primary key
- `user_id` - Foreign key to users
- `subscription_id` - Foreign key to subscriptions
- `amount` - Payment amount
- `currency` - Payment currency (default: usd)
- `status` - Payment status
- `stripe_payment_intent_id` - Stripe reference
- `created_at` - Timestamp

## Usage Examples

### Create a User

\`\`\`typescript
import { createUser } from '@/lib/db/queries'

const user = await createUser({
  email: 'user@example.com',
  name: 'John Doe',
})
\`\`\`

### Get User by Email

\`\`\`typescript
import { getUserByEmail } from '@/lib/db/queries'

const user = await getUserByEmail('user@example.com')
\`\`\`

### Create Subscription

\`\`\`typescript
import { createSubscription } from '@/lib/db/queries'

const subscription = await createSubscription({
  userId: user.id,
  plan: 'pro',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
})
\`\`\`

## API Endpoints

### POST /api/users
Create a new user

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123"
}
\`\`\`

### GET /api/users?email=user@example.com
Get user by email

### POST /api/subscriptions
Create a subscription

**Request:**
\`\`\`json
{
  "userId": "uuid",
  "plan": "pro",
  "status": "active"
}
\`\`\`

### GET /api/subscriptions?userId=uuid
Get user's subscription

### GET /api/health
Check database connection health

## Drizzle Commands

### Generate Migrations
\`\`\`bash
npx drizzle-kit generate
\`\`\`

### Push Schema to Database
\`\`\`bash
npx drizzle-kit push
\`\`\`

### Open Drizzle Studio
\`\`\`bash
npx drizzle-kit studio
\`\`\`

This opens a visual database browser at http://localhost:4983

## Environment Variables

Required in your `.env`:

\`\`\`env
NEON_DATABASE_URL=postgresql://...
\`\`\`

## Best Practices

1. **Always use transactions** for multiple related operations
2. **Index frequently queried fields** (already set up in init script)
3. **Use prepared statements** for repeated queries
4. **Handle errors gracefully** with try-catch blocks
5. **Validate input data** with Zod schemas before database operations

## Troubleshooting

### Connection Issues
- Verify `NEON_DATABASE_URL` is set correctly
- Check Neon dashboard for database status
- Test with `/api/health` endpoint

### Schema Mismatches
- Run the init script again
- Check Drizzle Studio for current schema
- Generate new migrations if needed

### Performance Issues
- Check query indexes
- Use Neon's query analyzer
- Consider connection pooling for high traffic
