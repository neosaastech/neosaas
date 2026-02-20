# Modèle de Données (Data Model)

Ce document décrit la structure de la base de données de NeoSaaS, en particulier les tables principales modifiées récemment.

## 🏢 Companies (Entreprises)

La table `companies` stocke les informations sur les organisations clientes.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique (Clé primaire) |
| `name` | TEXT | Nom de l'entreprise |
| `email` | TEXT | Email de contact (Unique) |
| `city` | TEXT | Ville |
| `address` | TEXT | Adresse postale |
| `zip_code` | TEXT | **[Nouveau]** Code Postal |
| `siret` | TEXT | **[Nouveau]** Numéro SIRET |
| `vat_number` | TEXT | Numéro de TVA intracommunautaire |
| `phone` | TEXT | Numéro de téléphone |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de dernière mise à jour |

## 👤 Users (Utilisateurs)

La table `users` unifie les utilisateurs clients et les administrateurs de la plateforme.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique (Clé primaire) |
| `email` | TEXT | Email de connexion (Unique) |
| `password` | TEXT | Mot de passe haché |
| `first_name` | TEXT | Prénom |
| `last_name` | TEXT | Nom |
| `phone` | TEXT | Téléphone personnel |
| `address` | TEXT | Adresse personnelle |
| `city` | TEXT | Ville |
| `postal_code` | TEXT | Code postal |
| `country` | TEXT | Pays |
| `position` | TEXT | **[Nouveau]** Poste / Fonction dans l'entreprise |
| `profile_image` | TEXT | Image SVG (Base64) encapsulant la photo recadrée au format carré |
| `company_id` | UUID | Référence à l'entreprise (Clé étrangère) |
| `is_active` | BOOLEAN | Statut du compte |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de dernière mise à jour |

## 🔐 Roles & Permissions

Le système utilise également les tables suivantes pour la gestion des accès (RBAC) :
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`

Voir [Roles & Permissions System](./ROLES_PERMISSIONS_SYSTEM.md) pour plus de détails.
