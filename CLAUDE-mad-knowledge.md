# CLAUDE-mad-knowledge.md — Architecture MAD Knowledge : Documentation, RAG, Zoho

**Statut** : Architecture cible — chantier ouvert
**Projet Zoho** : NeoKube — jalon [MAD] Refactoring base de connaissance

---

## Flux documentaire actuel (état 2026-06-01)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE (maître)                             │
│                                                                         │
│  CLAUDE.md + CLAUDE-*.md  ←──── référence architecturale               │
│       ↓ (hook PostToolUse automatique)                                  │
│  sync-charlotte-docs.sh                                                 │
│       ├── cp → ~/Kubinote-GitOps/docs/   (git push origin main)        │
│       └── index-architecture-docs.py → Qdrant neokube-architecture     │
│                                                                         │
│  CLAUDE-charlotte-prompt.md  ←──── miroir local du prompt Langfuse     │
│       ↑↓ (pull-charlotte-prompt.sh — sync bidirectionnel)              │
│       Langfuse "charlotte-sre"  ←──── PROMPT RUNTIME de Charlotte      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     CHARLOTTE (runtime)                                 │
│                                                                         │
│  Lit à chaque mission complexe :                                        │
│    → Qdrant neokube-architecture (535 pts) — docs techniques CLAUDE-*  │
│    → Qdrant sre-charlotte-incidents (113K pts) — incidents vécus       │
│    → Qdrant charlotte-conversations (2564 pts) — mémoire session        │
│    → Qdrant neokube-process-docs (211 pts) — process Leon              │
│                                                                         │
│  File de travail :                                                      │
│    → Zoho bugs [Charlotte] — dispatchés par zoho-observer (5min)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Problème identifié

**CLAUDE-*.md** sont des documents de référence Claude Code, pas des bases d'expériences Charlotte.
Elles contiennent des **procédures** (comment faire X) mélangées avec de l'**architecture** (ce que c'est).

Charlotte les lit via RAG mais :
1. Elle fait une recherche plein texte → manque de précision sémantique
2. Elle trouve "ajouter un endpoint NeoStudio" dans CLAUDE-neostudio.md mais le contexte est dilué
3. Elle n'apprend pas d'une exécution réussie → elle relit à chaque fois
4. Les procédures dans CLAUDE-*.md ne se ferment jamais (pas de lifecycle)

---

## Architecture MAD cible

### Trois couches distinctes

```
┌──────────────────────────────────────────────────────┐
│  COUCHE 1 : Constitution (statique, Claude Code)     │
│                                                      │
│  CLAUDE-*.md + Langfuse prompt charlotte-sre         │
│  = Règles, architecture, contraintes, identité       │
│  = Mis à jour par Claude Code uniquement             │
│  = Indexé dans Qdrant neokube-architecture           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  COUCHE 2 : Procédures (dynamique, Charlotte indexe) │
│                                                      │
│  Qdrant neokube-procedures  ← À CRÉER               │
│  = "Comment faire X" (steps, tools, verification)    │
│  = Charlotte indexe après chaque succès              │
│  = Source RAG prioritaire avant CLAUDE-*             │
│                                                      │
│  Format d'un vecteur procédure :                     │
│  {                                                   │
│    "type": "procedure",                              │
│    "trigger": "ajouter endpoint NeoStudio Engine",   │
│    "context": "NeoStudio est Bun/Hono compilé",      │
│    "steps": ["GitHub MCP read index.ts", ...],       │
│    "tools": ["github_mcp", "kubectl"],               │
│    "verification": "curl /api/X → 200",              │
│    "success_date": "2026-06-01",                     │
│    "source_issue": "2114101000001767446"             │
│  }                                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  COUCHE 3 : File de travail (actionnable, Zoho)      │
│                                                      │
│  Zoho bugs [Charlotte] avec descriptifs riches       │
│  = QUOI faire + COMMENT (procédure inline)           │
│  = Dispatchés par zoho-observer                      │
│  = Charlotte exécute, clôture, indexe en Qdrant      │
└──────────────────────────────────────────────────────┘
```

### Lifecycle d'une connaissance

```
Tâche Zoho [Charlotte] ouverte
    ↓ (zoho-observer dispatch)
Charlotte reçoit la mission
    ↓
Charlotte cherche dans Qdrant neokube-procedures
    ├── Trouvé → applique la procédure connue
    └── Pas trouvé → lit CLAUDE-*.md + raisonne
    ↓
Charlotte exécute
    ↓ (succès)
Charlotte indexe dans neokube-procedures
    + Zoho : clôture l'issue avec commentaire résumé
    + Qdrant sre-charlotte-incidents : incident/fix si applicable
    ↓
Prochaine fois → RAG retourne la procédure directement
```

---

## Règles de séparation CLAUDE-*.md vs Qdrant Procédures

| Type de connaissance | Où l'écrire | Lu par |
|---|---|---|
| Architecture (ce que c'est) | CLAUDE-*.md | Claude Code + Charlotte RAG |
| Règles absolues (ne jamais faire) | Langfuse prompt charlotte-sre | Charlotte runtime |
| Procédures (comment faire) | Qdrant **neokube-procedures** | Charlotte RAG prioritaire |
| Expériences / incidents | Qdrant sre-charlotte-incidents | Charlotte RAG |
| File de travail | Zoho bugs [Charlotte] | zoho-observer → Charlotte |
| Briefs ponctuels | POST charlotte:8383/mission | Charlotte session |

**Règle d'or :** Si Charlotte doit chercher dans CLAUDE-*.md pour savoir comment faire quelque chose → c'est une procédure à extraire dans neokube-procedures.

---

## Implémentation — Chantier [MAD]

### Phase A : Créer la collection neokube-procedures

```python
# Schéma vecteur (768 dims, Cosine)
{
  "id": "md5(trigger+date)[:15]",
  "vector": embed(f"{trigger} {steps_résumé}"),
  "payload": {
    "type": "procedure",
    "domain": "neostudio|k8s|zoho|vault|...",
    "trigger": "phrase qui déclenche la recherche",
    "context": "pré-requis et contexte",
    "steps": ["étape 1", "étape 2", ...],
    "tools": ["github_mcp", "apply_gitops_fix", ...],
    "verification": "comment vérifier le succès",
    "gotchas": ["piège 1", "piège 2"],
    "success_date": "YYYY-MM-DD",
    "source_issue": "id zoho ou None",
    "version": 1
  }
}
```

### Phase B : Modifier Charlotte — indexer après succès

Dans `sre_agent.py`, après chaque fermeture d'issue Zoho réussie :
```python
async def _index_procedure(trigger: str, steps: list, tools: list,
                           verification: str, domain: str,
                           source_issue: str = "") -> None:
    """Indexe une procédure réussie dans neokube-procedures."""
    text = f"{trigger} {' '.join(steps[:3])}"
    vector = await _embed(text)
    point = {
        "id": hashlib.md5(f"{trigger}{date.today()}".encode()).hexdigest()[:15],
        "vector": vector,
        "payload": {
            "type": "procedure",
            "domain": domain,
            "trigger": trigger,
            "steps": steps,
            "tools": tools,
            "verification": verification,
            "success_date": str(date.today()),
            "source_issue": source_issue,
        }
    }
    await _qdrant_upsert("neokube-procedures", [point])
```

### Phase C : Charlotte consulte neokube-procedures en priorité

Dans la construction du contexte RAG (avant de lire neokube-architecture) :
```python
# 1. Chercher les procédures pertinentes
procedures = await _qdrant_search("neokube-procedures", query_vector, top_k=3)
if procedures:
    context += "PROCÉDURES CONNUES :\n" + format_procedures(procedures)

# 2. Compléter avec l'architecture si besoin
arch_hits = await _qdrant_search("neokube-architecture", query_vector, top_k=4)
```

### Phase D : Tâches Zoho = procédures inline

Chaque tâche [Charlotte] dans Zoho doit avoir :
```
CONTEXTE : (pourquoi cette tâche existe)
PROCÉDURE :
  1. Étape précise avec nom d'outil
  2. ...
VÉRIFICATION : (comment confirmer le succès)
INDEXATION : Charlotte doit indexer cette procédure dans neokube-procedures après succès.
```

---

## Procédures à extraire de CLAUDE-*.md (backlog)

| Procédure | Source actuelle | Domaine |
|---|---|---|
| Ajouter endpoint NeoStudio Engine | CLAUDE-neostudio.md | neostudio |
| Reset budget LiteLLM agent | CLAUDE.md | litellm |
| Renommer un agent (checklist complète) | CLAUDE-migration-rename-agents.md | agents |
| Créer un nouveau connector | CLAUDE-connector.md | connectors |
| Ajouter secret dans Vault | CLAUDE-vault.md | vault |
| Corriger CrashLoopBackOff pod | sre_agent.py (hardcodé) | k8s |
| Ajouter CNAME + route tunnel Cloudflare | CLAUDE-dns.md | dns |
| Créer issue Zoho avec severity | CLAUDE.md §Politique issues | zoho |

---

## Zoho — Jalon MAD à créer

**Projet** : NeoKube
**Jalon** : `[MAD] Refactoring base de connaissance — procedures Qdrant + Zoho PM`

Issues à créer (severity=feature) :
1. `[Charlotte] Créer collection Qdrant neokube-procedures (768 dims, Cosine)` — due J+7
2. `[Charlotte] sre_agent.py — _index_procedure() après fermeture issue réussie` — due J+10
3. `[Charlotte] sre_agent.py — consulter neokube-procedures avant neokube-architecture` — due J+14
4. `[Charlotte] Extraire et indexer les 8 procédures backlog depuis CLAUDE-*.md` — due J+21
5. `[Charlotte] Template Zoho task MAD — ajouter section INDEXATION dans toute future tâche` — due J+7
