## Stalwart Mail Server v0.11.8

**Instance** : Docker sur Scaleway fr-par-1, IP `51.15.253.114` (DEV1-S)
**Namespace K8s** : `stalwart` — Services ClusterIP + Endpoints manuels → 51.15.253.114
**GitOps** : `~/Kubinote-GitOps/apps/stalwart/base/` (StatefulSet/PVC supprimés — instance externe)
**Domaine** : `mail.neokube.fr` → `51.15.253.114` (Scaleway, pas l'IP Orange)
**Config** : `/opt/stalwart-mail/etc/config.toml` sur l'instance Scaleway
**SSH** : `ssh -i ~/.ssh/id_ed25519_neokube root@51.15.253.114`
**Vault** : `secret/neokube/apps/stalwart` — `ADMIN_PASSWORD`, `DKIM_SELECTOR`, `DKIM_PUBKEY_DNS`, `NOREPLY_PASSWORD`
**Connector** : `stalwart-connector` port 8007 (`http://stalwart-connector.connector-system.svc.cluster.local:8007`)

> **Pourquoi Scaleway ?** Le nœud kubinote est derrière Orange ISP qui bloque TLS sortant sur les ports SMTP (25, 465, 587). Stalwart est externalisé sur Scaleway fr-par-1 pour que le relay TEM fonctionne. Les agents K8s se connectent via `stalwart-mail.stalwart.svc.cluster.local:587` (ClusterIP → Endpoint → 51.15.253.114) en **plaintext** (pas de STARTTLS).

### Comptes mail agents

| Adresse | Agent | Vault path | Usage |
|---|---|---|---|
| `admin@neokube.fr` | admin (id=65) | `secret/neokube/apps/stalwart` `ADMIN_PASSWORD` | Compte admin Stalwart, alertes infra |
| `leon@neokube.fr` | Leon | `secret/neokube/agents/leon` `MAIL_FROM`/`MAIL_PASSWORD` | Email de bienvenue client, résumé brief |
| `vera@neokube.fr` | Vera | `secret/neokube/agents/vera` `MAIL_FROM`/`MAIL_PASSWORD` | Rapports QA, alertes blocantes |
| `domi@neokube.fr` | Domi | `secret/neokube/agents/domi` `MAIL_FROM`/`MAIL_PASSWORD` | Alertes renouvellement domaine |
| `aria@neokube.fr` | Aria | `secret/neokube/agents/agent-mail-secrets` `MAIL_PASSWORD_ARIA` | Notifications build frontend |
| `nox@neokube.fr` | Nox | `secret/neokube/agents/agent-mail-secrets` `MAIL_PASSWORD_NOX` | Notifications build backend |
| `no-reply@neokube.fr` | Dispatcher | `secret/neokube/apps/stalwart` `NOREPLY_PASSWORD` | Notifications workflow automatiques post-deploy |

**SMTP interne** : `stalwart-mail.stalwart.svc.cluster.local:587` (plaintext, pas de TLS — `start_tls=False`)
**Activité Dispatcher** : `dispatcher_send_client_mail` — envoyée si `spec.client_email` présent, non-bloquante

### Gotchas config v0.11.8

> Ces points ont causé des heures de debug — les noter impérativement.

**1. Section admin fallback — tiret obligatoire**
```toml
# CORRECT v0.11.8
[authentication.fallback-admin]
user = "admin"
secret = "$6$..."   # SHA-512 crypt

# FAUX (section ignorée silencieusement)
[authentication.fallback.credentials]
```

**2. Secret = hash SHA-512 crypt, pas plaintext**
```bash
# Générer un hash SHA-512 (format $6$salt$hash)
python3 -c "import crypt; print(crypt.crypt('monpassword', crypt.mksalt(crypt.METHOD_SHA512)))"
# ou
openssl passwd -6 "monpassword"
```

**3. Path RocksDB sans sous-dossier `/db`**
```toml
[store.rocksdb]
path = "/opt/stalwart-mail/data"   # CORRECT — stalwart --init crée ici
# path = "/opt/stalwart-mail/data/db"  # FAUX — causait "No such file or directory"
```

**4. `[authentication.fallback-admin]` ne fonctionne que si la DB est vide**
Si des principals existent déjà dans RocksDB, le fallback est ignoré. Pour réinitialiser :
```bash
kubectl scale statefulset stalwart -n stalwart --replicas=0
# attendre termination complète
kubectl run -it --rm cleanup --image=busybox --restart=Never -- \
  sh -c "rm -rf /data/*"  # avec volumeMount vers le PVC stalwart
kubectl scale statefulset stalwart -n stalwart --replicas=1
```

**5. API REST Stalwart — endpoints utiles**
```bash
# Base URL interne : http://stalwart-web.stalwart.svc.cluster.local:8080
# Auth : Basic admin:ADMIN_PASSWORD

# Lister les domaines
GET /api/principal?types=domain

# Lister les comptes
GET /api/principal?types=individual

# Créer un compte mail
POST /api/principal
{"name":"user@domain.fr","type":"individual","quota":0,"secrets":["password"],"emails":["user@domain.fr"]}

# Supprimer un compte
DELETE /api/principal/user@domain.fr
```

**6. Auto-ban (`fail2ban`) — config dans `config.toml` uniquement**
```toml
[server.fail2ban]
rate = "100/1d"   # bannit après 100 erreurs d'auth en 24h
```
L'endpoint `POST /api/settings/{key}` retourne 404 — seul `config.toml` fonctionne pour cette directive.

**7. `session.auth.mechanisms` — syntaxe expression string, PAS tableau TOML**

En v0.11.8, la config des mécanismes utilise la **syntaxe expression Stalwart** (chaîne entre `[...]`), **pas** un tableau TOML.

```toml
# CORRECT — syntaxe expression string (contourne le bug tri alphabétique RocksDB)
[session.auth]
require-tls = false
mechanisms = "[plain, login, oauthbearer]"

# FAUX — tableau TOML → stocké comme .0000="plain" → "Invalid property found in 'if' block"
[session.auth]
mechanisms = ["plain", "login", "oauthbearer"]

# FAUX — format conditionnel [[...]] → bug else<if alphabétiquement dans RocksDB
[[session.auth.mechanisms]]
if = "!is_empty(remote_ip)"
then = ["plain", "login", "oauthbearer"]
else = ["oauthbearer"]
```

**Pourquoi** : Stalwart v0.11.8 stocke les configs en BTreeMap (clés triées alphabétiquement). Le format conditionnel `[[array]]` génère des sous-clés `.else`, `.if`, `.then` — or `else < if` alphabétiquement, ce qui lève "Found 'else' before 'if'" au démarrage. Le format tableau TOML `["plain"]` génère `.0000 = "plain"` que le parseur refuse car il attend `.0000.if`. La **string expression** `"[plain, login, oauthbearer]"` stocke une seule clé `session.auth.mechanisms` et emprunte le fast-path du parseur qui bypass le bloc if/then/else.

**API format correct** pour modification via API (`POST /api/settings`) :
```json
[{"insert": [["session.auth.mechanisms", "[plain, login, oauthbearer]"]]}]
```
Variants supportés : `delete`, `clear`, `insert`.

**8. Webadmin — version épinglée à v0.1.23 (`auto-update = false`)**

Le binaire `stalwartlabs/mail-server:v0.11.8` embarque un webadmin bundlé qui nécessite Stalwart ≥ 0.13.0 ("Unsupported server version"). Solution : pingler manuellement sur le webadmin v0.1.23 (dernier compatible v0.11.8).

Config dans `/opt/stalwart-mail/etc/config.toml` :
```toml
webadmin.auto-update = false
webadmin.path = "/opt/stalwart-mail/etc/webadmin"
webadmin.resource = "https://github.com/stalwartlabs/webadmin/releases/download/v0.1.23/webadmin.zip"
```
> **Important** : `auto-update = false` obligatoire — sinon Stalwart retélécharge le webadmin le plus récent au prochain restart et le problème revient.
> Créer le dossier si besoin : `mkdir -p /opt/stalwart-mail/etc/webadmin`

**Connexion webadmin v0.1.23** (formulaire Leptos 3 champs) :
- **Login** : `admin`
- **Password** : depuis Vault `secret/neokube/apps/stalwart` clé `ADMIN_PASSWORD`
- **Base URL** : `http://mail-admin.neokube.local` (ou `http://51.15.253.114:8080` en direct)

**9. Créer un compte administrateur supplémentaire**

Pour donner un accès webadmin à un autre utilisateur, utiliser `type: "superuser"` (pas `individual`) :

```bash
# Via stalwart-connector depuis K8s
curl -s http://stalwart-connector.connector-system.svc.cluster.local:8007/proxy \
  -H "Content-Type: application/json" \
  -d '{"method":"POST","path":"/api/principal","body":{"name":"charles","type":"superuser","secrets":["MON_MOT_DE_PASSE"],"description":"Charles Vandendriessche"}}'

# Ou directement sur l'instance Scaleway
curl -X POST http://51.15.253.114:8080/api/principal \
  -u "admin:ADMIN_PASSWORD" -H "Content-Type: application/json" \
  -d '{"name":"charles","type":"superuser","secrets":["MON_MOT_DE_PASSE"],"description":"Charles Vandendriessche"}'
```

> `type: "superuser"` = accès complet webadmin. `type: "individual"` = compte mail uniquement (pas d'accès webadmin). Les comptes superuser ne reçoivent pas de mail — ce sont des identités d'administration pure.

**10. Accès aux boîtes mail des comptes actifs**

Le webadmin v0.1.23 est une interface de **gestion uniquement** — il ne permet pas de lire les emails. Pour lire les boîtes des comptes agents :

**Roundcube webmail** ✅ déployé — `http://webmail.neokube.local`
- **Login** : adresse mail complète (`leon@neokube.fr`, `admin@neokube.fr`, etc.)
- **Mot de passe** : depuis Vault (chemin par compte, voir §"Comptes mail agents")
- **GitOps** : `apps/stalwart/base/deployment-roundcube.yaml` (image `roundcubemail:latest-apache`)
- IMAP → `stalwart-mail.stalwart.svc.cluster.local:143` (plaintext intra-cluster)
- SMTP → `stalwart-mail.stalwart.svc.cluster.local:587` (credentials = login Roundcube, `%u`/`%p`)
- SQLite PVC 1Gi (`local-path`, namespace `stalwart`)

**Client IMAP direct** (alternative) — Thunderbird etc.
- Serveur : `51.15.253.114`, port `143` (IMAP) ou `993` (IMAPS, cert self-signed)

### DNS neokube.fr (Cloudflare — depuis 2026-05-03)

**Nameservers actifs** : `abby.ns.cloudflare.com` / `david.ns.cloudflare.com`
**Zone Cloudflare** : `891229575324408767bf4a0293e5adcc`

> **Migration 2026-05-03** : zone CF créée (avec CF_GLOBAL_KEY) + records mail recréés dans CF + NS Openprovider changés vers CF NS. Propagation immédiate. La zone Openprovider (id=14798687) reste en place mais est inactive (NS CF actifs).

> Historique : 2026-05-02 : SERVFAIL après tentative migration sans zone CF → NS remis Openprovider. 2026-05-03 : migration correcte (zone CF créée en premier).

**Enregistrements actifs dans la zone CF** :
| Type | Nom | Valeur | Proxied | TTL |
|---|---|---|---|---|
| `A` | `mail.neokube.fr` | `51.15.253.114` (Scaleway fr-par-1, instance fixe) | **Non** (DNS-only) | auto |
| `CNAME` | `*.neokube.fr` (11 sous-domaines) | `94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb.cfargotunnel.com` | **Oui** (proxied) | auto |
| `MX` | `neokube.fr` | `mail.neokube.fr` prio=10 | Non | auto |
| `TXT` | `neokube.fr` | `v=spf1 mx ~all` | Non | auto |
| `TXT` | `mail._domainkey.neokube.fr` | Clé DKIM RSA 2048 Stalwart | Non | auto |
| `TXT` | `_dmarc.neokube.fr` | `v=DMARC1; p=none; rua=mailto:admin@neokube.fr` | Non | auto |

> **Important** : `mail.neokube.fr` doit rester DNS-only (proxied=false) — si proxié, Cloudflare intercepte SMTP et le relay TEM échoue.

**Mise à jour DNS via cloudflare-connector** (maintenant la bonne façon pour neokube.fr) :
```bash
# Via cloudflare-connector /proxy — les credentails Global Key sont auto-injectés
CF_POD=$(kubectl get pod -n connector-system -l app=cloudflare-connector -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n connector-system $CF_POD -- python3 -c "
import httpx, json
r = httpx.post('http://localhost:8006/proxy', json={
    'method': 'POST',
    'path': 'zones/891229575324408767bf4a0293e5adcc/dns_records',
    'body': {'type': 'A', 'name': 'mail', 'content': '51.15.253.114', 'proxied': False}
})
print(r.json())
"
```

**Ancienne méthode openprovider-connector v1.1** (ne plus utiliser pour neokube.fr — NS CF actifs) :
```
POST /dns/records/add → {"zone": "neokube.fr", "records": [...]}
(maintenant inutile — CF est autoritaire pour neokube.fr)
```

**Gotcha API Openprovider DNS (découvert 2026-05-02)** :
- L'ancien format `PUT /dns/zones/{name}` avec `{"zone": {"records": [...]}}` retournait `success:true` mais ne modifiait rien (bug silencieux)
- Format correct : `{"id": <zone_id>, "name": "<zone>", "records": {"add": [...]}}`
- TTL minimum : **600 secondes** (sinon error 815)
- `POST/PATCH/DELETE` sur `/dns/zones/{name}/records` retournent "Method is not implemented"
- `GET /dns/zones/{name}/records` — endpoint correct pour lister les enregistrements
- `GET /dns/zones/{name}?with_records=1` — retourne code 80 "Invalid request" (paramètre non supporté)

---
## Scaleway Transactional Email (TEM)

**Objectif** : relay SMTP sortant pour Stalwart (Orange ISP bloque le port 25 sortant, Scaleway bloque aussi les ports SMTP outbound 25/465/587 par défaut).
**Architecture réelle (2026-05-03)** : Stalwart → `smtp-tem-proxy` (localhost:1025) → Scaleway TEM HTTP API (HTTPS:443) → Internet

> **Pourquoi un proxy ?** Scaleway bloque les ports SMTP outbound (25, 465, 587) depuis les instances DEV1-S. Le port 443 (HTTPS) est libre. Le proxy `smtp-tem-proxy` écoute sur port 1025, reçoit le SMTP de Stalwart, et relaye via l'API HTTP TEM de Scaleway.

### smtp-tem-proxy

**Service systemd** : `smtp-tem-proxy` sur l'instance Scaleway (`51.15.253.114`)
**Script** : `/opt/smtp-tem-proxy/proxy.py`
**Écoute** : `0.0.0.0:1025`
**Commandes** :
```bash
ssh -i ~/.ssh/id_ed25519_neokube root@51.15.253.114
systemctl status smtp-tem-proxy
journalctl -u smtp-tem-proxy -n 30
```

### Config Stalwart pour le relay (config.toml sur Scaleway)

```toml
[remote."scaleway-tem"]
address = "mail.neokube.fr"   # DNS réel → 51.15.253.114 (Stalwart resolve via DNS, pas /etc/hosts)
port = 1025
protocol = "smtp"
tls.implicit = false
tls.enable = false
auth.enable = false

[queue.outbound]
next-hop = "'scaleway-tem'"

[queue.outbound.tls]
starttls = "optional"         # évite l'abort Stalwart si STARTTLS non annoncé
allow-invalid-certs = true
```

> **Gotchas Stalwart v0.11.8 relay** :
> - Utiliser un vrai hostname DNS pour le relay (pas IP, pas `/etc/hosts` — Stalwart utilise son propre resolver async)
> - `[queue.outbound.tls] starttls = "optional"` obligatoire sinon Stalwart avorte après EHLO si pas de STARTTLS
> - MAIL FROM parsing : `re.search(r'<([^>]+)>', cmd)` — `.strip("<>")` laisse un `>` résiduel si le cmd a des paramètres après (ex: `SIZE=523`)

### État actuel (2026-05-03)

| Composant | État |
|---|---|
| Vault `secret/neokube/infrastructure/scaleway` | ✅ Provisionné |
| Souscription TEM Scaleway | ✅ Active |
| Domaine `neokube.fr` dans TEM | ✅ `checked` (vérifié 2026-05-02) |
| smtp-tem-proxy (systemd) | ✅ Running sur 51.15.253.114:1025 |
| Relay Stalwart → TEM | ✅ E2E validé (email reçu chvandendriessche@neomnia.net) |
| Penpot recovery mail | ✅ Fonctionnel (SMTP_TLS=false) |
| UI Stalwart admin | ✅ `http://mail-admin.neokube.local` (Traefik) ou `http://51.15.253.114:8080` |
| Roundcube webmail | ✅ `http://webmail.neokube.local` (IMAP stalwart-mail:143) |

**Vault** : `secret/neokube/infrastructure/scaleway`
| Clé Vault | Description |
|---|---|
| `SCW_ACCESS_KEY` | Access key Scaleway |
| `SCW_SECRET_KEY` | Secret key Scaleway (= mot de passe TEM SMTP) |
| `SCW_DEFAULT_PROJECT_ID` | `473a0ce6-ecd8-4374-8f49-9a6e347d0c8d` |
| `SCW_DEFAULT_REGION` | `fr-par` |

### Pourquoi Scaleway TEM et pas Stalwart direct

Orange (FAI) bloque le port 25 sortant. Scaleway bloque aussi les ports SMTP sortants (25, 465, 587) depuis les instances. Le relay passe donc par l'API HTTP TEM de Scaleway via HTTPS (port 443 non bloqué).

---
