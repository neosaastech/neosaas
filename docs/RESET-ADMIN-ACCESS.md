# 🔐 Réinitialisation de l'accès Admin

## Problème
Impossible de se connecter avec :
- **Email:** `contact@exemple.com`
- **Password:** `admin`

## Solution 1 : Utiliser le script de réinitialisation (Recommandé)

### Étape 1 : Installer les dépendances (si pas déjà fait)

```bash
npm install
```

### Étape 2 : Exécuter le script de réinitialisation

```bash
npx tsx scripts/reset-admin-password.ts
```

**Résultat attendu :**
```
🎉 Connexion admin réinitialisée !

📝 Informations de connexion:
   Email: contact@exemple.com
   Password: admin

⚠️  IMPORTANT: Changez ce mot de passe après la première connexion !
```

### Étape 3 : Se connecter

1. Aller sur `http://localhost:3000/auth/login`
2. Email: `contact@exemple.com`
3. Password: `admin`
4. Cliquer sur "Login"

---

## Solution 2 : Requête SQL directe dans Neon Console

Si le script ne fonctionne pas, utilisez cette requête SQL :

### Étape 1 : Générer un hash bcrypt pour le mot de passe

**Option A : Utiliser Node.js localement**

```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('admin', 10)
  .then(hash => console.log('Hash:', hash));
"
```

**Option B : Utiliser un générateur en ligne**
- Aller sur https://bcrypt-generator.com/
- Entrer le mot de passe: `admin`
- Rounds: `10`
- Copier le hash généré

### Étape 2 : Exécuter dans Neon Console

```sql
-- Mettre à jour le mot de passe de l'admin
UPDATE users
SET
  password = '$2a$10$VOTRE_HASH_BCRYPT_ICI',
  is_active = true,
  updated_at = NOW()
WHERE email = 'contact@exemple.com';

-- Vérifier que la mise à jour a fonctionné
SELECT
  id,
  email,
  is_active,
  is_owner,
  created_at,
  updated_at
FROM users
WHERE email = 'contact@exemple.com';
```

**Important:** Remplacez `$2a$10$VOTRE_HASH_BCRYPT_ICI` par le hash généré à l'étape 1.

---

## Solution 3 : Recréer la base de données (Si l'utilisateur n'existe pas)

### Étape 1 : Vérifier si l'utilisateur existe

```sql
SELECT * FROM users WHERE email = 'contact@exemple.com';
```

Si aucun résultat, l'utilisateur n'existe pas.

### Étape 2 : Exécuter le script de création de la base

```bash
npm run db:push
```

Ce script crée automatiquement :
- Toutes les tables
- Les rôles et permissions
- **Un utilisateur super admin provisoire** :
  - Email: `contact@exemple.com`
  - Password: `admin`
  - Rôle: `super_admin`

---

## Vérification

### Test de connexion

1. **Local:**
   ```
   http://localhost:3000/auth/login
   ```

2. **Production (Vercel):**
   ```
   https://votre-domaine.com/auth/login
   ```

### Informations de connexion

- **Email:** `contact@exemple.com`
- **Password:** `admin`

### Après connexion réussie

1. Aller sur `/admin/api` pour tester l'accès admin
2. **Changer immédiatement le mot de passe** :
   - Aller sur votre profil
   - Changer le mot de passe par quelque chose de sécurisé

---

## Troubleshooting

### ❌ "Invalid email or password"

**Causes possibles :**
1. L'utilisateur n'existe pas
2. Le mot de passe est incorrect
3. Le hash bcrypt n'est pas correct

**Solutions :**
1. Vérifier que l'utilisateur existe :
   ```sql
   SELECT * FROM users WHERE email = 'contact@exemple.com';
   ```

2. Si l'utilisateur n'existe pas, exécuter :
   ```bash
   npm run db:push
   ```

3. Si l'utilisateur existe, réinitialiser le mot de passe avec le script ou SQL

### ❌ "Your account has been deactivated"

**Cause :** Le compte est désactivé (`is_active = false`)

**Solution :**
```sql
UPDATE users
SET is_active = true
WHERE email = 'contact@exemple.com';
```

### ❌ "An error occurred during login"

**Cause :** Erreur serveur

**Solutions :**
1. Vérifier les logs du serveur
2. Vérifier que `DATABASE_URL` est configuré
3. Vérifier que la base de données est accessible

### ❌ Script de réinitialisation échoue

**Cause :** Dépendances non installées

**Solution :**
```bash
npm install
```

---

## Sécurité

⚠️ **IMPORTANT** : Après la première connexion avec ces identifiants provisoires :

1. **Changer le mot de passe** immédiatement
2. **Créer un nouvel utilisateur admin** avec des identifiants sécurisés
3. **Désactiver ou supprimer** le compte `contact@exemple.com` si vous n'en avez plus besoin

### Bonnes pratiques

✅ Utiliser un gestionnaire de mots de passe
✅ Créer des mots de passe forts (16+ caractères)
✅ Activer l'authentification à deux facteurs (si disponible)
✅ Ne jamais partager les identifiants admin
✅ Changer les mots de passe régulièrement

---

## Commandes utiles

### Vérifier tous les admins

```sql
SELECT
  u.id,
  u.email,
  u.is_active,
  u.is_owner,
  r.name as role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('admin', 'super_admin')
  OR u.is_owner = true;
```

### Créer un nouvel admin

```sql
-- 1. Insérer l'utilisateur (remplacer LE_HASH_BCRYPT)
INSERT INTO users (email, password, is_active, is_owner)
VALUES ('nouvel-admin@example.com', 'LE_HASH_BCRYPT', true, true)
RETURNING id;

-- 2. Attribuer le rôle super_admin (remplacer USER_ID)
INSERT INTO user_roles (user_id, role_id)
SELECT 'USER_ID', id FROM roles WHERE name = 'super_admin';
```

### Lister tous les utilisateurs

```sql
SELECT
  id,
  email,
  is_active,
  is_owner,
  created_at
FROM users
ORDER BY created_at DESC;
```

---

## Support

Si le problème persiste :

1. Vérifier les logs du serveur Next.js
2. Vérifier les logs Vercel (si en production)
3. Consulter la documentation Neon Database
4. Contacter le support technique
