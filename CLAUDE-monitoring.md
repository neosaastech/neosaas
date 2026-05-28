# CLAUDE-monitoring.md — Monitoring, Alertes & Données Scaleway

## Vue d'ensemble

| Composant | Namespace | Rôle |
|---|---|---|
| Prometheus | `monitoring` | Collecte et stocke toutes les métriques |
| Pushgateway | `monitoring` | Point d'entrée métriques CronJob (scrappé par Prometheus) |
| Grafana | `monitoring` | Dashboards + règles d'alerte + contact points |
| Loki + Promtail | `monitoring` | Logs cluster (Promtail DaemonSet → Loki) |
| `scaleway-billing-alert` | `management` | Alerte consommation + vélocité (toutes les 4h) |
| `scaleway-audit-watch` | `management` | Surveillance inventaire serveurs (toutes les 2h) |
| ntfy | `interfaces` | Push notifications mobile/web |

---

## Pipeline données Scaleway

> **⚠️ Contournement billing actif** — `scaleway-engine GET /billing` retourne 403 (permission `billing:read` manquante sur la clé `SCW_SECRET_KEY` Vault). Charlotte lit le billing depuis ce pipeline Prometheus/ConfigMap en fallback. Issue Zoho `2114101000001744012` (projet neokube) — action requise : ajouter `BillingReadOnly` dans IAM Scaleway console.

```
Scaleway API (billing/v2beta1)
        │
        ▼ toutes les 4h
scaleway-billing-alert (CronJob)
        │
        ├──► ConfigMap scaleway-billing-history (management)
        │    Clés : "YYYY-MM-DD" = brut €, "_last_alerted_at" = horodatage dernière alerte
        │
        ├──► Pushgateway :9091/metrics/job/scaleway-billing/instance/{period}
        │    → Prometheus scrape (honor_labels: true)
        │
        └──► ntfy neokube-alerts (si seuil net dépassé ou vélocité ou rapport matin)

Scaleway API (baremetal + instance + IAM)
        │
        ▼ toutes les 2h
scaleway-audit-watch (CronJob)
        │
        ├──► ConfigMap scaleway-inventory-snapshot (management)
        │    Clés : "inventory" (JSON), "checked_at", "server_count"
        │
        ├──► Pushgateway :9091/metrics/job/scaleway-inventory/instance/cluster
        │
        └──► ntfy (si nouveau serveur, serveur supprimé, statut error/offline, IAM events)
```

---

## Métriques Prometheus disponibles

| Métrique | Type | Description |
|---|---|---|
| `scaleway_billing_total_euros{period}` | gauge | **Net dû** (après crédit — à utiliser pour les seuils) |
| `scaleway_billing_gross_euros{period}` | gauge | Brut consommé (avant crédit) |
| `scaleway_billing_discount_euros{period}` | gauge | Crédit/remise Scaleway appliqué |
| `scaleway_billing_projected_euros{period}` | gauge | Projection fin de mois (sur base nette) |
| `scaleway_billing_daily_delta_euros` | gauge | Variation 24h (0 le premier jour de tracking) |
| `scaleway_billing_threshold_euros` | gauge | Seuil alerte configuré (200€) |
| `scaleway_billing_critical_euros` | gauge | Seuil critique configuré (350€) |
| `scaleway_billing_category_euros{category,period}` | gauge | Coût par catégorie Scaleway |
| `scaleway_server_count{type}` | gauge | Nb serveurs actifs (baremetal / compute) |
| `scaleway_server_changes_total{event}` | gauge | Créations/suppressions dernière période |

### Requêtes Prometheus utiles

```bash
# Net dû ce mois
kubectl exec -n monitoring deployment/prometheus -- wget -qO- \
  "http://localhost:9090/api/v1/query?query=scaleway_billing_total_euros" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(r['value'][1]+'€') for r in d['data']['result']]"

# Crédit appliqué
kubectl exec -n monitoring deployment/prometheus -- wget -qO- \
  "http://localhost:9090/api/v1/query?query=scaleway_billing_discount_euros" 2>/dev/null

# Inventaire serveurs
kubectl get cm scaleway-inventory-snapshot -n management -o jsonpath='{.data.inventory}' | python3 -m json.tool

# Historique billing (30 derniers jours)
kubectl get cm scaleway-billing-history -n management -o jsonpath='{.data}'
```

---

## Règles d'alerte billing (scaleway-billing-alert)

| Condition | Fréquence max | Priorité ntfy | Description |
|---|---|---|---|
| Rapport matin (6h-10h UTC) | 1×/jour | low | Bilan quotidien même sous seuil |
| Net > 200€ (ALERT_THRESHOLD) | 1×/8h | high | Dépassement seuil alerte |
| Net > 350€ (CRITICAL_THRESHOLD) | 1×/8h | urgent | Dépassement seuil critique |
| Delta 24h ≥ 50€ (VELOCITY_THRESHOLD) | Toujours | high | Montée rapide |

**Repeat suppression** : `_last_alerted_at` tracké dans `scaleway-billing-history` ConfigMap.
Les alertes seuil ne sont envoyées qu'une fois toutes les 8h. Les alertes vélocité passent toujours.

**Variables d'environnement configurables** (dans le CronJob spec) :
```yaml
ALERT_THRESHOLD: "200"      # €/mois net avant alerte
CRITICAL_THRESHOLD: "350"   # €/mois net avant critique
VELOCITY_THRESHOLD: "50"    # delta 24h €
```

---

## Format ntfy — Alertes billing

```
🚨 Scaleway CRITIQUE — 2879€ brut (2026-05)

💰 Brut 2026-05 : 2878€
🎁 Crédit Scaleway : -2878€ → Net dû : 0€
🔮 Projection nette : ~0€

Par catégorie (brut) :
• BareMetal : 2857€
• Compute : 9€
• Network : 8€

Top 5 ressources :
1. Hourly - FR-PAR-2 : 670€
...

[Console Scaleway] [Dashboard Grafana]
```

> **Important** : Le titre utilise le brut pour alerter sur l'activité brute. Le corps montre
> toujours le crédit et le NET pour la réalité financière.

---

## Alertes inventaire (scaleway-audit-watch)

| Événement | Priorité ntfy |
|---|---|
| Nouveau serveur baremetal | urgent |
| Nouveau serveur compute | high |
| Serveur supprimé | default |
| Statut → error/offline/stopped | high |
| IAM : clé API créée/supprimée | high |
| IAM : utilisateur supprimé | urgent |

---

## Grafana dashboard Scaleway

**URL** : `https://grafana.neokube.fr/d/scaleway-pilot`
**UID** : `scaleway-pilot`
**Refresh** : 5 min

### Panels

| Panel | Type | Métrique |
|---|---|---|
| ✅ Net dû ce mois | stat | `scaleway_billing_total_euros` |
| 📊 Brut consommé | stat | `scaleway_billing_gross_euros` |
| 🎁 Crédit Scaleway | stat | `scaleway_billing_discount_euros` |
| 🔮 Projection nette | stat | `scaleway_billing_projected_euros` |
| 📈 Delta 24h | stat | `scaleway_billing_daily_delta_euros` |
| 📊 Évolution consommation mensuelle | timeseries | total + projection + seuils |
| 🏷️ Répartition par catégorie | barchart | `scaleway_billing_category_euros` |
| ⚡ Delta journalier (vélocité) | timeseries | `scaleway_billing_daily_delta_euros` |
| 📦 Coût par catégorie (évolution) | timeseries | `scaleway_billing_category_euros` |

> **Bug connu résolu** : les panels doivent avoir `datasource: {type: prometheus, uid: prometheus}`
> au niveau panel ET au niveau target. Sinon Grafana utilise Loki (défaut) pour les requêtes PromQL.

---

## Grafana alerting → ntfy

**Problème historique** : Grafana webhook envoyait son payload JSON natif (illisible dans ntfy).
**Fix appliqué** : le champ `message` du contact point est un template Go qui produit du JSON ntfy.

Format ntfy produit par Grafana :
```json
{
  "topic": "neokube-alerts",
  "title": "🔴 ALERTE — CronJob ERROR",
  "message": "summary\ndescription\n\nhttps://grafana.neokube.fr/alerting",
  "priority": "high",
  "markdown": true,
  "actions": [{"action": "view", "label": "Voir dans Grafana", "url": "..."}]
}
```

**Fichier** : `apps/monitoring/base/configmap-grafana-alerting.yaml`

---

## Situation hacking mai 2026

- **Incident** : des Elastic Metal (EM-I620E-NVME, EM-B520E-NVME, EM-A610R-NVME) ont été
  provisionnés sans autorisation via une API key compromise en avril-mai 2026.
- **Crédit Scaleway** : remboursement intégral accordé → `total_discount_untaxed_value = 2878.52€`
- **Impact facture** : 0€ dû pour mai 2026
- **Consommation légitime** : ~21€/mois (stalwart-mail DEV1-S, réseau, stockage)
- **Serveurs nettoyés** : 0 baremetal actif (tous supprimés), 1 compute (stalwart-mail)
- **Suivi** : `scaleway_billing_total_euros` (net) vs `scaleway_billing_gross_euros` (brut)

> Voir `audit-baremetal.json` et `scaleway-incident-report-2026-05-12.md` pour l'historique complet.

---

## Namespace management — RBAC Scaleway

**ServiceAccount** : `scaleway-monitor-sa` (management)
**Role** : `scaleway-monitor-role` — get/create/update/patch ConfigMaps dans management
**Secret** : `scaleway-billing-secret` — clés `SCW_SECRET_KEY`, `SCW_ORG_ID` (hardcodé), `NTFY_AGENT_PASSWORD`

---

## Points de vigilance

| # | Piège | Règle |
|---|---|---|
| 1 | Confondre brut et net | `scaleway_billing_total_euros` = NET. `scaleway_billing_gross_euros` = BRUT |
| 2 | Delta manquant J+1 | `scaleway_billing_daily_delta_euros = 0` le premier jour de tracking — normal |
| 3 | Audit trail API | `/audit-trail/v1alpha1/events` retourne 404 (permissions insuffisantes). Utiliser `/iam/v1alpha1/logs` |
| 4 | Instance API org filter | `GET /instance/v1/zones/{zone}/servers?organization_id=X` retourne 400. Filter côté Python après fetch |
| 5 | Baremetal pl-waw | Zone pl-waw-1 retourne 501 (not implemented) pour baremetal — normal |
