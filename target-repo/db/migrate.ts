/**
 * @deprecated Ce fichier utilise le migrateur intégré de Drizzle ORM
 * (drizzle-orm/neon-http/migrator) qui écrit dans __drizzle_migrations
 * avec un schéma incompatible (id TEXT, hash TEXT) avec celui utilisé
 * par le runner custom scripts/migrate.ts (id SERIAL, tag TEXT, idx INT).
 *
 * NE PAS exécuter ce fichier directement.
 *
 * Utilisez à la place :
 *   pnpm db:migrate     ← scripts/migrate.ts (journal-based, idempotent)
 *   pnpm db:push        ← drizzle-kit push (TCP, GitHub Actions uniquement)
 *   pnpm db:ensure      ← scripts/db-ensure-columns.ts (safety net)
 *
 * Voir : docs/MIGRATION_ARCHITECTURE.md
 */

export {}  // Évite les erreurs de compilation TS (module vide)

