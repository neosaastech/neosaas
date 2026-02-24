# Guide de Dépannage — NeoSaaS Tech

## Problème : L'authentification ne crée rien dans la base de données

Si vous testez l'inscription/connexion et que rien ne se passe ou que vous obtenez des erreurs, suivez ces étapes.

---

## Étape 1 : Vérifier les Logs

### Via les logs de votre hébergeur

La méthode varie selon votre plateforme d'hébergement. En local :

```bash
# Logs du serveur de développement
pnpm dev

# Observer les erreurs dans le terminal
```

### Via la Console du Navigateur

1. Ouvrez votre site
2. Ouvrez la Console du Navigateur (F12)
3. Allez dans l'onglet **Network**
4. Essayez de vous inscrire
5. Regardez la requête `/api/auth/register` :
   - **Status Code** : Devrait être 200 si succès
   - **Response** : Cliquez pour voir la réponse JSON

### Erreurs Courantes

**Erreur : "DATABASE_URL environment variable is not set"**
- Variable `DATABASE_URL` absente ou mal configurée
- Solution : Vérifiez votre fichier `.env` ou les variables de votre hébergeur

**Erreur : "relation 'users' does not exist"**
- Les tables n'ont pas été créées dans la base de données
- Solution : Suivez l'Étape 2 ci-dessous

**Erreur : "User with this email already exists"**
- La base fonctionne — essayez avec un autre email

---

## Étape 2 : Initialiser la Base de Données

### Méthode recommandée (local)

```bash
pnpm db:push   # Applique le schéma
pnpm db:seed   # Injecte les données par défaut
```

### Via l'interface SQL de votre provider (Neon, Supabase, etc.)

1. Connectez-vous à la console de votre provider PostgreSQL
2. Ouvrez l'éditeur SQL
3. Exécutez le contenu de `database-setup.sql` si disponible

### Via psql (ligne de commande)

```bash
# Remplacez par vos propres credentials
psql "postgresql://<user>:<password>@<host>/<dbname>?sslmode=require" < database-setup.sql
```

---

## Étape 3 : Vérifier la Connexion à la Base de Données

### Test avec un Client SQL

Clients recommandés :
- [DBeaver](https://dbeaver.io/) (gratuit)
- [TablePlus](https://tableplus.com/) (gratuit avec limitations)
- [pgAdmin](https://www.pgadmin.org/) (gratuit)

Connectez-vous avec vos propres credentials (depuis votre provider PostgreSQL) et vérifiez les tables :

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

Vous devriez voir : `companies`, `users`, `sessions`, et autres tables.

---

## Étape 4 : Variables d'Environnement

Vérifiez que toutes les variables requises sont bien définies :

```bash
# Vérifier localement
cat .env | grep -v "^#" | grep -v "^$"
```

Variables minimales requises :
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## Étape 5 : Réinitialisation Complète

Si le problème persiste :

```bash
pnpm db:hard-reset  # Reset + migrate + seed complet
```

> ⚠️ Supprime toutes les données existantes.

---

## Problèmes OAuth

**Erreur de callback OAuth :**
- Vérifiez que `NEXT_PUBLIC_APP_URL` correspond exactement à votre URL de déploiement
- Vérifiez que l'URL de callback est bien enregistrée dans votre app GitHub/Google
- Format attendu : `https://votre-domaine.com/api/auth/oauth/github/callback`

**OAuth non configuré :**
- Les credentials OAuth se configurent depuis `/admin/api`, pas via des variables d'environnement

---

## Problèmes Stripe

**Webhooks non reçus :**
- Vérifiez que le webhook Stripe pointe sur `https://votre-domaine.com/api/webhooks/stripe`
- En local, utilisez la CLI Stripe : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Clés non trouvées :**
- Configurez vos clés depuis `/admin/api` → Service Stripe
