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

Neo est déjà solide (streaming ✓, fast-path ✓, IMAP résilient ✓).

**Réalisé :**
- [x] 5a. Context window management : `/v1/chat/completions` tronque l'historique à system + 20 derniers messages max
- [x] 5b. Compression des emails volumineux : `_poll_imap()` tronque corps > 3000 chars avant injection dans `_run_agent`

**Statut** : ✅ Terminé — contexte OWU borné, emails volumineux tronqués

---

## Ordre d'exécution recommandé

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

Phase 1 en premier car elle débloque la vitesse d'itération pour toutes les phases suivantes.

---

## Phase 6 — Charlotte v4.0 : qualité conversations + Bloc F (2026-05-14)

Améliorations de la qualité de l'expérience conversationnelle de Charlotte :

### 6a. Fix streaming — run_stream() → run() + émission mot-par-mot

**Problème** : `run_stream()+stream_text(delta=True)` fuitait les tokens tool-call JSON avec mistral via LiteLLM (ex : `list_cluster_state ব্যক{}`). Voir antipattern #39.

**Fix** : `charlotte_agent.run()` bloquant + émission mot-par-mot du texte final.

- [x] Remplacer `run_stream` par `run()` dans `/mission/stream`
- [x] Émission `{"type": "token", "text": word}` mot-par-mot après réception du résultat complet

**Statut** : ✅ Terminé

### 6b. Classificateur LLM 5 classes — remplacement string matching (antipattern #40)

**Problème** : string matching (`"accès"`, `"as-tu"`) ne couvre pas les variantes linguistiques (`"acces"`, `"as tu"`, etc.). Architecture fragile et non maintenable.

**Fix** : `_classify_message(msg)` — appel Mistral (LLM_SCAN_MODEL, max 10 tokens) retourne un label parmi `greeting | access_zoho | access_cluster | question | task`.

- [x] Implémenter `_classify_message()` + `_INTENT_LABELS`
- [x] Routing switch : 5 branches avec `effective_message` injecté avant `agent.run()`
- [x] `greeting` → 2 phrases, sans outil (latence ~4s)
- [x] `access_zoho` / `access_cluster` → pré-exécution outil + injection résultat (démontre, ne décrit pas)
- [x] `question` → contrainte 3 points MAX, pas de YAML ni sections
- [x] `task` → ReAct loop complet inchangé

**Statut** : ✅ Terminé

### 6c. Bloc F — CharlotteImprovementWorkflow (auto-amélioration hebdomadaire)

**Problème** : l'amélioration de Charlotte est entièrement manuelle. Il n'y a pas de système qui analyse automatiquement la qualité des conversations et propose des pistes.

**Solution** : workflow Temporal hebdomadaire qui collecte les conversations sous-optimales depuis Qdrant, les analyse via Mistral, et publie un rapport dans Zoho + ntfy.

**Architecture** :
- `sre_collect_conversation_samples` — scroll Qdrant `charlotte-conversations` (rôle=assistant), flag `verbose` / `json_artifact` / `tool_described` / `over_structured`
- `sre_analyze_quality_patterns` — Mistral identifie 3-5 patterns récurrents + fix proposé (JSON)
- `sre_publish_improvement_report` — tâche Zoho dans projet NeoKube + ntfy (priorité low)
- `CharlotteImprovementWorkflow` — enchaîne les 3, skip si < 3 échantillons
- Schedule hebdomadaire `ScheduleCalendarSpec` dimanche 3h UTC

**Règle** : Charlotte **propose** des améliorations. Elle ne se modifie jamais elle-même (`_is_charlotte_file()` guard).

- [x] 3 activités + workflow implémentés dans `sre_agent_v4.py`
- [x] Schedule hebdomadaire créé dans `run_schedule_loop`
- [x] Enregistrement dans le worker `main()`
- [x] ConfigMap rebuilt (357 KB) + `kubectl replace` + redémarrage Charlotte
- [x] Charlotte 3/3 Running — imports Bloc F vérifiés

**Statut** : ✅ Terminé

---

## Suivi

| Phase | Début | Fin | Notes |
|---|---|---|---|
| Phase 1 | 2026-05-13 | 2026-05-13 | image 150MB, restart ~15s |
| Phase 2 | 2026-05-13 | 2026-05-13 | compress Mistral 8KB→400 chars |
| Phase 3 | 2026-05-13 | 2026-05-13 | Leon /sre-task testé HTTP 200 |
| Phase 4 | 2026-05-13 | 2026-05-13 | ntfy+Langfuse+Penpot retry |
| Phase 5 | 2026-05-13 | 2026-05-13 | Neo hist 20 msgs + email 3000 chars |
| Phase 6 | 2026-05-14 | 2026-05-14 | streaming fix + classificateur 5 classes + Bloc F auto-amélioration |
