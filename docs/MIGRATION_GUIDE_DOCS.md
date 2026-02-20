# 🗂️ Guide de Migration Documentation

> **Instructions pour consolider les fichiers .md de la racine vers /docs**

---

## 📊 Fichiers à Déplacer

### De la Racine → docs/

| Fichier Racine | Nouvelle Location | Action |
|----------------|-------------------|--------|
| `GITHUB_OAUTH_README.md` | `docs/archive/legacy/GITHUB_OAUTH_README.md` | ✅ Archiver |
| `GITHUB_OAUTH_TROUBLESHOOTING.md` | `docs/oauth/github/TROUBLESHOOTING.md` | ✅ Migrer & Consolider |
| `INTEGRATION_GITHUB_OAUTH_COMPLETE.md` | `docs/archive/legacy/INTEGRATION_GITHUB_OAUTH_COMPLETE.md` | ✅ Archiver |
| `MIGRATION_GUIDE_GITHUB_OAUTH.md` | `docs/archive/legacy/MIGRATION_GUIDE_GITHUB_OAUTH.md` | ✅ Archiver |
| `CORRECTIONS_OAUTH_APPLIQUEES.md` | ✅ Contenu ajouté dans `OAUTH_FIXES_SUMMARY.md` | 🗑️ Supprimer après |
| `INDEX.md` | ✅ Remplacé par `docs/00-START-HERE.md` | 🗑️ Supprimer après |
| `STATUS.md` | ✅ Remplacé par `docs/STATUS.md` | 🗑️ Supprimer après |
| `INSTRUCTIONS_RAPIDES.md` | `docs/archive/legacy/INSTRUCTIONS_RAPIDES.md` | ✅ Archiver |
| `PREPARATION_GUIDE.md` | `docs/archive/legacy/PREPARATION_GUIDE.md` | ✅ Archiver |
| `PRE_PUSH_CHECKLIST.md` | `docs/guides/PRE_PUSH_CHECKLIST.md` | ✅ Migrer |
| `SECURITY_WARNING.md` | `docs/guides/SECURITY.md` | ✅ Migrer & Consolider |
| `PATCHES_TODO.md` | `docs/archive/PATCHES_TODO.md` | ✅ Archiver |

---

## 🎯 Actions à Effectuer

### 1. Créer Dossier Archive

```bash
mkdir -p docs/archive/legacy
```

### 2. Déplacer Fichiers Legacy

```bash
# GitHub OAuth legacy
mv GITHUB_OAUTH_README.md docs/archive/legacy/
mv INTEGRATION_GITHUB_OAUTH_COMPLETE.md docs/archive/legacy/
mv MIGRATION_GUIDE_GITHUB_OAUTH.md docs/archive/legacy/

# Setup legacy
mv INSTRUCTIONS_RAPIDES.md docs/archive/legacy/
mv PREPARATION_GUIDE.md docs/archive/legacy/

# Patches archive
mv PATCHES_TODO.md docs/archive/
```

### 3. Consolider Fichiers

**GITHUB_OAUTH_TROUBLESHOOTING.md** → Existe déjà dans docs/, créer une version github/ :

Le contenu sera intégré dans `docs/oauth/github/TROUBLESHOOTING.md`

**PRE_PUSH_CHECKLIST.md** → Migrer vers guides/ :

```bash
mv PRE_PUSH_CHECKLIST.md docs/guides/
```

**SECURITY_WARNING.md** → Consolider dans guides/ :

Créer `docs/guides/SECURITY.md` avec contenu consolidé

### 4. Supprimer Doublons

**Une fois vérification faite** :

```bash
# Ces fichiers sont maintenant dans docs/
rm INDEX.md  # → docs/00-START-HERE.md
rm STATUS.md  # → docs/STATUS.md
rm CORRECTIONS_OAUTH_APPLIQUEES.md  # → Contenu dans docs/OAUTH_FIXES_SUMMARY.md
```

---

## ✅ Nouvelle Structure

### docs/ (Après Migration)

```
docs/
├── 00-START-HERE.md ⭐         # Point d'entrée principal
├── STATUS.md                   # État projet
├── ARCHITECTURE.md             # Architecture
├── OAUTH_INDEX.md              # Index OAuth
├── OAUTH_ACTION_REQUIRED.md    # Migration OAuth
├── OAUTH_ARCHITECTURE.md
├── OAUTH_DUPLICATES_AUDIT.md
├── OAUTH_MIGRATION_PLAN.md
├── OAUTH_GOOGLE_SETUP.md
├── OAUTH_FIXES_SUMMARY.md
│
├── setup/                      # Installation
│   ├── QUICK_START.md
│   ├── INSTALLATION.md
│   └── ENVIRONMENT.md
│
├── oauth/                      # OAuth complet
│   ├── README.md
│   ├── github/
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── TROUBLESHOOTING.md
│   │   └── ARCHITECTURE_V3.md
│   └── google/
│       ├── README.md
│       └── SETUP.md
│
├── deployment/                 # Déploiement
│   ├── VERCEL.md
│   ├── DATABASE_RESET.md
│   └── ENVIRONMENT_VARIABLES.md
│
├── guides/                     # Guides pratiques
│   ├── PRE_PUSH_CHECKLIST.md
│   ├── SECURITY.md
│   └── ...
│
├── architecture/               # Architecture
│   └── ...
│
├── modules/                    # Modules
│   └── ...
│
├── troubleshooting/            # Dépannage
│   └── ...
│
└── archive/                    # Archives
    ├── PATCHES_TODO.md
    └── legacy/
        ├── GITHUB_OAUTH_README.md
        ├── INTEGRATION_GITHUB_OAUTH_COMPLETE.md
        ├── MIGRATION_GUIDE_GITHUB_OAUTH.md
        ├── INSTRUCTIONS_RAPIDES.md
        └── PREPARATION_GUIDE.md
```

### Racine/ (Après Nettoyage)

```
README.md                       # Documentation utilisateur
CHANGELOG.md                    # Historique versions
.env.example                    # Template ENV
package.json                    # Dépendances
...                             # Fichiers projet uniquement
```

---

## 📝 Checklist Migration

### Préparation
- [x] ✅ Créer structure docs/ avec sous-dossiers
- [x] ✅ Créer 00-START-HERE.md
- [x] ✅ Créer STATUS.md consolidé
- [x] ✅ Créer oauth/README.md
- [x] ✅ Créer setup/QUICK_START.md
- [x] ✅ Créer deployment/VERCEL.md

### Migration
- [ ] Créer archive/legacy/
- [ ] Déplacer fichiers legacy
- [ ] Créer oauth/github/TROUBLESHOOTING.md
- [ ] Déplacer PRE_PUSH_CHECKLIST.md → guides/
- [ ] Créer guides/SECURITY.md

### Nettoyage
- [ ] Vérifier tous les liens dans docs/
- [ ] Supprimer INDEX.md racine
- [ ] Supprimer STATUS.md racine
- [ ] Supprimer CORRECTIONS_OAUTH_APPLIQUEES.md
- [ ] Mettre à jour README.md racine

### Validation
- [ ] Tous les liens fonctionnent
- [ ] Navigation cohérente
- [ ] Pas de fichiers orphelins
- [ ] Git commit

---

## 🔗 Mise à Jour des Liens

### README.md (Racine)

Mettre à jour les liens pour pointer vers docs/ :

```markdown
📖 **Documentation** : [docs/00-START-HERE.md](./docs/00-START-HERE.md)
⚠️ **Migration OAuth** : [docs/OAUTH_ACTION_REQUIRED.md](./docs/OAUTH_ACTION_REQUIRED.md)
```

### Fichiers docs/

Vérifier que tous les liens relatifs sont corrects :

```markdown
# Bon
[OAUTH_INDEX.md](./OAUTH_INDEX.md)
[setup/QUICK_START.md](./setup/QUICK_START.md)

# Mauvais (ne marchera plus)
[OAUTH_INDEX.md](../OAUTH_INDEX.md) # si dans docs/
```

---

## ⚡ Script Automatisation (Optionnel)

```bash
#!/bin/bash
# migrate-docs.sh

echo "🚀 Migration documentation..."

# Créer archives
mkdir -p docs/archive/legacy

# Déplacer legacy
mv GITHUB_OAUTH_README.md docs/archive/legacy/
mv INTEGRATION_GITHUB_OAUTH_COMPLETE.md docs/archive/legacy/
mv MIGRATION_GUIDE_GITHUB_OAUTH.md docs/archive/legacy/
mv INSTRUCTIONS_RAPIDES.md docs/archive/legacy/
mv PREPARATION_GUIDE.md docs/archive/legacy/

# Déplacer guides
mv PRE_PUSH_CHECKLIST.md docs/guides/

# Archiver patches
mv PATCHES_TODO.md docs/archive/

echo "✅ Migration terminée!"
echo "⚠️  Vérifier les liens avant de supprimer les doublons"
```

---

## 📞 Questions ?

Si un fichier ne sait pas où aller :
1. Vérifier son contenu
2. S'il est obsolète → `archive/legacy/`
3. S'il est actuel → trouver catégorie appropriée
4. Si hésitation → conserver temporairement

---

**Statut** : ✅ Structure créée, prêt pour migration manuelle
