# Guide du Module Légal (DSA & RGPD)

Ce guide explique comment configurer et gérer les aspects légaux de votre plateforme NeoSaaS, incluant la conformité DSA (Digital Services Act) et RGPD.

## 1. Vue d'ensemble

Le module légal permet de :
- Gérer la page publique **Privacy Policy**.
- Configurer le **Popup de Consentement Cookies**.
- Désigner un **Responsable du Site** (Site Manager) dont l'identité légale sera affichée publiquement.
- Assurer la transparence requise par les régulations européennes.

## 2. Responsable du Site (Site Manager)

Pour être conforme au DSA, le site doit afficher clairement l'identité de la personne (physique ou morale) responsable de la publication.

### Comment désigner un Responsable du Site :
1. Accédez au **Dashboard Admin** > **Users**.
2. Trouvez l'utilisateur qui sera le responsable légal.
3. Cliquez sur le menu d'actions (...) à droite de la ligne.
4. Sélectionnez **"Set as Site Manager"**.
5. Un badge "Legal Rep." apparaîtra à côté de son rôle.

### Impact sur les pages publiques :
Une fois un Site Manager désigné, ses informations (Nom, Email, et potentiellement Adresse/Téléphone si renseignés dans son profil ou via la configuration globale) apparaîtront automatiquement dans la section "Contact / Legal Entity" des pages :
- `/legal/privacy`

> **Note** : Si aucun Site Manager n'est désigné, le système utilisera par défaut les informations de l'entreprise configurées dans les variables d'environnement ou la base de données.

## 3. Configuration du Consentement Cookies (RGPD)

Le site intègre un système complet de gestion du consentement aux cookies, conforme au RGPD et entièrement configurable depuis l'administration.

### Gestion Back-Office (Admin)
Accédez à **Admin > Legal** pour configurer le module.

#### Onglet "Configuration" :
1. **Enable Cookie Popup** : Activez ou désactivez globalement l'affichage du popup de consentement sur le site public.
2. **Show Logo** : Activez ou désactivez l'affichage du logo de votre site dans le popup pour renforcer votre image de marque.
3. **Consent Message** : Personnalisez le texte affiché aux visiteurs.
   - Vous pouvez utiliser le tag `{site_name}` qui sera remplacé dynamiquement par le nom de votre site.

#### Onglet "Consent Logs" :
1. **Suivi des Consentements** :
   - Visualisez l'historique complet des choix utilisateurs en temps réel.
   - Données collectées : Date, Adresse IP, Statut (Accepté/Refusé), User Agent.
2. **Export de Données** :
   - Utilisez le bouton **"Export CSV"** pour télécharger l'historique des consentements (indispensable en cas d'audit CNIL/RGPD).

### Fonctionnalités Front-End
- **Design** : Moderne, flottant et non-intrusif (Glassmorphism).
- **Affichage** : Uniquement sur les pages publiques (désactivé sur le Dashboard/Admin).
- **Fonctionnement** :
  - Apparaît lors de la première visite (si activé).
  - Permet d'accepter ou de refuser les cookies.
  - Mémorise le choix de l'utilisateur (via `localStorage`).
  - Inclut un lien direct vers la Politique de Confidentialité.

## 4. Pages Publiques

Les pages légales sont accessibles publiquement aux adresses suivantes :
- **Politique de Confidentialité** : `/legal/privacy`
- **Conditions d'Utilisation** : `/legal/terms` (Redirige vers Privacy par défaut)

Ces pages utilisent un design unifié et professionnel, intégrant :
- Le contenu statique ou dynamique.
- La carte d'identité du Responsable du Site.
- Un bouton de contact direct (mailto).

## 5. Détails Techniques

- **Base de Données** : 
  - Table `users` : Champ `isSiteManager` (booléen).
  - Table `cookie_consents` : Stockage des logs de consentement (IP, User Agent, Statut).
  - Table `platform_config` : Stockage de la configuration du popup (`cookie_consent_message`, `cookie_consent_enabled`, etc.).
- **Logique** : 
  - La fonction `getLegalCompanyDetails` (`app/actions/legal.ts`) priorise les données du Site Manager.
  - Les consentements sont enregistrés via Server Actions (`app/actions/cookie-consent.ts`) pour garantir la sécurité et l'intégrité des données.
