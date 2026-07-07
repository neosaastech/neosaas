# Changelog

Toutes les modifications notables du boilerplate NeoSaaS seront documentées ici.

## [Unreleased]

## [1.0.7] - 2026-07-07

### Fixed
- Build ne wipe plus la base de données par défaut (`db:migrate` additif, `db:hard-reset` opt-in explicite)
- Logout ne laissait jamais expirer le cookie de session (domaine + double `Set-Cookie` qui s'écrasait)
- Mécanisme "Appliquer le correctif" (mise à jour des sites filles) : sélection de version fiable (`releases/latest` au lieu de `tags`), déploiement Vercel confirmé via Deploy Hook + polling au lieu du seul webhook Git
- Credentials du mécanisme de mise à jour configurables par site depuis `admin/api` (pas de variables d'environnement à poser à la main)

### Added
- Cloche de notifications visible pour tous les utilisateurs de l'espace privé (auparavant réservée aux admins)
