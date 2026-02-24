# Module E-Commerce & Marketplace

Ce document décrit le fonctionnement et l'architecture du module E-Commerce intégré à NeoSaaS.

## Vue d'Ensemble

Le module E-Commerce permet aux administrateurs de créer et gérer des offres (produits numériques, services, coaching) et aux clients de les acheter directement depuis leur tableau de bord privé.

### Fonctionnalités Clés
- **Gestion des Produits (Admin)** : Création, édition, publication d'offres avec prix et description.
- **Marketplace Privée (Client)** : Catalogue d'offres intégré au dashboard client.
- **Paiement & Facturation (Lago)** :
  - Intégration native avec [Lago](https://getlago.com) pour la facturation.
  - Configuration dynamique (API Key, Mode Test/Prod) depuis l'interface d'administration (`/admin/settings`).
  - Création automatique des clients et factures dans Lago lors de l'achat.
- **Emails Transactionnels** : Envoi automatique de confirmation de commande.

## Architecture Technique

### Base de Données
Le module repose sur les tables suivantes (définies dans `db/schema.ts`) :
- `products` : Catalogue des offres.
- `carts` & `cart_items` : Gestion des paniers utilisateurs.
- `orders` : Historique des commandes et lien avec la facturation (stockage des IDs Lago).
- `platform_config` : Stockage sécurisé de la configuration Lago (`lago_api_key`, `lago_mode`, etc.).

### Structure des Fichiers
- `app/actions/ecommerce.ts` : Logique métier (Server Actions) pour la gestion des produits, du panier et du checkout.
- `lib/lago.ts` : Client Lago configuré dynamiquement depuis la base de données.
- `app/(private)/admin/settings/page.tsx` : Interface de configuration des clés API Lago.
- `app/(private)/dashboard/marketplace/` : Interface client pour visualiser et acheter les offres.

## Configuration Lago

Pour activer le module de paiement :
1. Se rendre dans l'administration : **Parameters > Billing (Lago)**.
2. Choisir le mode (Test ou Production).
3. Saisir la **Lago API Key** (disponible dans le dashboard Lago).
4. (Optionnel) Modifier l'URL de l'API si utilisation d'une instance self-hosted.

Une fois configuré, le checkout utilisera ces identifiants pour générer les factures.

## Processus de Déploiement

Toute modification sur ce module impliquant des changements de schéma de base de données doit suivre le processus strict :

1. **Modification du Schéma** : Éditer `db/schema.ts` (source de vérité unique).
2. **Application locale** : `pnpm db:push`
3. **Déploiement** : `scripts/build-with-db.sh` exécute `drizzle-kit push --force --verbose` automatiquement.

> **Note** : L'initialisation de la base de données est critique. En cas d'erreur 500 sur les nouvelles pages, vérifier que `npm run db:push` a bien été exécuté sur l'environnement cible.
