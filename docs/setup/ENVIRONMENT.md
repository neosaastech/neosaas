# ⚙️ Environment Variables Configuration

> **Creation Date**: February 19, 2026  
> **Last Updated**: February 19, 2026  
> **Status**: ✅ Documented

---

## 📋 Required Variables

### 🗄️ Database (Neon PostgreSQL)

```env
# Main connection URL (HTTP pooler — used by Server Actions and API Routes)
DATABASE_URL='postgresql://<user>:<password>@<host-pooler>/<dbname>?sslmode=require&channel_binding=require'

# For direct connections (scripts, migrations, Drizzle Kit)
PGPASSWORD=<neon-password>
PGUSER=<pg-user>
