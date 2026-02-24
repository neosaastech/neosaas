# 🚀 Déploiement Production — NeoSaaS Tech

> Guide générique de déploiement sur n'importe quelle plateforme Node.js

---

## Prérequis

- Node.js 18+
- pnpm
- Base de données PostgreSQL accessible (Neon, Supabase, Railway, ou auto-hébergé)
- Variables d'environnement configurées (voir [`setup/ENVIRONMENT.md`](../setup/ENVIRONMENT.md))

---

## Variables d'Environnement Requises

Configurez ces variables dans votre environnement de production :

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
NEXTAUTH_SECRET=<secret-32-caracteres-minimum>
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
RESEND_API_KEY=re_...   # ou autre provider email
```

> Voir le détail complet dans [`setup/ENVIRONMENT.md`](../setup/ENVIRONMENT.md)

---

## Build & Démarrage

```bash
# Installer les dépendances
pnpm install

# Build de production (inclut la config BDD)
pnpm build

# Démarrer en production
pnpm start
```

Le script `pnpm build` initialise automatiquement la base de données si elle est vide.

---

## Déploiement sur une plateforme cloud

### Option A — Plateforme PaaS (Render, Railway, Fly.io...)

1. Connectez votre dépôt Git
2. Définissez la commande de build : `pnpm build`
3. Définissez la commande de démarrage : `pnpm start`
4. Ajoutez les variables d'environnement dans l'interface de la plateforme
5. Déployez

### Option B — VPS / Serveur dédié

```bash
# Cloner et installer
git clone <repo-url> && cd neosaas-tech
pnpm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs de production

# Build
pnpm build

# Démarrer avec un process manager (PM2 recommandé)
pm2 start "pnpm start" --name neosaas-tech
pm2 save
```

### Option C — Docker

```dockerfile
FROM node:18-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

```bash
docker build -t neosaas-tech .
docker run -p 3000:3000 --env-file .env neosaas-tech
```

---

## Initialisation de la Base de Données

Si la base n'est pas initialisée automatiquement lors du build :

```bash
pnpm db:push    # Appliquer le schéma
pnpm db:seed    # Injecter les données par défaut
```

Pour une réinitialisation complète :

```bash
pnpm db:hard-reset  # Reset + migrate + seed
```

---

## Domaine Personnalisé

1. Configurez votre DNS pour pointer vers votre hébergeur
2. Mettez à jour `NEXT_PUBLIC_APP_URL` avec votre domaine final
3. Redéployez pour que les métadonnées SEO et OAuth callbacks soient corrects

---

## Checklist Production

- [ ] Variables d'environnement configurées
- [ ] `NEXT_PUBLIC_APP_URL` pointe sur le domaine de production
- [ ] Base de données initialisée (`pnpm db:push && pnpm db:seed`)
- [ ] Identifiants admin changés (`admin@exemple.com` / `admin`)
- [ ] Stripe configuré depuis `/admin/api`
- [ ] Provider email configuré et testé
- [ ] Webhook Stripe pointant sur `https://votre-domaine.com/api/webhooks/stripe`
- [ ] HTTPS activé
