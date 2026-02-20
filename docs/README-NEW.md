# 📚 Documentation NeoSaaS

> **Bienvenue dans la documentation complète de NeoSaaS**

---

## ⭐ COMMENCEZ ICI

### 👉 [00-START-HERE.md](./00-START-HERE.md)

**Point d'entrée principal** - Navigation complète, guides rapides, et vue d'ensemble du projet.

---

## 🚀 Installation Rapide (5 min)

```bash
# Cloner
git clone https://github.com/neosaastech/neosaas-website.git
cd neosaastech/neosaas-website

# Installer
pnpm install

# Configurer
cp .env.example .env
# Éditer .env avec vos valeurs

# Database
pnpm db:push && pnpm db:seed

# Lancer
pnpm dev
```

**Guide complet** : [setup/QUICK_START.md](./setup/QUICK_START.md)

---

## 📍 Navigation Rapide

### Pour les Nouveaux Utilisateurs

1. **Installation** → [setup/QUICK_START.md](./setup/QUICK_START.md)
2. **Comprendre le projet** → [STATUS.md](./STATUS.md)
3. **Architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)

### Pour les Développeurs

1. **⚠️ ACTION REQUISE** → [OAUTH_ACTION_REQUIRED.md](./OAUTH_ACTION_REQUIRED.md)
2. **OAuth** → [OAUTH_INDEX.md](./OAUTH_INDEX.md)
3. **Déploiement** → [deployment/VERCEL.md](./deployment/VERCEL.md)

### Pour les Administrateurs

1. **Configuration** → [setup/INSTALLATION.md](./setup/INSTALLATION.md)
2. **Sécurité** → [guides/SECURITY.md](./guides/SECURITY.md)
3. **Monitoring** → [deployment/MONITORING.md](./deployment/MONITORING.md)

---

## 🗂️ Structure Documentation

```
docs/
├── 📖 00-START-HERE.md         ⭐ POINT D'ENTRÉE
├── 📊 STATUS.md                État projet, historique
├── 🏗️ ARCHITECTURE.md          Architecture globale
├── 🔐 OAUTH_INDEX.md           Navigation OAuth
├── ⚠️ OAUTH_ACTION_REQUIRED.md Migration OAuth urgente
│
├── setup/                      Installation & Config
│   ├── QUICK_START.md
│   ├── INSTALLATION.md
│   └── ENVIRONMENT.md
│
├── oauth/                      OAuth Complet
│   ├── README.md
│   ├── OAUTH_ARCHITECTURE.md
│   ├── OAUTH_DUPLICATES_AUDIT.md
│   ├── OAUTH_MIGRATION_PLAN.md
│   ├── github/
│   └── google/
│
├── deployment/                 Déploiement Production
│   ├── VERCEL.md
│   └── ...
│
├── guides/                     Guides Pratiques
│   ├── AUTHENTICATION_SETUP.md
│   ├── PRE_PUSH_CHECKLIST.md
│   └── ...
│
├── architecture/               Architecture Technique
│   └── ...
│
├── modules/                    Modules (Email, Billing)
│   └── ...
│
├── troubleshooting/            Dépannage
│   └── ...
│
└── archive/                    Archives (Référence)
    └── legacy/
```

---

## ⚠️ ACTIONS PRIORITAIRES

### 🔴 Critique - Migration OAuth

Le système OAuth contient **340+ lignes de code dupliquées**.

**📖 Lire immédiatement** : [OAUTH_ACTION_REQUIRED.md](./OAUTH_ACTION_REQUIRED.md)

**Temps** : 3-4 heures  
**Impact** : 95% moins de code + Google OAuth en 15 min

---

### 🟡 Important - Database Reset Auto

La database est **reset automatiquement** à chaque déploiement.

**Désactiver** : [deployment/DATABASE_RESET.md](./deployment/DATABASE_RESET.md)

---

## 📊 État Projet

| Composant | Statut | Action |
|-----------|--------|--------|
| **Frontend** | ✅ Production | - |
| **OAuth GitHub** | ⚠️ Migration requise | [Migrer](./OAUTH_ACTION_REQUIRED.md) |
| **OAuth Google** | ✅ Prêt | [Activer](./oauth/google/SETUP.md) |
| **Emails** | ✅ Opérationnel | - |
| **Payments** | ✅ Lago intégré | [Configurer](./modules/LAGO_BILLING.md) |

**Détails complets** : [STATUS.md](./STATUS.md)

---

## 🔍 Recherche Rapide

### Je veux...

**...installer le projet** → [setup/QUICK_START.md](./setup/QUICK_START.md)

**...configurer GitHub OAuth** → [oauth/github/SETUP.md](./oauth/github/SETUP.md)

**...ajouter Google OAuth** → [oauth/google/SETUP.md](./oauth/google/SETUP.md)

**...déployer sur Vercel** → [deployment/VERCEL.md](./deployment/VERCEL.md)

**...comprendre l'architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)

**...résoudre une erreur** → [troubleshooting/](./troubleshooting/)

**...voir l'historique** → [STATUS.md](./STATUS.md)

**...migrer OAuth** → [OAUTH_ACTION_REQUIRED.md](./OAUTH_ACTION_REQUIRED.md)

---

## 📞 Support

### Documentation
- **Navigation complète** : [00-START-HERE.md](./00-START-HERE.md)
- **Index OAuth** : [OAUTH_INDEX.md](./OAUTH_INDEX.md)

### Problèmes
- **Troubleshooting** : [troubleshooting/](./troubleshooting/)
- **GitHub Issues** : [neosaastech/neosaas-website/issues](https://github.com/neosaastech/neosaas-website/issues)

---

## 📝 Contribution

### Ajouter Documentation

1. Identifier catégorie (setup, guides, oauth, etc.)
2. Créer fichier .md dans bon dossier
3. Mettre à jour index pertinent
4. Suivre format existant

### Format Documents

```markdown
# Titre Principal

> **Description courte**

---

## Sections

- Navigation
- Contenu
- Liens connexes

---

**Auteur** | **Date**
```

---

## 🗺️ Roadmap Documentation

- [x] ✅ Créer structure organisée
- [x] ✅ Point d'entrée unique (00-START-HERE.md)
- [x] ✅ Navigation OAuth complète
- [x] ✅ Guides installation
- [ ] Guides avancés (Testing, CI/CD)
- [ ] API Reference
- [ ] Video tutorials
- [ ] Translations (FR/EN)

---

## 📦 Archives

Les anciens documents sont dans : [archive/](./archive/)

**Ne pas utiliser pour nouveau développement!**

---

**Commencez ici** : [00-START-HERE.md](./00-START-HERE.md) 🚀
