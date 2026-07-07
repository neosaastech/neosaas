# ⚡ Installation & Setup Rapide

> **Démarrez avec NeoSaaS en 5 minutes**

---

## 🎯 Prérequis

- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **pnpm** ([installer](https://pnpm.io/installation))
- **PostgreSQL** database (Neon, Supabase, local, etc.)
- **Git** ([télécharger](https://git-scm.com/))

---

## 🚀 Installation Express (5 min)

### 1. Cloner le Projet

```bash
git clone https://github.com/neosaastech/neosaas-website.git
cd neosaas-website
```

### 2. Installer les Dépendances

```bash
pnpm install
```

### 3. Configuration Environnement

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos valeurs
nano .env  # ou code .env
```

**Variables minimales requises** :

```env
# Database (obligatoire)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Auth (obligatoire)
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Email (choisir 1 provider minimum)
RESEND_API_KEY="re_..." # Recommandé
# ou
SCALEWAY_SECRET_KEY="..."
SCALEWAY_PROJECT_ID="..."
# ou
AWS_SES_ACCESS_KEY="..."
AWS_SES_SECRET_KEY="..."
AWS_SES_REGION="eu-west-3"
```

**Documentation complète** : [`ENVIRONMENT.md`](./ENVIRONMENT.md)

### 4. Initialiser la Base de Données

```bash
# Push schema
pnpm db:push

# Seed (admin + configs)
pnpm db:seed
```

### 5. Lancer en Développement

```bash
pnpm dev
```

**Accéder à** : http://localhost:3000

---

## 👤 Compte Admin par Défaut

| Champ | Valeur |
|-------|--------|
| **Email** | admin@neosaas.tech |
| **Mot de passe** | admin123 |

⚠️ **Changez le mot de passe immédiatement après la première connexion!**

**Documentation** : [`guides/ADMIN_PANEL.md`](../guides/ADMIN_PANEL.md)

---

## 🔑 Configuration OAuth (Optionnel)

### GitHub OAuth

**Temps** : ~15 minutes

1. Créer une OAuth App : https://github.com/settings/developers
2. Configurer dans Admin → API Manager
3. Tester

**Guide complet** : [`oauth/github/SETUP.md`](../oauth/github/SETUP.md)

### Google OAuth

**Temps** : ~30 minutes

1. Créer OAuth Client : Google Cloud Console
2. Configurer dans Admin → API Manager
3. Activer

**Guide complet** : [`oauth/google/SETUP.md`](../oauth/google/SETUP.md)

---

## 📧 Configuration Emails

### Option 1: Resend (Recommandé)

```bash
# 1. Créer compte : https://resend.com
# 2. Copier API key
# 3. Ajouter dans .env
RESEND_API_KEY="re_..."
```

### Option 2: Scaleway

```bash
SCALEWAY_SECRET_KEY="..."
SCALEWAY_PROJECT_ID="..."
```

### Option 3: AWS SES

```bash
AWS_SES_ACCESS_KEY="..."
AWS_SES_SECRET_KEY="..."
AWS_SES_REGION="eu-west-3"
```

**Documentation** : [`modules/EMAIL_SYSTEM.md`](../modules/EMAIL_SYSTEM.md)

---

## 💳 Configuration Lago (Billing)

**Temps** : ~20 minutes

1. Créer compte : https://www.getlago.com
2. Obtenir API key
3. Configurer dans Admin → API Manager

**Documentation** : [`modules/LAGO_BILLING.md`](../modules/LAGO_BILLING.md)

---

## 🧪 Vérification Installation

### Checklist

- [ ] ✅ `pnpm dev` démarre sans erreur
- [ ] ✅ Page d'accueil http://localhost:3000 s'affiche
- [ ] ✅ Connexion admin fonctionne
- [ ] ✅ Admin panel accessible
- [ ] ✅ Database Studio fonctionne (`pnpm db:studio`)

### Commandes Utiles

```bash
# Lancer dev
pnpm dev

# Build production
pnpm build

# Démarrer production
pnpm start

# Database Studio
pnpm db:studio

# Push schema vers la base de données
pnpm db:push
```

---

## ❌ Problèmes Fréquents

### Erreur: `Database connection failed`

**Solution** :
1. Vérifier `DATABASE_URL` dans `.env`
2. Tester connexion PostgreSQL
3. Vérifier firewall/network

**Doc** : [`troubleshooting/DATABASE.md`](../troubleshooting/DATABASE.md)

### Erreur: `NEXTAUTH_SECRET is not defined`

**Solution** :
1. Créer `.env` depuis `.env.example`
2. Générer secret : `openssl rand -base64 32`
3. Redémarrer serveur

### Erreur: `Port 3000 already in use`

**Solution** :
```bash
# Changer port
PORT=3001 pnpm dev
```

**Troubleshooting complet** : [`troubleshooting/`](../troubleshooting/)

---

## 🚀 Prochaines Étapes

### Configuration Basique Complète ✅

Vous avez maintenant NeoSaaS opérationnel en local!

### Prochaines étapes recommandées :

1. **Configurer OAuth** (optionnel) → [`oauth/`](../oauth/)
2. **Setup Email provider** → [`modules/EMAIL_SYSTEM.md`](../modules/EMAIL_SYSTEM.md)
3. **Configurer Lago** → [`modules/LAGO_BILLING.md`](../modules/LAGO_BILLING.md)
4. **Déployer Vercel** → [`deployment/VERCEL.md`](../deployment/VERCEL.md)

---

## 📚 Documentation Connexe

- **[INSTALLATION.md](./INSTALLATION.md)** - Guide complet détaillé
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** - Toutes les variables ENV
- **[DATABASE.md](./DATABASE.md)** - Configuration database avancée
- **[00-START-HERE.md](../00-START-HERE.md)** - Index navigation

---

## 📞 Besoin d'Aide ?

- **Documentation** : [`00-START-HERE.md`](../00-START-HERE.md)
- **Troubleshooting** : [`troubleshooting/`](../troubleshooting/)
- **GitHub Issues** : [neosaastech/neosaas-website/issues](https://github.com/neosaastech/neosaas-website/issues)

---

**Bon développement! 🎉**
