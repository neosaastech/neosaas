# Changelog

Toutes les modifications notables du boilerplate NeoSaaS seront documentées ici.

## [Unreleased]

## [1.0.8] - 2026-07-08

### Fixed
- Avatar utilisateur et logo entreprise effacés du header en moins d'une seconde (cache `localStorage` qui écrasait l'état chargé depuis l'API)
- Logo entreprise absent de la liste des entreprises et de la fiche d'édition admin (champ `logo` oublié dans le mapping de `getCompanies()`)
- Recadrage d'image incohérent selon les écrans — composant partagé (`CroppedFileInput`) branché sur les 5 sélecteurs d'image (avatar profil, logo entreprise self-service + admin, avatar utilisateur création/édition admin)
- Upload d'avatar admin (création/édition d'utilisateur) purement cosmétique — jamais réellement persisté côté serveur ; nouvel endpoint `/api/admin/users/[userId]/profile-image`
- "Send Test" (Mail Management) envoyait le HTML/sujet brut sans substituer les variables — `{{firstName}}` etc. arrivaient littéralement dans l'email de test
- Emails réellement envoyés (inscription, reset mot de passe) utilisaient des types de templates absents de l'UI admin — `password_reset` en particulier échouait silencieusement, aucun email n'était envoyé
- 4 templates email commerce (commande physique/digitale/abonnement, paiement) totalement absents en base
- Sujet des emails commande/paiement toujours écrasé par une chaîne codée en dur, empêchant toute modification via l'UI admin
- Variables proposées dans le picker de l'UI mail ne correspondant pas à celles réellement substituées par le code d'envoi (par type de template désormais)
- Notification de changement d'email jamais envoyée (appel `sendEmail()` malformé)
- Variables dynamiques (`{{siteName}}` etc.) non résolues dans le corps des articles de blog, contrairement aux pages

## [1.0.7] - 2026-07-07

### Fixed
- Build ne wipe plus la base de données par défaut (`db:migrate` additif, `db:hard-reset` opt-in explicite)
- Logout ne laissait jamais expirer le cookie de session (domaine + double `Set-Cookie` qui s'écrasait)
- Mécanisme "Appliquer le correctif" (mise à jour des sites filles) : sélection de version fiable (`releases/latest` au lieu de `tags`), déploiement Vercel confirmé via Deploy Hook + polling au lieu du seul webhook Git
- Credentials du mécanisme de mise à jour configurables par site depuis `admin/api` (pas de variables d'environnement à poser à la main)

### Added
- Cloche de notifications visible pour tous les utilisateurs de l'espace privé (auparavant réservée aux admins)
