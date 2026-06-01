"""
NeoKube Agent Eval CronJob v1.0
Évalue les 9 agents via LLM-as-judge, poste les scores dans Langfuse,
envoie une alerte ntfy si dégradation détectée (avg < EVAL_THRESHOLD).
Credentials lus depuis les env vars K8s — aucun kubectl, aucun secret hardcodé.
"""
import asyncio, base64, json, os, time, uuid
import httpx

LITELLM_URL   = os.getenv("LITELLM_URL",   "http://litellm.cockpit.svc.cluster.local:4000")
LANGFUSE_URL  = os.getenv("LANGFUSE_URL",  "http://langfuse.cockpit.svc.cluster.local:3000")
NTFY_URL      = os.getenv("NTFY_URL",      "http://ntfy.interfaces.svc.cluster.local/neokube-alerts")
NTFY_USER     = os.getenv("NTFY_USER",     "agent")
VAULT_ADDR    = os.getenv("VAULT_ADDR",    "http://vault.security.svc.cluster.local:8200")
VAULT_TOKEN   = os.getenv("VAULT_TOKEN",   "")
JUDGE_KEY     = os.getenv("LITELLM_KEY_EVAL_JUDGE", "")
LF_PK         = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LF_SK         = os.getenv("LANGFUSE_SECRET_KEY", "")
THRESHOLD     = float(os.getenv("EVAL_THRESHOLD", "7.5"))
JUDGE_MODEL   = "mistral"

# ── Credentials par agent ────────────────────────────────────────────────
AGENT_KEYS = {
    "leon":       os.getenv("LITELLM_KEY_LEON",       ""),
    "charlotte":  os.getenv("LITELLM_KEY_CHARLOTTE",  ""),
    "vera":       os.getenv("LITELLM_KEY_VERA",       ""),
    "neo":        os.getenv("LITELLM_KEY_NEO",        ""),
    "camille":    os.getenv("LITELLM_KEY_CAMILLE",    ""),
    "guillaume":  os.getenv("LITELLM_KEY_GUILLAUME",  ""),
    "alain":      os.getenv("LITELLM_KEY_ALAIN",      ""),
    "dispatcher": os.getenv("LITELLM_KEY_DISPATCHER", ""),
    "domi":       os.getenv("LITELLM_KEY_DOMI",       ""),
    # penpot supprimé — microservice sans LLM (penpot-engine v1.0)
}

AGENT_MODELS = {
    "leon": "gpt-4o", "charlotte": "mistral", "vera": "mistral-large-2407",
    "neo": "mistral-large-2407", "camille": "codestral", "guillaume": "codestral", "alain": "codestral",
    "dispatcher": "mistral", "domi": "mistral",
}

LANGFUSE_PROMPTS = {
    # Charlotte exclue : son prompt Langfuse (31K chars) dépasse les capacités eval de mistral → fallback suffisant
    "leon": "leon-pm", "vera": "vera-qa",
    "neo": "neo-assistant", "dispatcher": "dispatcher-orchestrator",
}

FALLBACK_PROMPTS = {
    "leon": "Tu es Leon, Gardien de la Cohérence chez NeoKube. Tu pilotes les projets SaaS en vérifiant la cohérence entre 3 piliers : Zoho (plan/tâches) ↔ GitHub (code/branches) ↔ Vercel (déploiement). RÈGLE ABSOLUE : dès que tu listes des tâches Zoho, tu DOIS vérifier si chaque tâche ouverte a une branche ou un commit GitHub correspondant. Si ce n'est pas le cas, tu DOIS signaler les tâches orphelines SANS qu'on te le demande, dans une section '⚠️ Alertes de cohérence'. Tu ne déploies jamais de code.",
    "charlotte": "Tu es Charlotte, SRE chez NeoKube. Tu surveilles le cluster Kubernetes, diagnostiques les incidents et proposes des remédiations. Tu utilises admin-sys pour les actions cluster.",
    "vera": "Tu es Vera, QA Reviewer chez NeoKube. Tu analyses les livrables Camille/Guillaume/Alain/Penpot et produis un rapport qualité structuré avec score /10.",
    "neo": "Tu es Neo, assistant de Charles chez Neomnia. Tu accèdes à l'infrastructure NeoKube via des outils réels. Webmail : https://webmail.neokube.fr. Chat : https://chat.neokube.fr.",
    "camille": "Tu es Camille, Frontend Builder chez NeoKube. Tu crées des repos GitHub depuis neomnia/template-nextjs (Next.js 15, TypeScript, Tailwind) et déploies sur Vercel.",
    "guillaume": "Tu es Guillaume, Backend Builder chez NeoKube. Tu crées des repos depuis neomnia/template-fastapi (FastAPI + asyncpg). CONTRAINTE CRITIQUE : tu ne crées jamais de nouveau projet Neon — tu utilises TOUJOURS le projet existant NeoBridge et crées une branche Neon par projet client (via mcp.neon.tech). La connection string Neon est transmise à Alain pour injection dans Vercel.",
    "alain": "Tu es Alain, DevOps Projet chez NeoKube. Tu t'exécutes après Camille (frontend) et Guillaume (backend). Tes 3 tâches : (1) créer workflows CI/CD GitHub Actions (lint → test → build → deploy), (2) injecter les variables d'environnement dans Vercel (NEON_DATABASE_URL, API_URL, etc.) via vercel-connector, (3) injecter la Neon connection string de Guillaume dans le projet Vercel. Scope variables : production + preview.",
    "dispatcher": "Tu es Dispatcher, orchestrateur DevProjectWorkflow. Flux exact : (1) validate_spec, (2) parallel[Camille+Guillaume+Alain+Penpot+Domi, return_exceptions=True], (3) Vera QA, (4) signal humain bloquant (approval/reject, 24h timeout), (5) deploy. RÈGLES : Penpot/Domi sont NON-BLOQUANTS — si Penpot échoue, le workflow CONTINUE. Vera 'rejected' = avertissement QA seulement, PAS un arrêt du workflow — le signal humain décide. Tu n'accèdes jamais directement au cluster K8s.",
    "domi": "Tu es Domi, Domain Infrastructure Manager chez NeoKube. Deux modes : subdomain (CNAME {slug}.neomnia.net → Cloudflare, gratuit) ou register (achat domaine via Openprovider, zone CF + NS update). Après signal humain 'approved' dans le workflow : tu lies le domaine au projet Vercel avec domi_link_vercel_domain (POST /projects/{id}/domains via vercel-connector). Alertes renouvellement : domaine expire < 30j → alerte ntfy urgent + tentative auto-renouvellement via openprovider-connector.",
}

SCENARIOS = {
    "leon": [
        ("Qu'est-ce qu'une 'tâche orpheline' et comment la signales-tu dans ta réponse ?",
         "Tâche orpheline = tâche Zoho 'In Progress' sans branche ou commit GitHub correspondant. Doit mentionner la section '⚠️ Alertes de cohérence' ou équivalent. Détection automatique, sans attendre qu'on demande."),
        ("Comment vérifies-tu qu'un projet SaaS est en bonne santé entre Zoho, GitHub et Vercel ?",
         "Doit décrire la vérification des 3 piliers : Zoho (tâches/plan), GitHub (branches/commits/PR), Vercel (déploiements). Mention de la détection d'incohérences automatique entre les piliers."),
        ("Un client te demande le statut du projet Industrio SAS. Quels 3 éléments vérifies-tu systématiquement ?",
         "Doit vérifier les 3 piliers dans sa réponse : (1) tâches Zoho et leur avancement, (2) branches GitHub actives et commits récents, (3) état des déploiements Vercel. Réponse structurée autour de ces 3 axes."),
    ],
    "charlotte": [
        ("Un pod est en CrashLoopBackOff. Quelle est ta procédure de diagnostic ?",
         "Doit mentionner : récupérer les logs du pod et les events (kubectl describe ou admin-sys). Distinguer OOMKill (mémoire) vs erreur applicative (code/config). Proposer une action de remédiation (rollout restart, fix config, escalade)."),
        ("Comment vérifies-tu que le backup nightly s'est bien exécuté ?",
         "Doit mentionner : vérifier le CronJob neokube-nightly-backup, regarder le status du dernier job (Succeeded/Failed), inspecter les logs. Mentionner admin-sys ou kubectl."),
        ("LiteLLM est en CrashLoopBackOff. Quel est ton premier réflexe ?",
         "Doit analyser les logs LiteLLM et distinguer deux causes : quota LLM épuisé (clés invalides) vs OOMKill (mémoire). Proposer une action selon la cause identifiée. Pas une réponse générique 'rollout restart' sans diagnostic."),
    ],
    "vera": [
        ("Camille a livré un repo Next.js sans fichier robots.txt. Quel score QA attribues-tu et pourquoi ?",
         "Doit baisser le score (SEO critique manquant). Score max 7/10. Recommandation précise pour Camille."),
        ("Tous les livrables sont conformes. Camille/Guillaume/Alain/Penpot OK. Score global ?",
         "Doit donner un score élevé (>= 8/10). Mentionner les livrables vérifiés : frontend Camille, backend Guillaume, DevOps Alain, design Penpot."),
        ("Comment distingues-tu un 'rejected' d'un 'approved with warnings' ?",
         "Doit définir : rejected = erreurs bloquantes (sécurité, build cassé). Approved with warnings = améliorations souhaitables."),
    ],
    "neo": [
        ("Quelle est l'URL publique du webmail NeoKube et comment se connecter ?",
         "Doit donner : https://webmail.neokube.fr. Mentionner les credentials IMAP @neokube.fr."),
        ("Quel outil Notion utilises-tu pour lire le contenu d'une page ? Et pour remplacer tout le contenu ?",
         "Lire = notion_read_content (avant toute modification). Remplacer = notion_replace_content. Deux outils distincts avec leurs usages corrects."),
        ("Quel agent NeoKube dois-je contacter pour un problème d'infrastructure Kubernetes ou un incident cluster ?",
         "Doit répondre : Charlotte (SRE, port 8383). Charlotte est responsable du cluster K8s, incidents, monitoring. Pas Leon (Chef de Projet)."),
    ],
    "camille": [
        ("Quel est le template GitHub que tu utilises ? Quelles sont les 3 premières pages que tu crées dans un site vitrine 5-pages (Home, Services, À Propos, Contact, Blog) ?",
         "Doit mentionner : neomnia/template-nextjs (Next.js 15, TypeScript, Tailwind). Les 5 pages dans app/ avec App Router. Pas de Pages Router. Structure correcte Next.js 15."),
        ("Quel template GitHub utilises-tu pour créer le repo frontend et quel outil de deploy ?",
         "Doit mentionner : neomnia/template-nextjs. Deploy sur Vercel via vercel-connector. Projet Vercel créé."),
        ("Génère un layout app/layout.tsx avec GoogleFonts (Inter), metadata SEO, et un header sticky simple.",
         "Code Next.js 15 App Router correct. Metadata complètes. Header sticky Tailwind. Pas de use client inutile."),
    ],
    "guillaume": [
        ("Quel est ton template GitHub et pourquoi ne crées-tu jamais un nouveau projet Neon ?",
         "Doit mentionner : neomnia/template-fastapi. Contrainte Neon : POST /projects bloqué (org managed by Vercel) → on crée une BRANCHE sur le projet existant NeoBridge. Connection string transmise à Alain."),
        ("Quel template GitHub utilises-tu pour le backend et comment crées-tu la base de données ?",
         "Doit mentionner : neomnia/template-fastapi. Neon branch créée via mcp.neon.tech. Connection string injectée."),
        ("Génère un .env.example pour FastAPI + Neon asyncpg avec JWT et CORS.",
         "Variables : DATABASE_URL, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, ALLOWED_ORIGINS."),
    ],
    "alain": [
        ("Quel est ton rôle dans le pipeline DevProjectWorkflow ?",
         "Doit mentionner : CI/CD GitHub Actions, env vars Vercel, Neon connection string. S'exécute après Camille et Guillaume."),
        ("Quels workflows GitHub Actions crées-tu pour le CI/CD d'un projet frontend+backend ? Donne les étapes principales.",
         "Doit couvrir les étapes CI/CD : lint, test, build, deploy. Mention de GitHub Actions YAML. Au moins un workflow pour le frontend (Vercel) et un pour le backend."),
        ("Un GitHub Actions workflow échoue sur le lint. Quelle est ta procédure ?",
         "Doit mentionner : lire les logs Actions, identifier l'erreur, corriger le workflow YAML, re-trigger."),
    ],
    "dispatcher": [
        ("Décris les 5 étapes principales du DevProjectWorkflow dans l'ordre (Camille/Guillaume/Alain).",
         "Doit lister dans l'ordre : validate_spec, puis Camille+Guillaume+Alain+Penpot+Domi en parallèle (avec return_exceptions=True), puis Vera QA, puis signal humain bloquant (approval), puis deploy. Les 5 étapes dans le bon ordre."),
        ("Penpot a retourné une erreur. Le workflow s'arrête-t-il ?",
         "Doit répondre : NON. Penpot est non-bloquant (return_exceptions=True). Le workflow continue sans le design."),
        ("Vera a retourné rejected. Quelle est la prochaine étape ?",
         "Doit mentionner : notify_approval attend le signal humain. Vera rejected = avertissement, pas un stop automatique."),
    ],
    "domi": [
        ("Quelle est la différence entre domain_mode subdomain et register ?",
         "subdomain = CNAME {slug}.neomnia.net dans CF. register = achat domaine Openprovider + zone CF + NS."),
        ("Un domaine expire dans 15 jours. Quelle action Domi déclenche-t-elle ?",
         "Doit mentionner : alerte ntfy urgent (< 30j). Tentative de renouvellement via openprovider-connector."),
        ("Après que le signal humain 'approved' a été reçu dans le workflow, quelle action DNS fais-tu avec Vercel ?",
         "Doit mentionner : lier le domaine au projet Vercel (domi_link_vercel_domain). Via vercel-connector. Exécuté après le signal humain. Explication du pourquoi (après deploy car le projet Vercel doit exister)."),
    ],
}

# ── Langfuse helpers ─────────────────────────────────────────────────────
def _lf_auth() -> str:
    return base64.b64encode(f"{LF_PK}:{LF_SK}".encode()).decode()

async def _fetch_prompt(name: str) -> str:
    if not (LF_PK and LF_SK):
        return ""
    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get(
                f"{LANGFUSE_URL}/api/public/v2/prompts/{name}",
                headers={"Authorization": f"Basic {_lf_auth()}"},
            )
            if r.status_code == 200:
                return r.json().get("prompt", "")
    except Exception:
        pass
    return ""

async def _post_score(agent: str, avg: float, comment: str) -> None:
    if not (LF_PK and LF_SK):
        return
    try:
        auth = _lf_auth()
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                f"{LANGFUSE_URL}/api/public/traces",
                params={"name": f"{agent}-eval", "limit": 1, "orderBy": "timestamp.DESC"},
                headers={"Authorization": f"Basic {auth}"},
            )
            traces = r.json().get("data", [])
            if not traces:
                return
            await c.post(
                f"{LANGFUSE_URL}/api/public/scores",
                headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
                content=json.dumps({
                    "id": str(uuid.uuid4()), "traceId": traces[0]["id"],
                    "name": "eval_avg", "value": avg / 10.0,
                    "comment": comment, "dataType": "NUMERIC", "source": "API",
                }).encode(),
            )
    except Exception:
        pass

# ── ntfy helper ──────────────────────────────────────────────────────────
async def _ntfy(title: str, message: str, priority: str = "default", tags: list | None = None) -> None:
    ntfy_pass = ""
    if VAULT_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{VAULT_ADDR}/v1/secret/data/neokube/apps/ntfy",
                                headers={"X-Vault-Token": VAULT_TOKEN})
                if r.status_code == 200:
                    ntfy_pass = r.json()["data"]["data"].get("NTFY_AGENT_PASSWORD", "")
        except Exception:
            pass
    headers = {"Title": title, "Priority": priority}
    if tags:
        headers["Tags"] = ",".join(tags)
    try:
        auth = (NTFY_USER, ntfy_pass) if ntfy_pass else None
        async with httpx.AsyncClient(timeout=5) as c:
            await c.post(NTFY_URL, content=message.encode("utf-8"), headers=headers, auth=auth)
    except Exception:
        pass

# ── LLM call ─────────────────────────────────────────────────────────────
async def _call_llm(agent: str, model: str, system_prompt: str, question: str) -> str:
    key = AGENT_KEYS.get(agent, "")
    if not key:
        return ""
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(
                f"{LITELLM_URL}/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question},
                    ],
                    "user": agent,
                    "metadata": {
                        "agent": agent, "agent_email": f"{agent}@neokube.fr",
                        "trace_name": f"{agent}-eval",
                        "tags": [f"agent:{agent}", "eval", "neokube-evals", "automated-nightly"],
                    },
                },
            )
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"ERROR:{e}"

async def _judge(question: str, response: str, criteria: str) -> tuple[float, float, float, str]:
    if not JUDGE_KEY or response.startswith("ERROR:") or not response:
        return 0.0, 0.0, 0.0, "skip"
    prompt = (
        f"Évalue cette réponse d'agent IA sur 3 critères (0-10 chacun).\n"
        f"Question : {question}\nCritères : {criteria}\nRéponse : {response[:1500]}\n"
        f"Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de texte avant/après) : "
        f"{{\"relevance\":X,\"quality\":X,\"instructions\":X,\"comment\":\"...\"}}"
    )
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=40) as c:
                r = await c.post(
                    f"{LITELLM_URL}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {JUDGE_KEY}"},
                    json={
                        "model": JUDGE_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "user": "eval-judge",
                        "metadata": {"trace_name": "eval-judge-nightly", "tags": ["eval", "judge", "automated-nightly"]},
                    },
                )
            raw = r.json()["choices"][0]["message"]["content"]
            start = raw.find("{"); end = raw.rfind("}") + 1
            d = json.loads(raw[start:end])
            return float(d.get("relevance", 0)), float(d.get("quality", 0)), float(d.get("instructions", 0)), d.get("comment", "")
        except Exception:
            if attempt == 1:
                return 0.0, 0.0, 0.0, "judge_error"
    return 0.0, 0.0, 0.0, "judge_error"

# ── Eval d'un agent ───────────────────────────────────────────────────────
async def eval_agent(agent: str) -> float:
    model = AGENT_MODELS.get(agent, "mistral")
    lf_name = LANGFUSE_PROMPTS.get(agent, "")
    system_prompt = ""
    if lf_name:
        system_prompt = await _fetch_prompt(lf_name)
    if not system_prompt:
        system_prompt = FALLBACK_PROMPTS.get(agent, f"Tu es {agent}, agent NeoKube.")

    scenarios = SCENARIOS.get(agent, [])
    scores = []
    for question, criteria in scenarios:
        t0 = time.time()
        response = await _call_llm(agent, model, system_prompt, question)
        rel, qual, inst, comment = await _judge(question, response, criteria)
        avg = round((rel + qual + inst) / 3, 1)
        scores.append(avg)
        lat = round(time.time() - t0, 1)
        print(f"  {agent}[{len(scores)}] avg={avg:.1f} ({lat:.1f}s) — {comment[:60]}")

    agent_avg = round(sum(scores) / len(scores), 1) if scores else 0.0
    await _post_score(agent, agent_avg,
                      f"nightly avg={agent_avg:.1f}/10 scores={scores} model={model}")
    return agent_avg

# ── Main ─────────────────────────────────────────────────────────────────
async def main() -> None:
    print("=== NeoKube Agent Eval Nightly ===")
    if not JUDGE_KEY:
        print("ERREUR : LITELLM_KEY_EVAL_JUDGE manquant")
        return

    results: dict[str, float] = {}
    agents = list(AGENT_KEYS.keys())
    for agent in agents:
        print(f"\n▶ {agent.upper()} ({AGENT_MODELS.get(agent, '?')})")
        try:
            avg = await eval_agent(agent)
            results[agent] = avg
            status = "✅" if avg >= THRESHOLD else "⚠️ "
            print(f"  → {status} {avg:.1f}/10")
        except Exception as e:
            results[agent] = 0.0
            print(f"  → ❌ ERREUR: {e}")

    # Rapport final
    print("\n=== RAPPORT FINAL ===")
    degraded = []
    for agent, score in sorted(results.items(), key=lambda x: x[1], reverse=True):
        flag = "✅" if score >= THRESHOLD else "⚠️ "
        print(f"  {flag} {agent:<14} {score:.1f}/10")
        if score < THRESHOLD:
            degraded.append((agent, score))

    global_avg = round(sum(results.values()) / len(results), 1) if results else 0.0
    print(f"\n  Moyenne globale : {global_avg:.1f}/10")

    # Alerte ntfy si dégradation
    if degraded:
        lines = [f"Score moyen global : {global_avg:.1f}/10", ""]
        lines.append("Agents dégradés (< " + str(THRESHOLD) + ") :")
        for agent, score in degraded:
            lines.append(f"  ⚠️  {agent} : {score:.1f}/10")
        lines.append("")
        lines.append("Vérifier Langfuse : https://langfuse.neokube.fr")
        await _ntfy(
            title=f"⚠️ Eval agents : {len(degraded)} dégradé(s)",
            message="\n".join(lines),
            priority="high",
            tags=["warning", "robot", "eval", "degradation"],
        )
        print(f"\n⚠️  Alerte ntfy envoyée ({len(degraded)} agent(s) dégradé(s))")
    else:
        print("\n✅ Tous les agents au-dessus du seuil — pas d'alerte")

if __name__ == "__main__":
    asyncio.run(main())
