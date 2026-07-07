# 🔧 Scripts NeoSaaS

Ce dossier contient tous les scripts utilitaires pour le projet NeoSaaS.

## 📂 Organisation

```
scripts/
├── README.md                           # Ce fichier
├── build-with-db.sh                    # Build avec sync DB
├── setup-vercel-env.sh                 # Setup variables d'environnement Vercel
├── vercel-api-setup.sh                 # Configuration API Vercel
├── test-checkout-flow.ts               # Test complet du tunnel d'achat
└── deployment/
    └── configure-vercel-preview.sh     # Configuration Vercel Preview
```

## 📜 Scripts Disponibles

### Tests E-Commerce

#### `test-checkout-flow.ts`
**Description:** Script complet pour tester le tunnel d'achat avec intégration Lago.

**Usage:**
```bash
# Test complet avec Lago (mode production)
pnpm tsx scripts/test-checkout-flow.ts

# Test avec Lago en mode test
pnpm tsx scripts/test-checkout-flow.ts --mode=test

# Test sans Lago (uniquement DB)
pnpm tsx scripts/test-checkout-flow.ts --skip-lago

# Test sans nettoyage (garder les données)
pnpm tsx scripts/test-checkout-flow.ts --no-cleanup
```

**Ce que le script teste:**
- ✅ Création/Recherche utilisateur de test
- ✅ Récupération/Création de produits de test
- ✅ Création du panier avec produits
- ✅ Intégration Lago (customer, add-ons, invoice)
- ✅ Création de la commande en DB
- ✅ Nettoyage automatique (optionnel)

**Options:**
- `--mode=test` : Utilise les credentials Lago de test
- `--skip-lago` : Ignore l'intégration Lago
- `--no-cleanup` : Garde les données de test

**Code de sortie:**
- `0` : Test réussi
- `1` : Test échoué

**Voir aussi:**
- 📖 Documentation: [docs/CHECKOUT_FLOW.md](../docs/CHECKOUT_FLOW.md)
- 🖥️ Page de test UI: `/admin/test-checkout`

---

### Build & Database

#### `build-with-db.sh`
Build Next.js avec synchronisation automatique de la base de données.

```bash
npm run build
# ou
bash scripts/build-with-db.sh
```

**Fonctionnalités :**
- Détecte l'environnement (local vs Vercel)
- Synchronise le schéma DB en preview
- Build Next.js

---

### Vercel Configuration

#### `setup-vercel-env.sh`
Configure les variables d'environnement sur Vercel.

```bash
bash scripts/setup-vercel-env.sh
```

#### `vercel-api-setup.sh`
Configure l'accès API Vercel.

```bash
bash scripts/vercel-api-setup.sh
```

---

### Deployment

#### `deployment/configure-vercel-preview.sh`
Configure l'environnement Vercel Preview.

⚠️ **SÉCURITÉ** : Ce script contient des tokens en dur. À SUPPRIMER ou MODIFIER avant utilisation en production !

```bash
bash scripts/deployment/configure-vercel-preview.sh
```

**⚠️ Actions requises :**
1. Créer des variables d'environnement au lieu de tokens en dur
2. Utiliser `vercel env` CLI ou le dashboard Vercel
3. Ne JAMAIS commiter de tokens/secrets

---

## 🔒 Bonnes Pratiques de Sécurité

### ❌ À NE PAS FAIRE

```bash
# MAUVAIS - Token en dur
VERCEL_TOKEN="token_secret_123"
```

### ✅ À FAIRE

```bash
# BON - Variable d'environnement
VERCEL_TOKEN="${VERCEL_TOKEN}"

# BON - Demander à l'utilisateur
read -sp "Vercel Token: " VERCEL_TOKEN
```

### Configuration Recommandée

1. **Variables d'environnement locales** : Utiliser `.env.local`
2. **Vercel** : Configurer via Dashboard ou CLI
3. **CI/CD** : Utiliser des secrets GitHub/GitLab

```bash
# .env.local (NE PAS COMMITER)
VERCEL_TOKEN=your_token_here
TEAM_ID=your_team_id
```

---

## 🚀 Ajouter un Nouveau Script

Lors de l'ajout d'un nouveau script :

1. **Placez-le dans le bon dossier**
   - Build/Deploy → `deployment/`
   - Database → `database/`
   - Utilitaires → racine de `scripts/`

2. **Rendez-le exécutable**
   ```bash
   chmod +x scripts/votre-script.sh
   ```

3. **Ajoutez un header descriptif**
   ```bash
   #!/bin/bash
   # Description: Que fait ce script
   # Usage: bash scripts/votre-script.sh [args]
   set -e
   ```

4. **Documentez-le ici**
   Ajoutez une section dans ce README

---

## 📝 Conventions

- ✅ Utiliser `set -e` pour arrêter en cas d'erreur
- ✅ Ajouter des messages informatifs (`echo`)
- ✅ Valider les arguments si nécessaire
- ✅ Documenter les variables d'environnement requises
- ❌ Ne jamais commiter de secrets/tokens

---

**Dernière mise à jour** : 2025-11-27
