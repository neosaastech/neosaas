import { sql } from "@neondatabase/serverless"

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id),
      invited_by UUID REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      accepted_at TIMESTAMP
    );

    CREATE INDEX idx_invitations_email ON user_invitations(email);
    CREATE INDEX idx_invitations_token ON user_invitations(token);
    CREATE INDEX idx_invitations_company ON user_invitations(company_id);
  `)
}
