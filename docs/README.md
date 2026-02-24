# 📚 Documentation NeoSaaS

Bienvenue dans la documentation complète de NeoSaaS. Cette documentation est organisée par catégories pour faciliter la navigation et la maintenance.

## 📖 Table des Matières

### � GitHub OAuth (NOUVEAU - 23/01/2026) 🆕

Documentation complète pour la configuration et le dépannage de GitHub OAuth :

**⭐ Commencez ici** :
- **[COMMENCEZ_ICI_GITHUB_OAUTH.md](./COMMENCEZ_ICI_GITHUB_OAUTH.md)** - 🎯 **POINT DE DÉPART** - Solution en 3 étapes (15 min)

**Guides de dépannage** :
- **[GITHUB_OAUTH_FIX_REDIRECT_URI.md](./GITHUB_OAUTH_FIX_REDIRECT_URI.md)** - ⚡ Correction rapide erreur redirect_uri (5 min)
- **[GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md](./GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md)** - 🔍 Guide complet de dépannage
- **[GITHUB_OAUTH_VERIFICATION_CHECKLIST.md](./GITHUB_OAUTH_VERIFICATION_CHECKLIST.md)** - ✅ Checklist interactive

**Documentation de référence** :
- **[GITHUB_OAUTH_INDEX.md](./GITHUB_OAUTH_INDEX.md)** - 📚 Index de toute la documentation OAuth
- **[RECAPITULATIF_DOCUMENTATION_OAUTH.md](./RECAPITULATIF_DOCUMENTATION_OAUTH.md)** - 📋 Récapitulatif de l'intervention du 23/01/2026
- **[SYNTHESE_DEPANNAGE_OAUTH_2026-01-23.md](./SYNTHESE_DEPANNAGE_OAUTH_2026-01-23.md)** - 📝 Synthèse technique de l'intervention

**Voir aussi** (racine du projet) :
- **[../GITHUB_OAUTH_TROUBLESHOOTING.md](../GITHUB_OAUTH_TROUBLESHOOTING.md)** - 🚀 Référence rapide

### �🚀 [Guides](./guides/)
Guides pratiques pour démarrer et utiliser NeoSaaS :

- **[Quick Start](./guides/QUICK_START.md)** - Démarrage rapide du projet
- **[Authentication & Onboarding](./AUTHENTICATION_ONBOARDING.md)** - Système d'authentification et onboarding utilisateur
- **[Authentication Setup](./guides/AUTHENTICATION_SETUP.md)** - Configuration de l'authentification
- **[Auto Database Setup](./guides/AUTO_DATABASE_SETUP.md)** - Configuration automatique de la base de données
- **[Automated Setup](./guides/SETUP_AUTOMATED.md)** - Setup automatisé complet
- **[Troubleshooting](./guides/TROUBLESHOOTING.md)** - Résolution des problèmes courants

### 🏗️ [Architecture](./architecture/)
Documentation technique sur l'architecture et les décisions de conception :

- **[Roles & Permissions System](./architecture/ROLES_PERMISSIONS_SYSTEM.md)** - Système de rôles et permissions
- **[Data Model](./architecture/DATA_MODEL.md)** - Modèle de données (Tables & Champs)

### � [E-Commerce & Admin](./admin/)
Système d'administration et e-commerce :

#### Interface Admin & UX 🎨
- **[Admin UX Patterns](./ADMIN_UX_PATTERNS.md)** - 🎯 Règles UX pour l'interface admin (Sheet vs Dialog, Tables, Formulaires)
- **[Admin Users & Companies Tables](./ADMIN_USERS_COMPANIES_TABLES.md)** - 👥🏢 Documentation des tableaux Users et Companies (tri, filtres, édition)
- **[Admin Tables Responsive Rules](./ADMIN_TABLES_RESPONSIVE_RULES.md)** - 📱 Règles responsive pour les tableaux admin
- **[Admin Notification System](./ADMIN_NOTIFICATION_SYSTEM.md)** - 🔔 Système de notifications par type de produit, assignation, timestamps 🆕

#### Personnalisation du Thème 🎨 🆕
- **[Theme Customization Summary](./THEME_CUSTOMIZATION_SUMMARY.md)** - 📋 Résumé exécutif du système de personnalisation
- **[Theme Customization System](./THEME_CUSTOMIZATION_SYSTEM.md)** - ⭐ Documentation complète du système de thème
- **[Theme Quick Start](./THEME_QUICK_START.md)** - 🚀 Guide de démarrage rapide (5 minutes)
- **[Theme Changelog](./THEME_CHANGELOG.md)** - 📝 Changelog et historique des versions

#### Gestion des Produits (v2.0 - Panneau Unifié) 🆕
- **[Products Summary](./PRODUCTS_SUMMARY.md)** - 📋 Résumé exécutif des modifications
- **[Products Unified Panel](./PRODUCTS_UNIFIED_PANEL.md)** - ⭐ Documentation complète du panneau unifié
- **[Products Unified Panel - Guide](./PRODUCTS_UNIFIED_PANEL_GUIDE.md)** - Guide visuel rapide du panneau
- **[Products Migration Guide](./PRODUCTS_MIGRATION_GUIDE.md)** - Guide technique de migration
- **[Products Changelog](./PRODUCTS_CHANGELOG.md)** - Changelog détaillé v2.0

#### Autres Fonctionnalités
- **[Status Badges System](./STATUS_BADGES_SYSTEM.md)** - Système de badges de statut réutilisables
- **[Products Table Improvements](./PRODUCTS_TABLE_IMPROVEMENTS.md)** - Améliorations du tableau (v1.0)
- **[Products Details Panel System](./PRODUCTS_DETAILS_PANEL_SYSTEM.md)** - Panel de détails (ancien - v1.0)
- **[Debugging & Logging System](./DEBUGGING_LOGGING_SYSTEM.md)** - Système de logs détaillés
- **[Checkout Flow](./CHECKOUT_FLOW.md)** - Documentation du tunnel d'achat avec Lago
- **[Checkout Testing System](./CHECKOUT_TESTING_SYSTEM.md)** - Système de test du tunnel d'achat
- **[Appointment Booking Checkout Flow](./APPOINTMENT_BOOKING_CHECKOUT_FLOW.md)** - 📅 Tunnel de vente avec prise de rendez-vous intégrée
- **[Upsell & Coupon System](./UPSELL_COUPON_SYSTEM.md)** - 💼🎟️ Système d'upsell et coupons de réduction
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - ✅ Résumé des implémentations récentes

### 🔐 [Conformité & Légal](./legal/)
Système de conformité RGPD et pages légales :

- **[RGPD & DPO System](./RGPD_DPO_SYSTEM.md)** - 🛡️ Système RGPD et gestion du Data Protection Officer (DPO)

### 🔑 [OAuth & Authentication](./oauth/)
Système d'authentification multi-providers avec architecture modulaire :

#### OAuth Architecture v2.0 (Multi-Provider) 🆕 ⭐
**Architecture modulaire pour GitHub, Google, Facebook, etc.**

- **[OAuth Architecture](./OAUTH_ARCHITECTURE.md)** - 🏗️ **Architecture complète multi-providers**
- **[Google OAuth Setup](./OAUTH_GOOGLE_SETUP.md)** - 📘 **Guide d'ajout de Google OAuth**

**Caractéristiques** :
- ✅ **Base Provider abstraite** - Code réutilisable pour tous les providers
- ✅ **GitHub & Google implémentés** - Prêts à l'emploi
- ✅ **Auto-détection domaine** - Fonctionne en local et production
- ✅ **Cryptage AES-256-GCM** - Credentials sécurisés en DB
- ✅ **Helpers partagés** - `handleOAuthUser()`, `verifyOAuthState()`
- ✅ **Registry centralisé** - Ajout facile de nouveaux providers

#### GitHub OAuth v3.0 (User Authentication - Latest) 🆕
**For authenticating end users with GitHub accounts**

- **[Architecture v3.0](./GITHUB_OAUTH_ARCHITECTURE_V3.md)** - ⭐ **Architecture complète avec cryptage AES-256-GCM**
- **[Complete Fix Changelog](./CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md)** - 📝 Changelog détaillé de la v3.0
- **[Audit Report](./AUDIT_GITHUB_OAUTH_2026-01-23.md)** - 🔍 Rapport d'audit complet
- **[Redirect URI Fix Guide](./GITHUB_OAUTH_REDIRECT_URI_FIX.md)** - 🔧 Guide de dépannage redirect_uri

**Corrections critiques (23/01/2026)** :
- ✅ Nom cookie `auth-token` unifié (fix page vide après connexion)
- ✅ Token JWT complet avec roles/permissions
- ✅ Auto-détection du domaine de production
- ✅ Cache désactivé sur toutes les routes API OAuth

#### GitHub API Integration (Server Monitoring - 2026-01-23) 🆕
**For server-side operations and GitHub activity monitoring**

- **[GitHub API Integration](./GITHUB_API_INTEGRATION.md)** - ⭐ **Complete guide for GitHub API monitoring**

**Features**:
- 📊 **Monitor GitHub events** (commits, PRs, issues, etc.)
- 📝 **Log GitHub activity** to `service_api_usage` table
- 🔍 **Track repository changes** and organization events
- 📈 **Historical analytics** of GitHub operations
- 🔐 **Encrypted PAT storage** (AES-256-GCM)
- 🔌 **GitHub API Client** with TypeScript support
- 🎯 **Server-side operations** (separate from user OAuth)

#### GitHub OAuth v2.0 (Archived)
- **[v2.0 Database Storage](./GITHUB_OAUTH_V2_BDD.md)** - Configuration BDD (avant cryptage unifié)
- **[Manual Setup Guide](./GITHUB_OAUTH_MANUAL_SETUP.md)** - Guide de configuration manuelle
- **[Quick Start](./GITHUB_OAUTH_QUICKSTART.md)** - Démarrage rapide
- **[Setup Summary](./GITHUB_OAUTH_SETUP_SUMMARY.md)** - Résumé de la configuration
- **[Auto Config](./GITHUB_OAUTH_AUTO_CONFIG.md)** - Configuration automatique
- **[Integration Guide](./GITHUB_OAUTH_INTEGRATION.md)** - Guide d'intégration
- **[URL Detection](./GITHUB_OAUTH_URL_DETECTION.md)** - Détection automatique d'URL
- **[Error Handling](./GITHUB_OAUTH_ERROR_HANDLING.md)** - Gestion des erreurs

#### 🔒 Key Features (Combined)
**GitHub OAuth (User Auth)**:
- ✅ **Cryptage AES-256-GCM** pour tous les credentials
- ✅ **Architecture unifiée** via `serviceApiRepository`
- ✅ **Logging complet** dans `service_api_usage`
- ✅ **Support multi-format** Client ID (Iv1., Ov1, Ov2, Ov23)
- ✅ **UX améliorée** (toasts, spinners, messages d'erreur clairs)
- ✅ **Monitoring & Metrics** intégrés

**GitHub API (Server Monitoring)**:
- ✅ **Personal Access Token** management
- ✅ **Event fetching** (user/org/repo)
- ✅ **Automated syncing** to database
- ✅ **Analytics queries** and reporting
- ✅ **TypeScript client** with full type safety

### 🔄 [Workflows](./workflows/)

- **[Deployment Status](./workflows/DEPLOYMENT_STATUS.md)** - Statut des déploiements

### 🔌 [API](./api/)
Documentation des endpoints API (à venir)

### 📝 [Decisions](./decisions/)
Architecture Decision Records (ADR) - Décisions techniques importantes (à venir)

## 🤝 Contribuer à la Documentation

### Structure des Documents

Lors de l'ajout de nouvelle documentation, respectez la structure suivante :

\`\`\`markdown
# Titre du Document

## Vue d'Ensemble
[Description brève du contenu]

## [Section 1]
[Contenu...]

## [Section 2]
[Contenu...]
\`\`\`

### Templates Disponibles

Utilisez les templates suivants pour créer de nouveaux documents :

- **ADR** : \`docs/decisions/YYYY-MM-DD-titre-decision.md\`
- **Guide** : \`docs/guides/NOM_DU_GUIDE.md\`
- **API** : \`docs/api/endpoint-name.md\`

### Bonnes Pratiques

1. ✅ Utilisez des titres descriptifs et hiérarchiques
2. ✅ Incluez des exemples de code quand pertinent
3. ✅ Maintenez les liens internes à jour
4. ✅ Ajoutez des captures d'écran si nécessaire
5. ✅ Datez les documents sensibles au temps (workflows, decisions)

## 🔍 Recherche

Pour trouver rapidement de l'information :

1. Utilisez la recherche GitHub (\`/\` puis tapez votre recherche)
2. Consultez le fichier correspondant à votre catégorie
3. Référez-vous à cette table des matières

## 📞 Support

Pour toute question ou suggestion concernant la documentation :
- Ouvrez une issue sur GitHub
- Contactez l'équipe de développement

---

**Dernière mise à jour** : 2026-01-08
