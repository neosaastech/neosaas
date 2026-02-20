# Flux d'Authentification et Validation d'Email

Ce document décrit le processus d'inscription et de validation d'email mis en place pour sécuriser la création de compte.

## Vue d'ensemble

Le système d'inscription a été modifié pour inclure une étape de validation obligatoire de l'adresse email avant de permettre l'accès complet à la plateforme.

## Étapes du Processus

### 1. Inscription (`/auth/register`)
1. L'utilisateur remplit le formulaire d'inscription (Email, Mot de passe, Username).
2. L'API `/api/auth/register` est appelée.
3. **Vérifications** :
   - Unicité de l'email et du username.
   - Complexité du mot de passe.
4. **Création du Compte** :
   - L'utilisateur est créé en base de données avec `isActive: true` mais sans session active.
   - Une entreprise par défaut est créée pour l'utilisateur.
5. **Génération du Token** :
   - Un token unique est généré (actuellement via `crypto.randomBytes`).
   - Le token est stocké dans la table `verificationTokens` avec une expiration.
6. **Envoi de l'Email** :
   - Un email est envoyé via le `emailRouter` (utilisant le provider configuré, ex: Scaleway TEM).
   - Le template `registration` est utilisé.
   - L'email contient un lien vers `/auth/verify?token=...&email=...`.

### 2. Validation (`/auth/verify`)
1. L'utilisateur clique sur le lien dans l'email.
2. La page `/auth/verify` est chargée avec les paramètres `token` et `email`.
3. **Vérification** :
   - Le système cherche le token dans la base de données correspondant à l'email et vérifie qu'il n'a pas expiré.
4. **Activation** :
   - Si valide, le champ `emailVerified` de l'utilisateur est mis à jour avec la date actuelle.
   - Le token est supprimé de la base de données pour éviter une réutilisation.
5. **Connexion Automatique** :
   - Une session JWT est créée pour l'utilisateur.
   - Le cookie d'authentification est défini.
6. **Redirection** :
   - L'utilisateur est redirigé vers `/dashboard/profile` pour compléter ses informations (Nom, Prénom, etc.).

## Configuration Requise

### Base de Données
Le schéma doit inclure :
- Table `users` avec colonne `emailVerified`.
- Table `verificationTokens`.

### Templates Email
Le template `registration` doit être actif et contenir la variable `{{actionUrl}}` qui sera remplacée par le lien de validation.

## Dépannage

- **Email non reçu** : Vérifier les logs du `emailRouter` et la configuration du provider (Scaleway TEM).
- **Lien invalide** : Le token a peut-être expiré ou a déjà été utilisé.
- **Redirection boucle** : Vérifier les cookies du navigateur et la configuration `NEXTAUTH_URL`.
