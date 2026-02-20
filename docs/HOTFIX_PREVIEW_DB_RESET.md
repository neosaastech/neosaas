# 🔥 HOTFIX - Preview DB Reset (21 Jan 2026)

## 🐛 Problème identifié

Le script `build-with-db.sh` activait automatiquement `FORCE_DB_RESET=true` pour **TOUS les environnements preview et development**, causant :

- ❌ **Perte de données** à chaque déploiement preview
- ❌ **Suppression des configurations** Scaleway, GitHub OAuth, etc.
- ❌ **Warning** : `⚠️ Scaleway config not found in service_api_configs`

### Logs d'erreur
```
15:54:40.882 ⚠️ Environnement de test détecté (preview) : Activation automatique de FORCE_DB_RESET
15:54:40.883 ⚠️ FORCE_DB_RESET activé : Réinitialisation complète de la base de données...
15:55:18.063   ⚠️ Scaleway config not found in service_api_configs
```

---

## ✅ Solution appliquée

### Modification : `scripts/build-with-db.sh`

**AVANT** (lignes 16-21) :
```bash
# Auto-enable FORCE_DB_RESET for preview/dev if not explicitly set
if [ -z "$FORCE_DB_RESET" ]; then
  if [ "$VERCEL_ENV" = "preview" ] || [ "$VERCEL_ENV" = "development" ]; then
    echo "⚠️ Environnement de test détecté ($VERCEL_ENV) : Activation automatique de FORCE_DB_RESET"
    export FORCE_DB_RESET="true"
  fi
fi
```

**APRÈS** :
```bash
# Auto-enable FORCE_DB_RESET ONLY for development (not preview)
if [ -z "$FORCE_DB_RESET" ]; then
  if [ "$VERCEL_ENV" = "development" ]; then
    echo "⚠️ Environnement de développement détecté : Activation automatique de FORCE_DB_RESET"
    export FORCE_DB_RESET="true"
  fi
fi
```

### Changements clés :
1. **Tous les environnements** → Mode persistant (`drizzle-kit push --force --verbose`)
2. Source de vérité unique : `db/schema.ts`

> ~~**Mise à jour Fév 2026** : Le script `build-with-db.sh` utilise désormais `drizzle-kit push --force --verbose` pour tous les environnements.~~
> **⚠️ CORRECTION (15 Fév 2026)** : Cette note est incorrecte. `build-with-db.sh` utilise en réalité `scripts/migrate.ts` (HTTP Neon) + `scripts/db-ensure-columns.ts`, car `drizzle-kit push` nécessite une connexion TCP bloquée sur Vercel. La synchronisation complète via `drizzle-kit push` se fait dans GitHub Actions (`db-migrate.yml`).

---

## 📊 Comportement par environnement (état actuel)

| Environnement | Outil | Étapes | Impact |
|---------------|-------|--------|--------|
| **Vercel (tous)** | `build-with-db.sh` | 1. `db-ensure-columns.ts` (colonnes manquantes) → 2. `migrate.ts` (SQL files HTTP) → 3. seeds | ✅ Non-destructif |
| **GitHub Actions** | `db-migrate-safe.sh` | `db-ensure-columns.ts` → `drizzle-kit push` → seeds | ✅ Synchronisation complète |
| **Development** | `drizzle-kit push --force --verbose` | ✅ Conserve les données |

---

## 🎯 Résultats attendus

Après ce hotfix, les déploiements preview devraient :
- ✅ **Conserver** les configurations Scaleway, GitHub OAuth, Stripe, PayPal
- ✅ **Mettre à jour** le schéma DB sans perte de données
- ✅ **Afficher** les logs : `🛡️ Mode Persistant : Mise à jour du schéma uniquement (db:push)...`

### Logs normaux après correction
```
15:54:40.503 ✅ DATABASE_URL configuré
15:54:40.512 🛡️ Mode Persistant : Mise à jour du schéma uniquement (db:push)...
15:54:40.513 ℹ️ Pour réinitialiser la base, définissez la variable d'environnement FORCE_DB_RESET=true
15:54:42.891 ✅ Base de données synchronisée avec succès
15:54:43.012 ✅ Scaleway config trouvée : s3-******
```

---

## 📝 Documentation mise à jour

- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Section "Synchronisation Base de Données" corrigée

---

## 🔄 Actions à faire maintenant

1. **Commit & Push** ce hotfix :
   ```bash
   git add scripts/build-with-db.sh docs/DEPLOYMENT.md docs/HOTFIX_PREVIEW_DB_RESET.md
   git commit -m "🔥 Hotfix: Désactiver auto-reset DB en preview"
   git push
   ```

2. **Redéployer** sur Vercel Preview pour tester

3. **Vérifier les logs** : Plus de message `FORCE_DB_RESET activé` en preview

4. **Reconfigurer Scaleway/GitHub** si nécessaire (après le prochain déploiement, les configs seront conservées)

---

## ⚙️ Configuration manuelle (si besoin)

Pour **forcer** le reset en preview (cas exceptionnel) :
```bash
# Dans Vercel → Settings → Environment Variables
FORCE_DB_RESET=true  # Pour l'environnement Preview uniquement
```

Pour **désactiver** le reset automatique en development :
```bash
# Dans Vercel → Settings → Environment Variables
FORCE_DB_RESET=false  # Pour l'environnement Development
```
