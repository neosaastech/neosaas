# Scripts Database NeoSaaS

Ce dossier contient tous les scripts de gestion de la base de données avec Drizzle ORM.

## Installation de la base de données

### Étape 1: Générer les migrations

\`\`\`bash
npm run db:generate
\`\`\`

Cette commande génère les fichiers de migration SQL dans le dossier `./drizzle` basés sur votre schéma TypeScript dans `lib/db/schema.ts`.

### Étape 2: Appliquer les migrations (Push)

\`\`\`bash
npm run db:push
\`\`\`

Cette commande applique directement votre schéma à la base de données Neon sans créer de fichiers de migration. **Recommandé pour le développement**.

OU

\`\`\`bash
npm run db:migrate
\`\`\`

Cette commande exécute les migrations SQL générées. **Recommandé pour la production**.

### Étape 3: Peupler la base (Seed)

\`\`\`bash
npm run db:seed
\`\`\`

Cette commande exécute le script `scripts/seed.ts` qui ajoute des données de test dans votre base.

## Visualiser la base de données

\`\`\`bash
npm run db:studio
\`\`\`

Ouvre Drizzle Studio dans votre navigateur pour explorer et modifier vos données visuellement.

## Workflow de développement recommandé

1. **Modifier le schéma** dans `lib/db/schema.ts`
2. **Push vers la base**: `npm run db:push` (développement rapide)
3. **Vérifier avec Studio**: `npm run db:studio`
4. **Peupler si nécessaire**: `npm run db:seed`

## Workflow de production recommandé

1. **Modifier le schéma** dans `lib/db/schema.ts`
2. **Générer la migration**: `npm run db:generate`
3. **Vérifier les fichiers** dans `./drizzle`
4. **Appliquer la migration**: `npm run db:migrate`

## Structure

- `001-init-database.sql` - Migration SQL initiale (legacy)
- `migrate.ts` - Script de migration programmatique
- `seed.ts` - Script de peuplement de la base
- `README.md` - Cette documentation

## Variables d'environnement requises

\`\`\`
NEON_DATABASE_URL=postgres://user:pass@host/db
\`\`\`

Cette variable est automatiquement disponible via l'intégration Neon de Vercel.

## Commandes Drizzle disponibles

| Commande | Description |
|----------|-------------|
| `db:generate` | Génère les migrations SQL depuis le schéma |
| `db:migrate` | Exécute les migrations sur la base |
| `db:push` | Pousse le schéma directement (dev) |
| `db:studio` | Ouvre l'interface visuelle Drizzle Studio |
| `db:seed` | Peuple la base avec des données de test |

## Dépendances

- `drizzle-orm` - ORM TypeScript
- `drizzle-kit` - CLI et outils de migration
- `@neondatabase/serverless` - Driver Neon serverless
- `tsx` - Pour exécuter les scripts TypeScript

Toutes les dépendances sont déjà installées dans le projet.
\`\`\`

\`\`\`sql file="scripts/001-init-database.sql" isDeleted="true"
...deleted...
