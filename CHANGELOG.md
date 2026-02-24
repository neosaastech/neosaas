# Changelog

Toutes les modifications notables de **NeoSaaS Tech** sont documentées ici.

Ce fichier est généré automatiquement par [release-please](https://github.com/googleapis/release-please) à chaque push sur la branche `freenium`.

Le format suit [Keep a Changelog](https://keepachangelog.com/) et le versioning respecte [Semantic Versioning](https://semver.org/) :

| Type de commit | Bump |
|----------------|------|
| `fix:` | **patch** — `1.3.1` → `1.3.2` |
| `feat:` | **minor** — `1.3.x` → `1.4.0` |
| `feat!:` ou `BREAKING CHANGE:` | **major** — `1.x.x` → `2.0.0` |
| `docs:`, `chore:`, `ci:` | aucun bump (cachés dans le changelog) |
| `refactor:`, `perf:` | aucun bump (visibles dans le changelog) |

---

## [1.3.1] — 2026-02-23

### ✨ Nouvelles fonctionnalités
- Refonte page d'accueil orientée développeur : héro de bienvenue, stack technique, modules inclus, pages dynamiques à préserver
- Page documentation (`/docs`) : stack corrigé (JWT, Stripe Direct, Next.js 15), modules détaillés
- Page installation (`/docs/installation`) : 9 étapes, variables d'environnement par catégorie, section "Étapes suivantes développeur" (pages, Stripe, ACL)

### 🐛 Correctifs
- Suppression des données sensibles de la documentation (credentials BDD, Vercel team ID, noms de branches internes)

### ♻️ Refactoring
- Suppression page `/brand` et tous ses liens de navigation
- Remplacement des guides Vercel-spécifiques par un guide de déploiement générique (PaaS, VPS, Docker)
- Renommage NeoSaaS → NeoSaaS Tech dans tous les fichiers visibles
- Suppression de `@vercel/analytics` des dépendances

### 📖 Documentation
- `docs/deployment/DEPLOYMENT.md` : guide générique de déploiement
- `docs/setup/ENVIRONMENT.md` : nettoyé, provider-agnostique
- `docs/guides/TROUBLESHOOTING.md` : suppression des credentials réels
