# 🗄️ Database Setup Scripts

Ce dossier contient les scripts SQL pour le setup initial de la base de données NeoSaaS.

## 📁 Fichiers

### `database-setup.sql`
Script de création du schéma de base de données complet.

**Contenu :**
- Types ENUM (role)
- Tables (companies, users, etc.)
- Relations et contraintes
- Index pour performance

---

## 🚀 Utilisation

### Méthode 1 : Console Neon (Recommandée)

1. **Accédez à votre console Neon**
   ```
   https://console.neon.tech/
   ```

2. **Sélectionnez votre projet**

3. **Ouvrez l'éditeur SQL**

4. **Copiez le contenu de `database-setup.sql`**

5. **Exécutez le script**

### Méthode 2 : CLI Postgres

```bash
# Via psql (si vous avez accès direct)
psql $DATABASE_URL -f db/setup/database-setup.sql
```

### Méthode 3 : Drizzle ORM (Recommandée pour dev)

⚠️ **Note** : Ce projet utilise Drizzle ORM. Pour le développement normal, utilisez :

```bash
# Générer les migrations depuis le schéma
npm run db:generate

# Appliquer les migrations
npm run db:push

# Ou en une commande
npm run db:migrate
```

---

## ⚠️ Important

### Quand utiliser ces scripts SQL ?

- ✅ **Setup initial** d'une nouvelle base de données
- ✅ **Récupération** après une perte de données
- ✅ **Migration** vers un nouveau provider
- ❌ **PAS pour le développement normal** (utilisez Drizzle)

### Ordre d'exécution

Si vous avez plusieurs fichiers SQL, exécutez-les dans cet ordre :

1. `database-setup.sql` - Schéma de base
2. (Futurs fichiers seeds si nécessaire)

---

## 🔄 Synchronisation avec Drizzle

Le schéma SQL doit rester synchronisé avec le schéma Drizzle :

```
db/schema.ts         ← Source de vérité (Drizzle)
    ↓
db/setup/*.sql       ← Version SQL (backup/documentation)
```

### Générer le SQL depuis Drizzle

```bash
# Générer une migration
npx drizzle-kit generate:pg

# Les migrations sont dans drizzle/
# Vous pouvez les utiliser comme référence pour mettre à jour setup/*.sql
```

---

## 📚 Structure de la Base de Données

### Tables Principales

- **companies** - Entreprises clientes
- **users** - Utilisateurs du système
- **roles** - Rôles et permissions

### Relations

```
companies (1) ←→ (N) users
users (N) ←→ (N) roles
```

---

## 🛠️ Dépannage

### Erreur : "Type role already exists"

C'est normal ! Le script utilise `DO $$ BEGIN ... EXCEPTION` pour créer le type uniquement s'il n'existe pas.

### Erreur : "Table already exists"

Utilisez `DROP TABLE IF EXISTS` avant de recréer, ou exécutez uniquement les parties manquantes.

### Vérifier l'état de la base

```sql
-- Lister les tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Vérifier un type enum
SELECT typname FROM pg_type WHERE typtype = 'e';
```

---

## 📝 Maintenance

### Mettre à jour le schéma

1. Modifiez `db/schema.ts` (Drizzle)
2. Générez la migration : `npm run db:generate`
3. Appliquez : `npm run db:push`
4. Mettez à jour `database-setup.sql` si nécessaire

---

**Dernière mise à jour** : 2025-11-27
