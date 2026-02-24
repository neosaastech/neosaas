---
# 📚 Index Complet de la Documentation

**Date**: 16 février 2026
**Maintenue par**: Documentation System
**Dernière mise à jour**: 23 février 2026

---

## 🚀 Points d'Entrée Principaux

### Pour Nouveaux Développeurs
1. **Démarrage**: [00-START-HERE.md](./00-START-HERE.md) (5 min)
2. **Installation**: [setup/QUICK_START.md](./setup/QUICK_START.md) (5 min)
3. **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md) (15 min)
4. **FAQ**: [ADMIN_FAQ.md](./ADMIN_FAQ.md) (si existe) ou [troubleshooting/](./troubleshooting/)

### Pour Administrateurs
1. **État du Projet**: [STATUS.md](./STATUS.md) (5 min)
2. **Actions Actuelles**: [ACTIONS_SUMMARY.md](./ACTIONS_SUMMARY.md) (5 min)
3. **Configuration**: [config/](./config/) (varies)
4. **Déploiement**: [deployment/](./deployment/) (varies)

### Pour Monitoring/Ops
1. **Logs et Monitoring**: [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) (10 min)
2. **Activity Log**: [ACTION_LOG.md](./ACTION_LOG.md) (historique complet)
3. **Database**: [deployment/DATABASE_RESET.md](./deployment/DATABASE_RESET.md) (5 min)

---

## 📋 Documentation par Catégorie

### 🔐 OAuth & Authentification

#### Vue d'ensemble
- [GITHUB_OAUTH_ARCHITECTURE_V3.md](./GITHUB_OAUTH_ARCHITECTURE_V3.md) - Architecture unifiée ⭐
- [OAUTH_MIGRATION_PLAN.md](./OAUTH_MIGRATION_PLAN.md) - Plan de migration (critical)
- [OAUTH_ACTION_REQUIRED.md](./OAUTH_ACTION_REQUIRED.md) - Actions requises (priority)

#### Setup & Configuration
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Setup Google OAuth ⭐
- [GOOGLE_OAUTH_IMPLEMENTATION_SUMMARY.md](./GOOGLE_OAUTH_IMPLEMENTATION_SUMMARY.md) - Summary
- [OAUTH_ADMIN_SETTINGS_ACTIVATION.md](./OAUTH_ADMIN_SETTINGS_ACTIVATION.md) - Admin UI

#### Troubleshooting & Audit
- [GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md](./GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md) - Troubleshooting guide
- [CORRECTION_BUGS_OAUTH_2026-01-23.md](./CORRECTION_BUGS_OAUTH_2026-01-23.md) - Bugs fixes
- [CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md](./CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md) - Changelog complet
- [AUDIT_GITHUB_OAUTH_2026-01-23.md](./AUDIT_GITHUB_OAUTH_2026-01-23.md) - Complete audit report
- [OAUTH_DUPLICATES_AUDIT.md](./OAUTH_DUPLICATES_AUDIT.md) - Doublons identification

#### Guides Rapides
- [GITHUB_OAUTH_MANUAL_SETUP.md](./GITHUB_OAUTH_MANUAL_SETUP.md) - Manual setup (legacy)
- [GITHUB_OAUTH_TROUBLESHOOTING.md](./GITHUB_OAUTH_TROUBLESHOOTING.md) - Quick fix guide
- [SYNTHESE_DEPANNAGE_OAUTH_2026-01-23.md](./SYNTHESE_DEPANNAGE_OAUTH_2026-01-23.md) - Intervention summary

#### Authentification & Onboarding
- [AUTHENTICATION_ONBOARDING.md](./AUTHENTICATION_ONBOARDING.md) - Auth flow
- [ACTIONS_REQUISES_OAUTH.md](./ACTIONS_REQUISES_OAUTH.md) - Actions en français (if exists)
- [COMMENCEZ_ICI_GITHUB_OAUTH.md](./COMMENCEZ_ICI_GITHUB_OAUTH.md) - Démarrage OAuth (FR)

---

### 📊 Admin & Dashboard

#### Gestion API
- [ADMIN_API_MANAGEMENT.md](./ADMIN_API_MANAGEMENT.md) - API management system ⭐
- [ADMIN_API_HIERARCHICAL_SYSTEM_RECAP.md](./ADMIN_API_HIERARCHICAL_SYSTEM_RECAP.md) - Système hiérarchique
- [ADMIN_API_QUICK_OVERVIEW.md](./ADMIN_API_QUICK_OVERVIEW.md) - Quick overview

#### Dashboard & UX
- [ADMIN_DASHBOARD_ORGANIZATION.md](./ADMIN_DASHBOARD_ORGANIZATION.md) - Dashboard organization
- [ADMIN_RESPONSIVE_DESIGN.md](./ADMIN_RESPONSIVE_DESIGN.md) - Responsive rules
- [ADMIN_SETTINGS_ORGANIZATION.md](./ADMIN_SETTINGS_ORGANIZATION.md) - Settings organization
- [ADMIN_UX_PATTERNS.md](./ADMIN_UX_PATTERNS.md) - UX patterns

#### Fonctionnalités Admin
- [ADMIN_NOTIFICATION_SYSTEM.md](./ADMIN_NOTIFICATION_SYSTEM.md) - Notification system
- [ADMIN_SEARCH_SYSTEM.md](./ADMIN_SEARCH_SYSTEM.md) - Search system
- [ADMIN_SUPPORT_UNIFIED.md](./ADMIN_SUPPORT_UNIFIED.md) - Support unified

#### Tables & Data
- [ADMIN_USERS_COMPANIES_TABLES.md](./ADMIN_USERS_COMPANIES_TABLES.md) - Users/Companies tables
- [ADMIN_TABLES_RESPONSIVE_RULES.md](./ADMIN_TABLES_RESPONSIVE_RULES.md) - Table responsive rules
- [ADMIN_APPOINTMENT_REQUEST_SYSTEM.md](./ADMIN_APPOINTMENT_REQUEST_SYSTEM.md) - Appointment requests

---

### 🛒 E-Commerce & Checkout

#### Checkout Flow
- [APPOINTMENT_BOOKING_CHECKOUT_FLOW.md](./APPOINTMENT_BOOKING_CHECKOUT_FLOW.md) - Booking checkout
- [CHECKOUT_FLOW.md](./CHECKOUT_FLOW.md) - Main checkout flow
- [CHECKOUT_FLOW_FIX.md](./CHECKOUT_FLOW_FIX.md) - Flow fixes
- [CHECKOUT_BOOKING_SYSTEM.md](./CHECKOUT_BOOKING_SYSTEM.md) - Booking system

#### Paiements (Stripe Direct)
- [STRIPE_QUICK_START.md](./STRIPE_QUICK_START.md) - Setup rapide (clés, webhook, migrations)
- [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) - Architecture Stripe (customers, metadata, sync)
- [STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md) - Webhook `/api/stripe/webhook`

> ⚠️ Dans cette itération (16 fév. 2026), **Lago est retiré** de la version en cours. Les docs Lago restantes doivent être traitées comme legacy tant que non mises à jour.

#### Configuration & Testing
- [ECOMMERCE_SETUP.md](./ECOMMERCE_SETUP.md) - E-commerce setup
- [CHECKOUT_TESTING_SYSTEM.md](./CHECKOUT_TESTING_SYSTEM.md) - Testing system
- [BOOKING_TUNNEL_TESTING.md](./BOOKING_TUNNEL_TESTING.md) - Tunnel testing

#### Analysis
- [APPOINTMENT_CHECKOUT_ANALYSIS.md](./APPOINTMENT_CHECKOUT_ANALYSIS.md) - Checkout analysis

---

### 📧 Email & Notifications

- [EMAIL_SYSTEM_ARCHITECTURE.md](./EMAIL_SYSTEM_ARCHITECTURE.md) - Email architecture ⭐
- [EMAIL_TEMPLATES_SETUP.md](./EMAIL_TEMPLATES_SETUP.md) - Email templates
- [ADMIN_NOTIFICATION_SYSTEM.md](./ADMIN_NOTIFICATION_SYSTEM.md) - Notification system (see Admin section)

---

### 📅 Calendar & Appointments

- [CALENDAR_APPOINTMENTS_MODULE.md](./CALENDAR_APPOINTMENTS_MODULE.md) - Calendar module
- [APPOINTMENT_BOOKING_CHECKOUT_FLOW.md](./APPOINTMENT_BOOKING_CHECKOUT_FLOW.md) - Booking flow (see E-Commerce)

---

### 💳 Payments & Billing

#### Stripe Direct (actif)
- [STRIPE_QUICK_START.md](./STRIPE_QUICK_START.md) - Setup rapide : clés, webhook, mode test/live ⭐
- [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) - Architecture Stripe direct (customers, metadata, sync, invoices, subscriptions) ⭐
- [STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md) - Webhook `/api/stripe/webhook`

> ✅ **19 fév. 2026 — Facturation Invoice** : `processCheckout` utilise désormais `createStripeInvoicePayment` (InvoiceItems → Invoice → finalize → pay) au lieu d'un bare PaymentIntent. Les factures sont visibles dans le Dashboard Stripe avec PDF téléchargeable.

> ✅ **19 fév. 2026 — Gestion abonnements** : `app/actions/payments.ts` expose `getCompanySubscriptions`, `cancelSubscription`, `resumeSubscription`, `pauseSubscription`, `unpauseSubscription`. Le dashboard `/dashboard/payments` permet de gérer les abonnements (pause, résiliation, reprise) et télécharger les factures PDF.

#### Services & Config
- [SERVICE_API_MANAGEMENT.md](./SERVICE_API_MANAGEMENT.md) - API key management (Stripe, PayPal) — distinction test/prod
- [PRODUCTS_TYPE_SYSTEM.md](./PRODUCTS_TYPE_SYSTEM.md) - Product types + paymentType (subscription/one_time/hourly)
- [DIGITAL_PRODUCTS_PROCESS.md](./DIGITAL_PRODUCTS_PROCESS.md) - Digital products

#### Legacy (Lago — retiré 16 fév. 2026)
- [LAGO_CONFIGURATION.md](./LAGO_CONFIGURATION.md) - ⚠️ **Legacy** — remplacé par Stripe Direct

---

### 🚀 Deployment & DevOps

#### Guides Complets
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Main deployment guide ⭐
- [deployment/](./deployment/) - Deployment folder (see below)

#### Configuration
- [config/env/](./config/env/) - Environment configuration
- [config/seo/](./config/seo/) - SEO configuration

#### Database
- [MIGRATION_ARCHITECTURE.md](./MIGRATION_ARCHITECTURE.md) - Architecture 4 couches du pipeline de migration ⭐ **NEW**
- [deployment/DATABASE_RESET.md](./deployment/DATABASE_RESET.md) - Database reset mode
- [DATABASE_MIGRATION_ENCRYPTION.md](./DATABASE_MIGRATION_ENCRYPTION.md) - Encryption migration (if exists)

---

### 🔧 Development

#### Architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture générale ⭐
- [architecture/](./architecture/) - Architecture details

#### Debugging & Logging
- [DEBUGGING_LOGGING_SYSTEM.md](./DEBUGGING_LOGGING_SYSTEM.md) - Debugging guide
- [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) - Logging & monitoring ⭐

#### Setup
- [setup/QUICK_START.md](./setup/QUICK_START.md) - Installation rapide
- [setup/INSTALLATION.md](./setup/INSTALLATION.md) - Installation complète
- [setup/ENVIRONMENT.md](./setup/ENVIRONMENT.md) - Environment configuration

#### Guides
- [guides/](./guides/) - Step-by-step tutorials

---

### 📊 Monitoring & Status

#### Current Status
- [STATUS.md](./STATUS.md) - Current project status ⭐
- [ACTIONS_SUMMARY.md](./ACTIONS_SUMMARY.md) - Current actions ⭐
- [ACTION_LOG.md](./ACTION_LOG.md) - Complete activity log
- [CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md](./CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md) - Latest changelog

#### Monitoring
- [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) - Logs & monitoring ⭐

---

### 📚 Documentation Tools

#### CSV & Data
- [CSV_IMPORT_FORMAT.md](./CSV_IMPORT_FORMAT.md) - CSV import format

#### Process & Workflows
- [EXECUTER_MAINTENANT.md](./EXECUTER_MAINTENANT.md) - Actions to execute
- [CHANGELOG_ADMIN_API_HIERARCHICAL.md](./CHANGELOG_ADMIN_API_HIERARCHICAL.md) - API changelog

---

### 🔍 Audits & Analysis

- [AUDIT_DOUBLONS_GITHUB_OAUTH.md](./AUDIT_DOUBLONS_GITHUB_OAUTH.md) - OAuth duplicates audit
- [AUDIT_DOUBLONS_SYSTEME.md](./AUDIT_DOUBLONS_SYSTEME.md) - System duplicates audit
- [AUDIT_DOUBLONS_COMPLET_2026-01-08.md](./AUDIT_DOUBLONS_COMPLET_2026-01-08.md) - Complete audit
- [AUDIT_GITHUB_OAUTH_2026-01-23.md](./AUDIT_GITHUB_OAUTH_2026-01-23.md) - OAuth audit (recent)
- [AUDIT_GITHUB_OAUTH_2026-01-23.md](./AUDIT_GITHUB_OAUTH_2026-01-23.md) - OAuth audit (recent)

---

### ⚖️ Legal & Compliance

- [legal/](./legal/) - Legal documents (if folder exists)

---

## 📊 Archétype de Document

Chaque documentation devrait suivre ce format:

```markdown
# [Titre]

**Date**: YYYY-MM-DD
**Statut**: ✅ | ⏳ | ❌
**Temps de lecture**: X min

---

## 🎯 Vue d'ensemble
- Résumé 1-2 paragraphes
- Points clés

## 📋 Table des Matières
- Liens internes

## [Sections Principales]
- Détails

## 🔗 Documentation Associée
- Links

## ✅ Checklist
- Tasks

---

**Dernière mise à jour**: YYYY-MM-DD
```

---

## 📈 Statistiques Documentation

| Catégorie | Count | Statut |
|-----------|-------|--------|
| OAuth & Auth | 15 | ✅ Complète |
| Admin & Dashboard | 10 | ✅ Complète |
| E-Commerce | 7 | ✅ Complète |
| Email & Notifications | 2 | ✅ Complète |
| Calendar | 1 | ✅ Complète |
| Deployment | 4 | ✅ Complète |
| Development | 5 | ✅ Complète |
| Monitoring | 3 | ✅ Complète |
| Audits | 4 | ✅ Complète |
| **Total** | **51+** | **✅ Well-documented** |

---

## 🎯 Quick Navigation by Use Case

### "I need to..."

#### Setup & Installation
→ [00-START-HERE.md](./00-START-HERE.md) → [setup/QUICK_START.md](./setup/QUICK_START.md)

#### Understand OAuth
→ [GITHUB_OAUTH_ARCHITECTURE_V3.md](./GITHUB_OAUTH_ARCHITECTURE_V3.md) → [OAUTH_MIGRATION_PLAN.md](./OAUTH_MIGRATION_PLAN.md)

#### Configure Google OAuth
→ [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) → [OAUTH_ADMIN_SETTINGS_ACTIVATION.md](./OAUTH_ADMIN_SETTINGS_ACTIVATION.md)

#### Debug OAuth Issues
→ [GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md](./GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md) → [CORRECTION_BUGS_OAUTH_2026-01-23.md](./CORRECTION_BUGS_OAUTH_2026-01-23.md)

#### See Current Progress
→ [STATUS.md](./STATUS.md) → [ACTIONS_SUMMARY.md](./ACTIONS_SUMMARY.md) → [ACTION_LOG.md](./ACTION_LOG.md)

#### Monitor the System
→ [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) → [DEBUGGING_LOGGING_SYSTEM.md](./DEBUGGING_LOGGING_SYSTEM.md)

#### Deploy
→ [DEPLOYMENT.md](./DEPLOYMENT.md) → [deployment/DATABASE_RESET.md](./deployment/DATABASE_RESET.md)

---

## 📝 Maintenance Notes

### Regular Updates Needed
- [ACTION_LOG.md](./ACTION_LOG.md) - Update with new actions
- [STATUS.md](./STATUS.md) - Update statuses
- [ACTIONS_SUMMARY.md](./ACTIONS_SUMMARY.md) - Update progress

### Scheduled Reviews
- **Weekly**: ACTION_LOG updates, STATUS review
- **Bi-weekly**: ACTIONS_SUMMARY progress update
- **Monthly**: Complete audit of documentation accuracy

---

**Last Updated**: 20 février 2026
**Maintained By**: Documentation System
**Next Review**: À chaque itération (branche `claude/review-docs-setup-neIO5`)
