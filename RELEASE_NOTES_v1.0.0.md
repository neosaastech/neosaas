# NeoSaaS E-Commerce Services Platform

**Version 1.0.0** | Janvier 2026

---

## Concept

NeoSaaS est une plateforme SaaS complète conçue pour les **prestataires de services** souhaitant vendre en ligne :

- **Produits digitaux** (licences, fichiers, accès)
- **Produits physiques** (avec gestion des expéditions)
- **Rendez-vous & Consultations** (avec synchronisation calendrier)

Le modèle combine un **CMS headless**, un **système e-commerce**, et une **gestion client (CRM)** dans une architecture moderne Next.js 15+.

---

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEOSAAS v1.0.0                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   STORE     │  │  DASHBOARD  │  │    ADMIN    │             │
│  │  (Public)   │  │  (Client)   │  │  (Platform) │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                    ┌─────▼─────┐                                │
│                    │  CHECKOUT │                                │
│                    │  UNIFIED  │                                │
│                    └─────┬─────┘                                │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                     │
│    ┌────▼────┐     ┌─────▼─────┐    ┌────▼────┐                │
│    │  LAGO   │     │ CALENDARS │    │  EMAIL  │                │
│    │ Billing │     │ Sync      │    │ System  │                │
│    └─────────┘     └───────────┘    └─────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités Principales

### 1. Catalogue Produits (3 Types)

| Type | Description | Livraison |
|------|-------------|-----------|
| **Digital** | Licences, fichiers, accès | Instantanée (email + clé de licence) |
| **Physical** | Produits tangibles | Expédition avec tracking |
| **Appointment** | Consultations, RDV | Réservation créneau + sync calendrier |

**Caractéristiques communes :**
- Prix libre ou gratuit (`isFree: true`)
- TVA configurable par produit
- Images et descriptions riches
- Produits vedettes (featured)
- Upsell automatique

### 2. Tunnel d'Achat Unifié

```
Catalogue → Panier → Checkout → Paiement → Confirmation
                        │
                        ├── Produits digitaux : Clé de licence générée
                        ├── Produits physiques : Adresse de livraison
                        └── Rendez-vous : Sélection créneau horaire
```

**Points forts :**
- Panier persistant (cookie pour guests, DB pour users)
- Migration automatique panier guest → user à la connexion
- Checkout adaptatif selon les types de produits
- Support coupons de réduction

### 3. Système de Facturation (Lago)

**3 Modes de fonctionnement :**

| Mode | Description | Utilisation |
|------|-------------|-------------|
| **DEV** | Lago désactivé | Développement local |
| **TEST** | API Key sandbox | Recette / Staging |
| **PRODUCTION** | API Key live | Production |

**Fonctionnalités Lago :**
- Création automatique des customers
- Génération factures PDF
- Portail client pour gestion cartes
- Webhooks pour synchronisation paiements
- Support Stripe & PayPal

### 4. Gestion des Rendez-vous

- **Réservation en ligne** avec sélection de créneaux
- **Synchronisation bidirectionnelle** :
  - Google Calendar
  - Microsoft Outlook
- **Notifications automatiques** :
  - Email de confirmation client
  - Email de notification admin
  - Notification chat interne
- **Types** : Gratuit ou Payant (tarif horaire ou forfait)

### 5. Système de Notifications

| Événement | Client | Admin |
|-----------|--------|-------|
| Nouvelle commande | Email confirmation | Email + Chat |
| Produit digital | Email avec licence/lien | Email récapitulatif |
| Produit physique | - | Email "À expédier" |
| Rendez-vous créé | Email + ICS | Email + Chat |
| Expédition | Email tracking | - |

### 6. Dashboard Admin

**Métriques en temps réel :**
- Chiffre d'affaires total
- Nombre de commandes
- Abonnements actifs
- Entreprises clientes

**Graphiques :**
- Évolution revenus (6 mois)
- Inscriptions vs Activations
- Ventes par type de produit
- Top produits vendus

### 7. Gestion Multi-Utilisateurs (RBAC)

**Rôles Company :**
- `reader` : Lecture seule
- `writer` : Lecture + écriture

**Rôles Platform :**
- `admin` : Gestion plateforme
- `super_admin` : Accès complet

### 8. Authentification

- **Credentials** : Email + Mot de passe
- **OAuth** : GitHub, Google
- **Invitations** : Par email avec lien magique
- **JWT** : Tokens sécurisés avec refresh

---

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 15+ (App Router) |
| Base de données | PostgreSQL + Drizzle ORM |
| Authentification | JWT + OAuth 2.0 |
| UI Components | shadcn/ui + Tailwind CSS |
| Facturation | Lago (self-hosted ou cloud) |
| Emails | Multi-provider (Resend, Scaleway TEM, AWS SES) |
| Calendriers | Google Calendar API, Microsoft Graph |
| Hébergement | Vercel / Node.js |

---

## Structure du Projet

```
neosaas-website/
├── app/
│   ├── (private)/          # Pages authentifiées
│   │   ├── admin/          # Administration plateforme
│   │   └── dashboard/      # Dashboard client
│   ├── (public)/           # Pages publiques
│   │   └── store/          # Boutique en ligne
│   ├── api/                # Routes API
│   └── actions/            # Server Actions
├── components/
│   ├── admin/              # Composants admin
│   ├── store/              # Composants boutique
│   └── ui/                 # shadcn/ui
├── db/
│   └── schema.ts           # Schéma Drizzle
├── lib/
│   ├── auth/               # Authentification
│   ├── checkout/           # Tunnel d'achat
│   ├── lago.ts             # Client Lago
│   ├── email/              # Système emails
│   └── notifications/      # Notifications
└── docs/                   # Documentation
```

---

## Configuration Requise

### Variables d'environnement

```env
# Base de données
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# Lago (optionnel si mode DEV)
LAGO_API_URL=https://api.getlago.com/v1
LAGO_API_KEY=lago_live_xxx
LAGO_API_KEY_TEST=lago_test_xxx

# OAuth (optionnel)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Email (au moins un provider)
RESEND_API_KEY=xxx
# ou
SCALEWAY_SECRET_KEY=xxx
SCALEWAY_PROJECT_ID=xxx
```

### Configuration Base de Données (platform_config)

```sql
-- Lago
INSERT INTO platform_config (key, value) VALUES
  ('lago_mode', '"production"'),
  ('lago_stripe_enabled', 'true'),
  ('lago_paypal_enabled', 'false');

-- Email
INSERT INTO platform_config (key, value) VALUES
  ('email_provider', '"resend"'),
  ('default_sender_email', '"contact@votredomaine.com"');
```

---

## Installation

```bash
# Cloner le repository
git clone https://github.com/neosaastech/neosaas-website.git
cd neosaas-website

# Installer les dépendances
pnpm install

# Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# Initialiser la base de données
pnpm db:push
pnpm db:seed

# Lancer en développement
pnpm dev
```

---

## Changelog v1.0.0

### Nouvelles fonctionnalités
- Système e-commerce complet (3 types de produits)
- Intégration Lago avec 3 modes (Dev/Test/Production)
- Tunnel d'achat unifié avec gestion rendez-vous
- Synchronisation calendriers (Google, Outlook)
- Système de notifications multi-canal
- Dashboard admin avec analytics
- Génération automatique de clés de licence
- Support coupons de réduction
- OAuth GitHub & Google
- Système RBAC complet

### Architecture
- Next.js 15+ avec App Router
- PostgreSQL + Drizzle ORM
- Architecture modulaire extensible
- API RESTful + Server Actions

### Sécurité
- Cryptage AES-256-GCM pour credentials
- JWT avec refresh tokens
- OAuth 2.0 avec PKCE
- Validation Zod côté serveur

---

## Roadmap

### v1.1.0 (Prévu)
- [ ] Multi-devises dynamique
- [ ] Système d'abonnements récurrents
- [ ] Intégration Stripe Connect
- [ ] API publique documentée

### v1.2.0 (Prévu)
- [ ] Application mobile (React Native)
- [ ] Webhooks personnalisables
- [ ] Intégration comptable (exports)
- [ ] Multi-langues (i18n)

---

## Support

- **Documentation** : `/docs`
- **Issues** : GitHub Issues
- **Contact** : support@neosaas.tech

---

## Licence

Propriétaire - NeoSaaS Tech © 2026

---

*Built with Next.js, Lago, and shadcn/ui*
