# 🚀 NeoSaaS - Démarrage Rapide

> **Point d'entrée principal** - Commencez ici pour comprendre le projet

---

## 📖 Bienvenue

NeoSaaS est une plateforme SaaS avec authentification, gestion utilisateurs, paiements Stripe et emails.

> ⚠️ **Note (16 fév. 2026)** : Le système de paiement est passé de Lago à **Stripe Direct** (mode test/live piloté depuis `/admin`). Voir [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md).

**Langues** : Frontend 100% Anglais | Backend multilingue

---

## 🗺️ Navigation Documentation

### 1️⃣ Installation & Setup (Commencer ici!)

| Document | Description | Temps |
|----------|-------------|-------|
| **[QUICK_START.md](./setup/QUICK_START.md)** | Installation en 5 minutes | ⏱️ 5 min |
| **[INSTALLATION.md](./setup/INSTALLATION.md)** | Guide complet d'installation | ⏱️ 15 min |
| **[ENVIRONMENT.md](./setup/ENVIRONMENT.md)** | Configuration .env | ⏱️ 10 min |

### 2️⃣ OAuth & Authentification

| Document | Description | Temps |
|----------|-------------|-------|
| **[GITHUB_OAUTH_ARCHITECTURE_V3.md](./GITHUB_OAUTH_ARCHITECTURE_V3.md)** | Architecture unifiée GitHub OAuth | ⏱️ 10 min |
| **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** ✨ **NOUVEAU** | Guide complet configuration Google OAuth | ⏱️ 20 min |
| **[GOOGLE_OAUTH_IMPLEMENTATION_SUMMARY.md](./GOOGLE_OAUTH_IMPLEMENTATION_SUMMARY.md)** ✨ **NOUVEAU** | Résumé implémentation Google OAuth | ⏱️ 5 min |
| **[AUTHENTICATION_ONBOARDING.md](./AUTHENTICATION_ONBOARDING.md)** | Flow authentification et onboarding | ⏱️ 10 min |

### 3️⃣ Architecture & Développement

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Architecture globale du projet |
| **[ADMIN_API_MANAGEMENT.md](./ADMIN_API_MANAGEMENT.md)** ✨ **NOUVEAU** | Système hiérarchique de gestion des APIs (Brand → Services → APIs) |
| **[ADMIN_API_HIERARCHICAL_SYSTEM_RECAP.md](./ADMIN_API_HIERARCHICAL_SYSTEM_RECAP.md)** ✨ **NOUVEAU** | Récapitulatif du nouveau système API hiérarchique |
| **[STATUS.md](./STATUS.md)** | État actuel, historique, roadmap |
| **[architecture/](./architecture/)** | Schémas et détails techniques |

### 4️⃣ Déploiement

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Déploiement production |
| **[deployment/](./deployment/)** | Guides Vercel, Database, etc. |

### 5️⃣ Guides Spécifiques

| Dossier | Contenu |
|---------|---------|
| **[guides/](./guides/)** | Tutoriels pas-à-pas |
| **[modules/](./modules/)** | Documentation modules (Email, Payments, etc.) |
| **[troubleshooting/](./troubleshooting/)** | Résolution problèmes |

---

## ⚠️ ACTIONS PRIORITAIRES

### 🔴 Critique - Migration OAuth Requise

Le système OAuth contient actuellement **340+ lignes de code dupliquées**.

**📖 Lire immédiatement** : [`OAUTH_ACTION_REQUIRED.md`](./OAUTH_ACTION_REQUIRED.md)

**Impact** :
- 95% de code en moins après migration
- Google OAuth prêt en 15 min au lieu de 4h
- Élimination risques de divergence

### 🟡 Important - Configuration Base de Données

⚠️ **Mode Reset Automatique Activé**

La base de données est réinitialisée à chaque déploiement :
- 🗑️ Toutes les données supprimées
- 🏗️ Schéma recréé
- 🌱 Seed appliqué

**Pour désactiver** : Voir [`deployment/DATABASE_RESET.md`](./deployment/DATABASE_RESET.md)

---

## 🛠️ Installation Express (5 min)

```bash
# 1. Cloner le projet
git clone https://github.com/neosaastech/neosaas-website.git
cd neosaas-website

# 2. Installer dépendances
pnpm install

# 3. Configurer environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Base de données
pnpm db:push
pnpm db:seed

# 5. Lancer
pnpm dev
```

**URL** : http://localhost:3000

**Admin** : admin@neosaas.tech / admin123

---

## 📊 État Actuel du Projet

| Composant | Statut | Version |
|-----------|--------|---------|
| **Frontend** | ✅ Production | English-only |
| **OAuth GitHub** | ⚠️ Migration requise | v2.0 (legacy + modulaire) |
| **OAuth Google** | ✅ Prêt | v2.0 (modulaire) |
| **Base de données** | ✅ Opérationnel | Reset auto activé |
| **Emails** | ✅ Multi-provider | Resend/Scaleway/AWS SES |
| **Payments** | ✅ Lago | Intégré |

**Détails complets** : [`STATUS.md`](./STATUS.md)

---

## 🗂️ Structure Documentation

```
docs/
├── 00-START-HERE.md           # ⭐ VOUS ÊTES ICI
├── STATUS.md                   # État projet, historique
├── ARCHITECTURE.md             # Architecture globale
├── OAUTH_INDEX.md              # Navigation OAuth
├── OAUTH_ACTION_REQUIRED.md    # ⚠️ Migration urgente
│
├── setup/                      # Installation & configuration
│   ├── QUICK_START.md
│   ├── INSTALLATION.md
│   └── ENVIRONMENT.md
│
├── oauth/                      # OAuth complet (GitHub, Google)
│   ├── OAUTH_ARCHITECTURE.md
│   ├── OAUTH_DUPLICATES_AUDIT.md
│   ├── OAUTH_MIGRATION_PLAN.md
│   ├── github/                 # GitHub OAuth
│   └── google/                 # Google OAuth
│
├── architecture/               # Architecture technique
│   ├── DATA_MODEL.md
│   └── ...
│
├── deployment/                 # Déploiement
│   ├── VERCEL.md
│   └── DATABASE_RESET.md
│
├── guides/                     # Tutoriels
│   ├── AUTHENTICATION_SETUP.md
│   └── ...
│
├── modules/                    # Modules spécifiques
│   ├── EMAIL_SYSTEM.md
│   └── ...
│
├── troubleshooting/            # Dépannage
│   ├── OAUTH_ERRORS.md
│   └── ...
│
└── archive/                    # Anciens docs (référence)
    ├── legacy-oauth/
    └── old-versions/
```

---

## 🔍 Recherche Rapide

### Je veux...

**...installer le projet** → [`setup/QUICK_START.md`](./setup/QUICK_START.md)

**...configurer GitHub OAuth** → [`oauth/github/`](./oauth/github/)

**...ajouter Google OAuth** → [`oauth/google/GOOGLE_SETUP.md`](./oauth/google/GOOGLE_SETUP.md)

**...déployer sur Vercel** → [`deployment/VERCEL.md`](./deployment/VERCEL.md)

**...comprendre l'architecture** → [`ARCHITECTURE.md`](./ARCHITECTURE.md)

**...résoudre une erreur OAuth** → [`troubleshooting/OAUTH_ERRORS.md`](./troubleshooting/OAUTH_ERRORS.md)

**...voir l'historique** → [`STATUS.md`](./STATUS.md)

**...migrer OAuth** → [`OAUTH_ACTION_REQUIRED.md`](./OAUTH_ACTION_REQUIRED.md)

---

## 📞 Support

### Documentation
- 📖 Index complet : Voir structure ci-dessus
- 🔍 Recherche : Utilisez Ctrl+F ou Cmd+F

### Problèmes Fréquents
- OAuth errors → [`troubleshooting/OAUTH_ERRORS.md`](./troubleshooting/OAUTH_ERRORS.md)
- Database issues → [`troubleshooting/DATABASE.md`](./troubleshooting/DATABASE.md)
- Deployment → [`troubleshooting/DEPLOYMENT.md`](./troubleshooting/DEPLOYMENT.md)

### Communauté
- GitHub Issues : [neosaastech/neosaas-website/issues](https://github.com/neosaastech/neosaas-website/issues)

---

## 🎯 Prochaines Étapes Recommandées

1. **Installation** (5 min) → [`setup/QUICK_START.md`](./setup/QUICK_START.md)
2. **Migration OAuth** (30 min) → [`OAUTH_ACTION_REQUIRED.md`](./OAUTH_ACTION_REQUIRED.md)
3. **Configuration Production** (15 min) → [`deployment/VERCEL.md`](./deployment/VERCEL.md)
4. **Tests** (10 min) → [`guides/TESTING.md`](./guides/TESTING.md)

---

**Bon développement! 🚀**
