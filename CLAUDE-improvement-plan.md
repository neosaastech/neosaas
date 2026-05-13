# Plan d'amélioration agents NeoKube — 2026-05-13

## Objectif

Améliorer systématiquement chaque agent sur 3 axes :

1. **Image pré-bâtie** — remplacer `python:3.12-slim` + init container pip install → image `ghcr.io/neomnia/neokube-agent:latest` avec toutes les dépendances pré-installées. Restart : 60-90s → ~15s.
2. **Compression contexte Mistral** — pour les agents avec beaucoup de sorties d'outils (Charlotte, Neo), summariser les gros outputs via Mistral avant injection dans le loop ReAct.
3. **Séparation des responsabilités** — Charlotte → Leon pour création de tâches Zoho SRE. Leon ajoute un endpoint HTTP de réception.

---

## Phase 1 — Image pré-bâtie commune (tous les agents)

**Prérequis** : Dockerfile + build + push ghcr.io/neomnia/neokube-agent:latest

Dépendances communes à tous les agents :
```
httpx>=0.27
fastapi>=0.111
uvicorn[standard]>=0.30
temporalio>=1.7
pydantic>=2.0
aiosmtplib>=3.0
mcp>=1.0.0
pyyaml>=6.0
langfuse>=2.36
qdrant-client>=1.9
aioimaplib>=1.1
openai>=1.0
```

Agents concernés (avec init container) : Charlotte, Aria, Nox, Leon, Penpot, Vera
Agents sans init container (déjà OK ou sans dépendances lourdes) : Neo, Domi, Dispatcher

**Étapes** :
- [x] 1a. Créer `docker/agent-base/Dockerfile` + `requirements.txt` dans Kubinote-GitOps
- [x] 1b. Build + push vers ghcr.io (GitHub Actions run #25826350342 — success, image 150MB)
- [x] 1c. Mettre à jour tous les deployments : image → `ghcr.io/neomnia/neokube-agent-base:latest`
- [x] 1d. Supprimer les init containers pip install de tous les deployments (Charlotte : install-deps supprimé, git-clone conservé)
- [x] 1e. Validation : Aria 1/1, Nox 1/1, Leon 3/3, Vera 1/1, Penpot 1/1 — tous sur agent-base. Charlotte 3/3 (1 init restant : git-clone).
- [x] 1f. ghcr-pull-secret créé + CronJob registry-sync (nightly renewal)
- [x] 1g. Charlotte apt-get retiré des commandes container principal + git-clone

**Statut** : ✅ Terminé — restart time ~90s → ~15s (hors git-clone ~20s pour Charlotte)

---

## Phase 2 — Charlotte : compression contexte Mistral

**Problème** : outputs kubectl jusqu'à 8000 chars injectés bruts dans le contexte ReAct → LLM reçoit trop → ralentit, hallucine.

**Solution** : intercepter les tool results > 1500 chars → passer à Mistral pour extraire seulement les anomalies → injecter le résumé (< 500 chars) au lieu du texte brut.

**Étapes** :
- [x] 2a. Ajouter `_compress_tool_result(tool_name, tool_result, user_query)` — Mistral si len > 1500
- [x] 2b. Remplacer troncature brute (lignes 6911-6913) par `await _compress_tool_result(fn_name, tool_result, message)`
- [x] 2c. Deployé en prod — Charlotte 3/3 Running

**Statut** : ✅ Terminé — contexte ReAct réduit ~8KB→~400 chars sur gros outputs kubectl

---

## Phase 3 — Leon : endpoint SRE task reception

**Problème** : Charlotte crée des tâches Zoho directement (mélange SRE + gestion de projet).

**Solution** : Charlotte → `POST leon:8181/sre-task` → Leon crée la tâche Zoho avec le bon format.

**Étapes** :
- [x] 3a. `POST /sre-task` dans leon.py — génère REF, dates, tags auto, crée tâche Zoho
- [x] 3b. Charlotte : nouveau tool `delegate_sre_task` + `LEON_URL` + règle 1c mise à jour
- [x] 3c. Testé en live (HTTP 200, tâche id=2114101000001692003 créée dans Zoho)

**Statut** : ✅ Terminé — séparation SRE (Charlotte diagnostique) / PM (Leon écrit dans Zoho)

---

## Phase 4 — Agents pipeline (Aria, Nox, Vera, Penpot, Domi)

Améliorations spécifiques après Phase 1 :

| Agent | Amélioration principale |
|---|---|
| **Aria** | ✅ _ntfy() + _langfuse_trace() + NTFY_AGENT_PASSWORD |
| **Nox** | ✅ _ntfy() + _langfuse_trace() + NTFY_AGENT_PASSWORD |
| **Vera** | ✅ qa_score 0-10 + _langfuse_score() + ntfy QA result |
| **Penpot** | ✅ _penpot() retry 3× exponentiel + _update_file() retry |
| **Domi** | ✅ _ntfy() + ntfy domain provisioned |
| **Dispatcher** | ✅ ntfy déjà présent — Vera qa_score dans ntfy approval |

**Statut** : ✅ Terminé — secret ntfy-agent-creds créé dans agent-system

---

## Phase 5 — Neo : améliorations mineures

Neo est déjà solide (streaming ✓, fast-path ✓, IMAP résilient ✓). Améliorations potentielles :
- Context window management (tronquer l'historique long)
- Compression des emails volumineux avant injection

**Statut** : 🔲 Basse priorité

---

## Ordre d'exécution recommandé

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
```

Phase 1 en premier car elle débloque la vitesse d'itération pour toutes les phases suivantes.

---

## Suivi

| Phase | Début | Fin | Notes |
|---|---|---|---|
| Phase 1 | — | — | |
| Phase 2 | — | — | |
| Phase 3 | — | — | |
| Phase 4 | — | — | |
| Phase 5 | — | — | |
