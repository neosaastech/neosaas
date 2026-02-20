# Guide de Configuration du Site

Ce guide explique comment configurer les aspects globaux de votre site NeoSaaS via le panneau d'administration.

## Accès à la Configuration

1. Connectez-vous en tant qu'administrateur.
2. Accédez au tableau de bord administrateur (`/admin`).
3. Utilisez l'onglet **General Settings** pour la configuration de base et **SEO & Social** pour le référencement.

## Paramètres Disponibles

### 1. Configuration Générale

- **Site Name** : Le nom de votre plateforme, affiché dans la barre de titre et les emails.
- **Main Logo** : Votre logo (format SVG ou PNG recommandé).
- **Site Status (Mode Maintenance)** :
  - Activez ce mode pour bloquer l'accès public au site.
  - Seuls les administrateurs peuvent se connecter.
  - Les utilisateurs voient une page de maintenance personnalisée.
- **Google Tag Manager ID** :
  - Entrez votre ID GTM (ex: `GTM-XXXXXX`).
  - Le script sera automatiquement injecté sur toutes les pages.

### 2. Injection de Code Personnalisé

Vous pouvez ajouter du code HTML/JS/CSS personnalisé globalement :

- **Header Code** : Injecté dans la section `<head>` de chaque page.
  - Utile pour : Google Analytics, Meta Pixel, vérification de domaine, styles personnalisés.
  - Exemple : `<meta name="google-site-verification" content="..." />`
  
- **Footer Code** : Injecté juste avant la fermeture de la balise `</body>`.
  - Utile pour : Widgets de chat (Intercom, Crisp), scripts de tracking non critiques.
  - Exemple : `<script src="https://widget.crisp.chat/..."></script>`

### 3. SEO & Social

- **Site Title Template** : Format du titre des pages (ex: `%s | NeoSaaS`).
- **Base URL** : L'URL canonique de votre site.
- **Default Meta Description** : Description par défaut pour les moteurs de recherche.
- **Social Links** : Liens vers vos profils sociaux (Twitter, Facebook, LinkedIn, etc.).

## Sécurité

⚠️ **Attention** : L'injection de code personnalisé est puissante. N'ajoutez que du code provenant de sources de confiance. Un script malveillant pourrait compromettre la sécurité de vos utilisateurs.
