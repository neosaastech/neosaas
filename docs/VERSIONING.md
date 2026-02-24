# Modèle de Versioning — NeoSaaS Tech

> Versioning automatique basé sur les Conventional Commits · Branche `freenium`

---

## Vue d'ensemble

NeoSaaS Tech utilise **[release-please](https://github.com/googleapis/release-please)** (Google) pour automatiser le versioning sémantique sur la branche `freenium`.

À chaque push sur `freenium`, le workflow analyse les messages de commits depuis la dernière release et :
1. Détermine le type de bump (patch / minor / major)
2. Met à jour `package.json` et `.release-please-manifest.json`
3. Génère / met à jour `CHANGELOG.md`
4. Crée une **Pull Request de release** avec toutes ces modifications
5. Quand la PR est mergée, crée un **tag Git** et une **GitHub Release**
6. (Optionnel) Déclenche le build Docker avec le tag sémantique

---

## Règles de Bump

| Préfixe du commit | Bump | Exemple |
|-------------------|------|---------|
| `fix:` | **patch** | `1.3.1` → `1.3.2` |
| `feat:` | **minor** | `1.3.x` → `1.4.0` |
| `feat!:` ou corps contenant `BREAKING CHANGE:` | **major** | `1.x.x` → `2.0.0` |
| `docs:` `chore:` `ci:` `test:` | aucun bump | (cachés dans CHANGELOG) |
| `refactor:` `perf:` | aucun bump | (visibles dans CHANGELOG) |

---

## Convention de Messages de Commit

```
<type>[scope optionnel]: <description courte>

[corps optionnel]

[footer optionnel — BREAKING CHANGE: description]
```

### Exemples

```bash
# Patch bump
git commit -m "fix(auth): corriger la validation du token expiré"

# Minor bump
git commit -m "feat(admin): ajouter la gestion des coupons de réduction"

# Major bump (breaking change)
git commit -m "feat!: refactoriser l'API d'authentification

BREAKING CHANGE: le endpoint /api/auth/login retourne désormais
un objet {token, user} au lieu de {access_token}"

# Pas de bump (doc)
git commit -m "docs: mettre à jour le guide d'installation"

# Pas de bump (maintenance)
git commit -m "chore: mettre à jour les dépendances npm"
```

---

## Fichiers du Système

| Fichier | Rôle |
|---------|------|
| `.github/workflows/release-please.yml` | Workflow GitHub Actions — déclenché sur push `freenium` |
| `release-please-config.json` | Configuration (sections changelog, type release) |
| `.release-please-manifest.json` | Version courante (lu et mis à jour automatiquement) |
| `CHANGELOG.md` | Historique généré automatiquement |
| `package.json` `.version` | Mis à jour automatiquement par release-please |

---

## Sections du CHANGELOG

| Type | Section affichée |
|------|-----------------|
| `feat` | ✨ Nouvelles fonctionnalités |
| `fix` | 🐛 Correctifs |
| `perf` | ⚡ Performances |
| `refactor` | ♻️ Refactoring |
| `docs` | 📖 Documentation |
| `chore` `ci` `test` | (masqués) |

---

## Flux Complet

```
Push sur freenium
      │
      ▼
release-please analyse les commits
      │
      ├── feat: → minor bump
      ├── fix:  → patch bump
      └── feat! / BREAKING CHANGE → major bump
      │
      ▼
Crée / met à jour la PR "chore(main): release 1.x.x"
      │
      ▼
Développeur merge la PR
      │
      ▼
release-please crée le tag Git (v1.x.x) + GitHub Release
      │
      ▼
docker-on-release build & push ghcr.io/neosaastech/neosaas-app:v1.x.x
```

---

## Version Initiale

La version de départ sur `freenium` est **`1.3.1`** — définie dans `.release-please-manifest.json` et `package.json`.

---

## Branches Concernées

| Branche | Versioning | Notes |
|---------|-----------|-------|
| `freenium` | ✅ Automatique (release-please) | Version publique du boilerplate |
| `main` / `master` | Manuel | Développement interne |
| `claude/*` | Non | Branches de session |
