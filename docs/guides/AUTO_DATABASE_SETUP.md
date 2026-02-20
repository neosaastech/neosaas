# 🚀 Configuration Automatique de la Base de Données

## 📋 Vue d'Ensemble

Ce projet est configuré pour **créer et synchroniser automatiquement les tables de la base de données** à chaque déploiement Vercel Preview.

## ⚙️ Comment Ça Marche

### 1. Script de Build Intelligent

Le script `scripts/build-with-db.sh` est exécuté automatiquement lors de chaque build :

\`\`\`bash
pnpm build  # Exécute automatiquement le script
\`\`\`

**Comportement du script** :

| Environnement | DATABASE_URL | Action |
|---------------|--------------|--------|
| Vercel | ✅ Défini | **Synchronise** le schéma + Build |
| Vercel | ❌ Non défini | ⚠️ Avertissement + Build uniquement |
| Local | N/A | ℹ️ Ignore la synchro + Build uniquement |

### 2. Synchronisation du Schéma

Lorsque les conditions sont remplies, le script exécute `pnpm db:push` qui :

1. **Crée le type enum `role`** (admin, finance)
2. **Crée la table `companies`** si elle n'existe pas
3. **Crée la table `users`** si elle n'existe pas
4. **Crée tous les index** pour optimiser les performances
5. Est **idempotent** : peut être exécuté plusieurs fois sans erreur

## 📦 Fichiers Impliqués

\`\`\`
project/
├── package.json                    # "build": "bash scripts/build-with-db.sh"
├── scripts/
│   └── build-with-db.sh           # Script de build intelligent
└── db/
    ├── schema.ts                  # Définition du schéma Drizzle (source de vérité)
    └── index.ts                   # Connexion base de données
\`\`\`

## 🔄 Processus de Déploiement Preview

\`\`\`mermaid
graph LR
    A[Git Push] --> B[Vercel Build Start]
    B --> C{DATABASE_URL défini?}
    C -->|Oui| D[pnpm db:push]
    C -->|Non| E[⚠️ Warning]
    D --> F[Crée/Met à jour tables]
    E --> G[pnpm exec next build]
    F --> G
    G --> H[Déploiement Preview]
\`\`\`

### Étapes Automatiques

1. **Push vers GitHub** : Vous poussez un commit sur une branche
2. **Vercel détecte** : Vercel crée un déploiement Preview
3. **Variables chargées** : Vercel charge les env vars de Preview
4. **Synchronisation auto** : `db:push` crée/met à jour les tables
5. **Build Next.js** : Compilation de l'application
6. **Déploiement** : Application disponible avec base de données prête

## ✅ Configuration Requise

### Variables d'Environnement (Vercel Preview)

Ces variables **doivent être configurées** dans Vercel pour l'environnement **Preview** :

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `DATABASE_URL` | URL de connexion Neon | ✅ Oui |
| `NEXTAUTH_SECRET` | Secret JWT (32+ caractères) | ✅ Oui |
| `ADMIN_SECRET_KEY` | Clé pour endpoint /api/setup | ⚠️ Optionnel |

**Configuration via Vercel Dashboard** :
👉 https://vercel.com/[team]/neosaas-website/settings/environment-variables

**Pour chaque variable** :
- ✅ Cochez **Preview** uniquement
- ❌ Ne pas cocher Production/Development

## 🧪 Test Local

Pour tester la synchronisation en local :

\`\`\`bash
# 1. Créer un fichier .env.local avec DATABASE_URL
echo "DATABASE_URL=postgresql://..." > .env.local

# 2. Exécuter manuellement la synchronisation
pnpm db:push

# 3. Vérifier que les tables sont créées
# Via Neon Console ou avec pnpm db:studio
\`\`\`

## 🔍 Vérification Après Déploiement

### 1. Vérifier les Logs de Build

Dans Vercel Dashboard → Deployment → Build Logs, cherchez :

\`\`\`
✅ Build Vercel détecté
✅ DATABASE_URL configuré

🗄️  Synchronisation du schéma de la base de données...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Role enum created/verified
✓ Companies table created
✓ Users table created
✓ Indexes created

✅ Schema pushed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

### 2. Tester l'API Health Check

\`\`\`bash
curl https://[preview-url].vercel.app/api/health
\`\`\`

**Résultat attendu** :
\`\`\`json
{
  "status": "ok",
  "database": "connected",
  "tables": {
    "exist": true,
    "found": ["companies", "users"],
    "missing": []
  }
}
\`\`\`

### 3. Tester l'Inscription

Ouvrez : `https://[preview-url].vercel.app/auth/register`

Créez un compte test pour vérifier que tout fonctionne.

## 🐛 Dépannage

### ❌ "DATABASE_URL non défini"

**Symptôme** : Les logs montrent "⚠️ DATABASE_URL non défini - synchronisation ignorée"

**Solution** :
1. Vérifiez que `DATABASE_URL` est configuré dans Vercel
2. Vérifiez que la cible est bien **Preview**
3. Redéployez manuellement (bouton "Redeploy")

### ❌ "Error pushing schema"

**Symptôme** : Le build échoue lors de `pnpm db:push`

**Causes possibles** :
- ❌ URL de connexion Neon incorrecte
- ❌ Base de données Neon inaccessible
- ❌ Paramètre `channel_binding=require` présent (non supporté)

**Solution** :
\`\`\`bash
# Supprimer channel_binding de DATABASE_URL
# Bon : postgresql://user:pass@host/db?sslmode=require
# Mauvais : postgresql://user:pass@host/db?sslmode=require&channel_binding=require
\`\`\`

### ℹ️ Tables déjà existantes

**Symptôme** : Logs montrent "Type 'role' already exists"

**Statut** : ✅ Normal ! Le script est idempotent

Les tables et types existants sont simplement ignorés. C'est un comportement attendu.

## 🔐 Sécurité

### Build-time vs Runtime

- ✅ **Build-time** : Script s'exécute côté Vercel (sécurisé)
- ✅ **Variables** : Chargées depuis Vercel (non exposées au client)
- ✅ **Idempotent** : Peut être exécuté plusieurs fois sans risque

### Endpoint /api/setup

L'ancien endpoint `/api/setup` est **toujours disponible** comme fallback :

\`\`\`bash
curl -X POST https://[preview-url]/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey":"change-this-in-production"}'
\`\`\`

**Recommandation** : Le supprimer en production après initialisation.

## 📊 Schéma de Base de Données

### Type Enum

\`\`\`sql
CREATE TYPE role AS ENUM ('admin', 'finance');
\`\`\`

### Table `companies`

| Colonne | Type | Contrainte |
|---------|------|------------|
| id | UUID | PRIMARY KEY |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL UNIQUE |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Table `users`

| Colonne | Type | Contrainte |
|---------|------|------------|
| id | UUID | PRIMARY KEY |
| email | TEXT | NOT NULL UNIQUE |
| password | TEXT | NOT NULL (hashed) |
| first_name | TEXT | NOT NULL |
| last_name | TEXT | NOT NULL |
| company_id | UUID | FK → companies(id) |
| role | role | DEFAULT 'finance' |
| is_saas_admin | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Index

- `idx_companies_email` : Recherche rapide par email
- `idx_users_email` : Recherche rapide par email
- `idx_users_company_id` : Filtrage par entreprise
- `idx_users_is_saas_admin` : Filtrage des admins SaaS

## 🎯 Avantages

✅ **Automatique** : Plus besoin de créer manuellement les tables
✅ **Idempotent** : Réexécutable sans danger
✅ **Rapide** : Synchronisation en ~2-5 secondes
✅ **Transparent** : Logs clairs dans Vercel
✅ **Sécurisé** : Exécution côté serveur uniquement

## 📚 Commandes Utiles

\`\`\`bash
# Build avec synchronisation auto (Vercel)
pnpm build

# Build local sans synchronisation
pnpm build:local

# Synchroniser manuellement le schéma
pnpm db:push

# Ouvrir Drizzle Studio (interface visuelle)
pnpm db:studio
\`\`\`

## 🔄 Workflow Complet

\`\`\`bash
# 1. Développement local
git checkout -b feature/new-auth

# 2. Modifier le schéma si nécessaire
vim db/schema.ts

# 3. Tester localement
pnpm db:push
pnpm dev

# 4. Commit et push
git add .
git commit -m "Add new auth feature"
git push origin feature/new-auth

# 5. Vercel crée automatiquement un Preview
# ✅ Les tables sont créées/synchronisées automatiquement
# ✅ L'application est prête à tester

# 6. Tester l'URL Preview
open https://neosaas-website-git-feature-new-auth-[team].vercel.app
\`\`\`

## 📝 Notes

- **Production** : Ce mécanisme fonctionne aussi en Production, mais assurez-vous de tester en Preview d'abord
- **Migrations** : Pour toute modification de schéma, modifiez `db/schema.ts` puis redéployez (`drizzle-kit push` est exécuté automatiquement)
- **Rollback** : En cas de problème, les tables existantes ne sont jamais supprimées
