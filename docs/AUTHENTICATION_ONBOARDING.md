# Système d'Authentification et Onboarding

## Vue d'Ensemble

Ce document décrit le flux d'authentification et le processus d'onboarding pour les nouveaux utilisateurs de NeoSaaS.

## Flux de Connexion

### 1. Page de Connexion
- **Route** : `/auth/login`
- **Fichier** : `app/auth/login/page.tsx`

### 2. Logique de Redirection après Connexion

Lors d'une connexion réussie, le système vérifie si l'utilisateur a une entreprise assignée :

```typescript
// Check if user needs onboarding (no company assigned)
if (!data.user.companyId) {
  router.push('/dashboard/company-management');
} else {
  // Redirect to dashboard
  router.push('/dashboard');
}
```

#### Scénario A : Première Connexion (Onboarding)
- **Condition** : `!data.user.companyId` (utilisateur sans entreprise)
- **Redirection** : `/dashboard/company-management`
- **Objectif** : Permettre à l'utilisateur de configurer son entreprise

#### Scénario B : Connexion Standard
- **Condition** : `data.user.companyId` existe
- **Redirection** : `/dashboard`
- **Objectif** : Accès au tableau de bord principal

## Page de Gestion d'Entreprise

### Route et Localisation
- **Route** : `/dashboard/company-management`
- **Fichier** : `app/(private)/dashboard/company-management/page.tsx`

### Fonctionnalités
1. **Configuration Entreprise** : Nom, informations légales, etc.
2. **Gestion des Membres** : Invitation et gestion des utilisateurs de l'entreprise
3. **Paramètres** : Configuration avancée de l'entreprise

## Flux d'Enregistrement

### 1. Page d'Inscription
- **Route** : `/auth/register`
- **Fichier** : `app/auth/register/page.tsx`
- **Redirection après succès** : `/auth/login?registered=true`

### 2. Validation Email
- **Route** : `/auth/verify`
- **Fichier** : `app/auth/verify/page.tsx`
- **Processus** : Validation du token envoyé par email

### 3. Première Connexion
Après validation de l'email, l'utilisateur se connecte et est automatiquement redirigé vers `/dashboard/company-management` pour configurer son entreprise.

## Invitation d'Utilisateurs

### Acceptation d'Invitation
- **Route** : `/auth/accept-invite`
- **Fichier** : `app/auth/accept-invite/page.tsx`
- **Redirection** : `/dashboard` (l'utilisateur rejoint une entreprise existante, donc pas besoin d'onboarding)

### Différence Clé
- **Nouvel utilisateur auto-enregistré** → Doit créer son entreprise → `/dashboard/company-management`
- **Utilisateur invité** → Rejoint une entreprise existante → `/dashboard`

## Pages Liées

### Autres Pages d'Authentification
- **Récupération de mot de passe** : `/auth/recover-password`
- **Réinitialisation de mot de passe** : `/auth/reset-password`

## Actions Backend

### Fichiers Importants
- `app/api/auth/login/route.ts` : API de connexion
- `app/api/auth/register/route.ts` : API d'enregistrement
- `app/actions/auth.ts` : Actions serveur d'authentification
- `app/actions/company-users.ts` : Gestion des membres d'entreprise

## Historique

### [2026-01-05] - Correction Redirection
- **Problème Identifié** : Redirection vers `/dashboard/enterprise` (404)
- **Correction** : Mise à jour vers `/dashboard/company-management`
- **Impact** : Les nouveaux utilisateurs peuvent maintenant accéder correctement à la page de configuration d'entreprise

## Diagramme de Flux

```
┌─────────────────┐
│  /auth/login    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│   Connexion API     │
└────────┬────────────┘
         │
         ▼
    ┌────────────────┐
    │ companyId ?    │
    └────┬───────┬───┘
         │       │
    Non  │       │  Oui
         │       │
         ▼       ▼
┌────────────────┐  ┌─────────────┐
│  /dashboard/   │  │ /dashboard  │
│  company-      │  │             │
│  management    │  │             │
└────────────────┘  └─────────────┘
```

## Points d'Attention

1. **Vérification companyId** : Critère principal pour déterminer si l'utilisateur a besoin d'onboarding
2. **Persistance des données** : Les informations utilisateur sont sauvegardées dans localStorage après connexion
3. **Gestion des rôles** : Les rôles sont affichés dans le toast de confirmation
4. **Mode Maintenance** : Les administrateurs peuvent se connecter même en mode maintenance

## Maintenance et Debugging

### Variables à Surveiller
- `data.user.companyId` : Détermine le flux de redirection
- `localStorage.user` : Données utilisateur côté client

### Logs Pertinents
- Connexion réussie : "Welcome back, {userName}!"
- Erreur de connexion : "Login failed" ou "An error occurred during login"

## Références

- [ACTION_LOG.md](./ACTION_LOG.md) - Historique des modifications
- [SECURITY-BEST-PRACTICES.md](./SECURITY-BEST-PRACTICES.md) - Bonnes pratiques de sécurité
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Résolution des problèmes
