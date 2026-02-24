# Organisation de la Page Admin Settings

> **Dernière mise à jour :** 2 janvier 2026  
> **Auteur :** Système  
> **Objectif :** Documentation de la structure et organisation de la page `/admin/settings`

---

## 📋 Vue d'ensemble

La page **Admin > Settings** est organisée en **3 onglets principaux** :
1. **General** - Configuration générale du site
2. **System Logs** - Journaux système
3. **Pages ACL** - Contrôle d'accès aux pages

## Structure de l'onglet General

L'onglet "General" est organisé en **modules logiques indépendants** pour une meilleure cohérence et lisibilité.

### 1. Site Configuration

**Module** : Configuration de base du site

**Contenu** :
- **Site Name** - Nom de la plateforme
- **Site URL** - URL publique de l'application
- **Contact Email** - Email par défaut pour les envois système
- **GDPR Contact Name** - Nom du DPO ou de l'entreprise pour les documents légaux
- **Main Logo** - Logo du site avec cropping tool
  - Modes d'affichage : Logo seul, Texte seul, Logo + Texte
  - Upload avec prévisualisation
  - Support SVG, PNG, JPEG
- **Admin Footer Copyright** - Texte du pied de page de l'admin

**Auto-sauvegarde** : ✅ Toutes les modifications sont sauvegardées automatiquement après 1,5 seconde

---

### 2. Site Status

**Module** : Contrôle de la disponibilité du site et de la sécurité HTTPS

**Contenu** :

#### A. Maintenance Mode
- **État visuel** :
  - 🟢 Vert animé = Site Live
  - 🟠 Orange animé = Maintenance Mode Active
- **Bouton toggle** :
  - "Enable Maintenance" (vert) → Active le mode maintenance
  - "Go Live" (rouge) → Désactive le mode maintenance
- **Sauvegarde immédiate** : Le toggle sauvegarde instantanément

#### B. HTTPS Configuration
- **État par défaut** : ✅ **Force HTTPS activé** (recommandé)
- **État visuel** :
  - 🟢 Vert animé = HTTPS forcé (HTTP → HTTPS redirect)
  - ⚪ Gris = HTTP et HTTPS autorisés
- **Bouton toggle** :
  - "Disable Force HTTPS" (outline) → Désactive le forçage HTTPS
  - "Force HTTPS" (vert) → Active le forçage HTTPS
- **Message de recommandation** : Affiché quand HTTPS est forcé
- **Auto-sauvegarde** : ✅ Modifications sauvegardées automatiquement

---

### 3. SEO Metadata

**Module indépendant** : Configuration des métadonnées SEO du site

**Contenu** :
- **Site Title Template** - Template du titre de page (utiliser `%s` pour le titre de la page)
  - Exemple : `%s | NeoSaaS`
- **Base URL** - URL de base pour les métadonnées
  - Exemple : `https://neosaas.com`
- **Default Meta Description** - Description par défaut pour les pages sans description spécifique

**Auto-sauvegarde** : ✅ Toutes les modifications sont sauvegardées automatiquement

---

### 4. Custom Code Injection

**Module** : Injection de code personnalisé et configuration des en-têtes HTTP

**Contenu** :

#### A. Google Tag Manager
- **Google Tag Manager ID** - Champ avec validation en temps réel
  - Format attendu : `GTM-XXXXXXX`
  - ✅ Validation visuelle (icône verte) si format correct
  - ❌ Validation visuelle (icône rouge) si format incorrect
  - Message de validation affiché sous le champ
- **Injection automatique** : Le script GTM est automatiquement injecté dans toutes les pages

#### B. Header Code
- **Zone de texte** : Code HTML/JavaScript à injecter dans le `<head>`
- Placeholder : Exemple Google Analytics
- Format : `font-mono text-xs` pour le code
- **Auto-sauvegarde** : ✅

#### C. Footer Code
- **Zone de texte** : Code HTML/JavaScript à injecter avant `</body>`
- Placeholder : Exemple widget de chat
- Format : `font-mono text-xs` pour le code
- **Auto-sauvegarde** : ✅

#### D. Custom HTTP Headers
- **Zone de texte** : Configuration des en-têtes HTTP au format JSON
- **Validation** : Format JSON requis
- **Exemples d'en-têtes de sécurité** :
  - `X-Frame-Options` : Prévient le clickjacking
  - `X-Content-Type-Options` : Prévient le MIME sniffing
  - `Strict-Transport-Security` : Force HTTPS
  - `Content-Security-Policy` : Contrôle le chargement des ressources
  - `Referrer-Policy` : Contrôle les informations de référence
  - `Permissions-Policy` : Contrôle les fonctionnalités du navigateur

**Warning** : ⚠️ Des en-têtes incorrects peuvent casser le site. Tester avec précaution.

**Auto-sauvegarde** : ✅

---

### 5. Social Sharing & Links

**Module indépendant** : Configuration Open Graph et liens sociaux

**Contenu** :

#### A. Open Graph Metadata
- **OG Title** - Titre pour le partage sur les réseaux sociaux
- **OG Description** - Description pour le partage
- **OG Image** - Image de partage (1200x630px recommandé)
  - Upload avec prévisualisation
  - Max 2MB
  - Formats : PNG, JPEG, WebP
  - Bouton de suppression si image présente

#### B. Social Media Links
Liens vers les profils sociaux (utilisés dans le footer public) :
- **Twitter / X**
- **Facebook**
- **LinkedIn**
- **Instagram**
- **GitHub**

**Auto-sauvegarde** : ✅ Toutes les modifications sont sauvegardées automatiquement

---

## Organisation logique

### Avant (structure non optimale)

```
┌─────────────────────────────┐
│ Site Configuration          │
│  ├─ Infos de base           │
│  ├─ Logo                    │
│  ├─ SEO Metadata ❌         │ ← SEO mélangé avec config
│  └─ HTTPS Config ❌         │ ← HTTPS mélangé avec config
├─────────────────────────────┤
│ Site Status                 │
│  ├─ Maintenance Mode        │
│  └─ GTM Code                │
├─────────────────────────────┤
│ Custom Code Injection       │
│  ├─ Header Code             │
│  └─ Footer Code             │
├─────────────────────────────┤
│ Custom HTTP Headers ❌      │ ← Module séparé
│  ├─ Headers Config          │
│  ├─ Social Sharing ❌       │ ← Social mélangé avec headers
│  └─ Social Links ❌         │
└─────────────────────────────┘
```

### Après (structure optimisée)

```
┌─────────────────────────────┐
│ 1. Site Configuration       │
│  ├─ Site Name, URL, Email   │
│  ├─ GDPR Contact            │
│  ├─ Logo + Display Mode     │
│  └─ Admin Footer Copyright  │
├─────────────────────────────┤
│ 2. Site Status              │
│  ├─ Maintenance Mode        │
│  └─ HTTPS Configuration ✅  │ ← Déplacé ici (logique)
├─────────────────────────────┤
│ 3. SEO Metadata ✅          │ ← Module indépendant
│  ├─ Title Template          │
│  ├─ Base URL                │
│  └─ Meta Description        │
├─────────────────────────────┤
│ 4. Custom Code Injection    │
│  ├─ GTM Code                │
│  ├─ Header Code             │
│  ├─ Footer Code             │
│  └─ HTTP Headers ✅         │ ← Intégré ici (cohérence)
├─────────────────────────────┤
│ 5. Social Sharing & Links ✅│ ← Module indépendant
│  ├─ Open Graph (OG)         │
│  │  ├─ OG Title             │
│  │  ├─ OG Description       │
│  │  └─ OG Image             │
│  └─ Social Media Links      │
│     ├─ Twitter, Facebook    │
│     ├─ LinkedIn, Instagram  │
│     └─ GitHub               │
└─────────────────────────────┘
```

---

## Améliorations apportées

### ✅ 1. Meilleure cohérence
- **HTTPS Configuration** déplacé dans "Site Status" (lié à la disponibilité du site)
- **Custom HTTP Headers** intégré dans "Custom Code Injection" (toutes les injections au même endroit)
- **SEO Metadata** est maintenant un module indépendant et visible
- **Social Sharing & Links** est un module indépendant dédié

### ✅ 2. HTTPS par défaut activé
- `forceHttps` passe de `false` à `true` par défaut
- Amélioration de la sécurité dès l'installation
- Message de recommandation affiché

### ✅ 3. Modules clairement définis
Chaque module a une responsabilité unique et claire :
1. **Configuration** = Identité du site
2. **Status** = Disponibilité et sécurité
3. **SEO** = Référencement
4. **Code Injection** = Scripts et en-têtes personnalisés
5. **Social** = Partage et présence sociale

### ✅ 4. Navigation facilitée
- Moins de scroll nécessaire
- Sections logiquement organisées
- Titres et icônes descriptifs

---

## Auto-sauvegarde

### Système de sauvegarde automatique

**Délai** : 1,5 seconde après la dernière modification

**Indicateur de statut** (en haut à droite) :
- 🔄 **Saving...** - Sauvegarde en cours
- ☁️ **Saved** (vert) - Sauvegarde réussie
- ☁️ **Unsaved changes** (orange) - Modifications non sauvegardées
- ☁️ **Save failed** (rouge) - Erreur de sauvegarde

**Exceptions** : Certaines actions déclenchent une sauvegarde immédiate :
- Upload de logo
- Upload d'image OG
- Toggle Maintenance Mode

---

## Fichiers concernés

### Pages
- `app/(private)/admin/settings/page.tsx` - Page principale des paramètres

### Composants
- `components/admin/pages-settings.tsx` - Gestion des ACL pages
- `app/(private)/admin/logs/logs-client.tsx` - Client pour les logs système

### API
- `app/api/admin/config/route.ts` - Endpoint de configuration

### Base de données
- Table `platform_config` - Stockage de la configuration
- Colonne `config_key` - Clé de configuration
- Colonne `config_value` - Valeur de configuration

---

## Exemples de configuration

### HTTPS Configuration

```typescript
// Par défaut activé
const [forceHttps, setForceHttps] = useState(true)

// Sauvegardé automatiquement après toggle
onClick={() => setForceHttps(!forceHttps)}
```

### Custom HTTP Headers

```json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}
```

### SEO Metadata

```typescript
const seoSettings = {
  titleTemplate: "%s | NeoSaaS",
  baseUrl: "https://neosaas.com",
  description: "The ultimate solution for your SaaS application.",
  ogTitle: "NeoSaaS - Modern Admin Dashboard",
  ogDescription: "The ultimate solution for your SaaS application.",
  ogImage: "/og-image.jpg"
}
```

---

## Documentation connexe

- [HTTP Headers Configuration](./HTTP_HEADERS_CONFIG.md)
- [GTM Configuration](./GTM_CONFIGURATION.md)
- [Admin Responsive Design](./ADMIN_RESPONSIVE_DESIGN.md)
- [Security Best Practices](./SECURITY-BEST-PRACTICES.md)

---

## Changelog

### 2 janvier 2026
- ✅ Fusion HTTPS Configuration dans Site Status
- ✅ Intégration Custom HTTP Headers dans Custom Code Injection
- ✅ Création module indépendant SEO Metadata
- ✅ Création module indépendant Social Sharing & Links
- ✅ HTTPS forcé par défaut
- ✅ Amélioration de l'organisation logique des modules
