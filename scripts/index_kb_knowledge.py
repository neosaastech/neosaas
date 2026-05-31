#!/usr/bin/env python3
"""Index KB collections — dev-process + python-agent-patterns depuis le codebase."""
import os, json, uuid, httpx, asyncio, re

LITELLM_URL  = "http://litellm.cockpit.svc.cluster.local:4000"
LITELLM_KEY  = os.getenv("LITELLM_API_KEY", "sk-neokube-litellm-master")
QDRANT_URL   = "http://qdrant.rag-system.svc.cluster.local:6333"
EMBED_MODEL  = "nomic-embed-text"

async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{LITELLM_URL}/v1/embeddings",
            headers={"Authorization": f"Bearer {LITELLM_KEY}"},
            json={"model": EMBED_MODEL, "input": text[:1000]})
        data = r.json()["data"][0]["embedding"]
        return data[0] if data and isinstance(data[0], list) else data

async def upsert(collection: str, text: str, metadata: dict):
    vec = await embed(text)
    point_id = str(uuid.uuid4())
    async with httpx.AsyncClient(timeout=15) as c:
        await c.put(f"{QDRANT_URL}/collections/{collection}/points",
            json={"points": [{"id": point_id, "vector": vec,
                              "payload": {"text": text[:500], **metadata}}]})

def chunk(text: str, size=500, overlap=50) -> list[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += size - overlap
    return [c for c in chunks if len(c) > 50]

async def index_file(filepath: str, collection: str, source: str):
    try:
        with open(filepath) as f:
            content = f.read()
        chunks = chunk(content)
        for i, ch in enumerate(chunks):
            await upsert(collection, ch, {"source": source, "chunk": i})
        print(f"✅ {source}: {len(chunks)} chunks → {collection}")
    except Exception as e:
        print(f"❌ {source}: {e}")

async def index_codebase_patterns(collection: str):
    """Extraire les patterns Python depuis les agents NeoKube."""
    patterns = []
    
    # Patterns FastAPI
    patterns.append({
        "text": """FastAPI pattern NeoKube — endpoint /health obligatoire avant catch-all:
@app.get("/health")
def health():
    return {"status": "ok", "agent": AGENT_NAME, "version": VERSION}

# JAMAIS mettre le catch-all avant /health (anti-pattern #62)
@app.api_route("/{path:path}", methods=["GET","POST"])
async def proxy(path: str, request: Request):
    method = request.method  # request.method, pas method: str param (anti-pattern #63)
    ...""",
        "source": "python-patterns/fastapi"
    })
    
    patterns.append({
        "text": """MissionRequest NeoKube — schéma standard TOUS agents:
# Champ = message (pas mission — confusion endpoint /mission vs champ body)
class MissionRequest(BaseModel):
    message: str
    session_id: str | None = None
    interface: str = "openwebui"
    context: dict = {}
    zoho_task_id: str = ""      # → fermer la tâche après traitement
    zoho_project_id: str = ""
    zoho_task_name: str = ""

@app.post("/mission")
async def mission(body: MissionRequest):
    message = body.message  # PAS body.get("mission", ...)""",
        "source": "python-patterns/mission-request"
    })
    
    patterns.append({
        "text": """PydanticAI Agent NeoKube — FallbackModel obligatoire:
from pydantic_ai import Agent
from pydantic_ai.models.fallback import FallbackModel

agent = Agent(
    model=FallbackModel(
        "openai:gpt-4o",           # primaire
        "mistral:mistral-large",   # fallback
    ),
    system_prompt=SYSTEM_PROMPT,
    retries={"tools": 2},          # PAS tool_retries= (deprecated PydanticAI v2)
)

# Usage
result = await agent.run(message, message_history=history, deps=deps)
final = str(result.output)""",
        "source": "python-patterns/pydantic-ai"
    })
    
    patterns.append({
        "text": """Temporal Worker NeoKube — pattern + uvicorn gather:
from temporalio.client import Client
from temporalio.worker import Worker
from temporalio.worker.workflow_sandbox import UnsandboxedWorkflowRunner

async def main():
    client = await Client.connect(
        os.getenv("TEMPORAL_HOST", "temporal.agent-system.svc.cluster.local:7233"),
        namespace=os.getenv("TEMPORAL_NAMESPACE", "dispatcher"),
    )
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        activities=[my_activity],
        workflows=[MyWorkflow],
        workflow_runner=UnsandboxedWorkflowRunner(),
    )
    config = uvicorn.Config(app, host="0.0.0.0", port=AGENT_PORT, log_level="warning")
    server = uvicorn.Server(config)
    await asyncio.gather(worker.run(), server.serve())  # toujours gather""",
        "source": "python-patterns/temporal-worker"
    })
    
    patterns.append({
        "text": """httpx NeoKube — appel service interne fire-and-forget:
import httpx

# Timeout explicite TOUJOURS — jamais de timeout infini
async with httpx.AsyncClient(timeout=30.0) as c:
    r = await c.post(f"{SERVICE_URL}/endpoint",
        json={"message": "...", **zoho_ctx})  # message pas mission

# Fire-and-forget (observer dispatch) — accepter ReadTimeout
try:
    await c.post(f"{agent_url}/mission",
        json={"message": text},
        timeout=httpx.Timeout(connect=5.0, read=3.0, write=3.0, pool=3.0))
except httpx.ReadTimeout:
    pass  # Agent a bien reçu, traite en async""",
        "source": "python-patterns/httpx"
    })
    
    patterns.append({
        "text": """Vault injection NeoKube — credentials via Vault agent:
# Dans le deployment K8s, Vault agent injecte les secrets comme fichiers
# Les agents lisent via os.getenv() — jamais de secrets hardcodés

LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "")
ZOHO_ENGINE_URL = os.getenv("ZOHO_ENGINE_URL",
    "http://zoho-engine.connector-system.svc.cluster.local:8000")

# Pattern d'accès zoho-engine (centralisé, jamais appel Zoho direct)
async def _zoho_api(method: str, path: str, data: dict | None = None):
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{ZOHO_ENGINE_URL}/proxy",
            json={"method": method, "path": path, "data": data or {}})
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Zoho {method} {path}: HTTP {r.status_code}")
    return r.json()""",
        "source": "python-patterns/vault-secrets"
    })
    
    for p in patterns:
        await upsert(collection, p["text"], {"source": p["source"], "chunk": 0})
    print(f"✅ python-agent-patterns: {len(patterns)} patterns indexés")

async def main():
    # 1. Index CLAUDE-dev-process.md → dev-process
    await index_file("/home/neokube-beta/CLAUDE-dev-process.md", 
                     "dev-process", "CLAUDE-dev-process.md")
    
    # 2. Index CLAUDE-antipatterns.md → dev-process
    antip = "/home/neokube-beta/CLAUDE-antipatterns.md"
    if os.path.exists(antip):
        await index_file(antip, "dev-process", "CLAUDE-antipatterns.md")
    
    # 3. Python patterns → python-agent-patterns
    await index_codebase_patterns("python-agent-patterns")
    
    # 4. Index CLAUDE-agents.md → k8s-knowledge (contient beaucoup de K8s)
    await index_file("/home/neokube-beta/CLAUDE-agents.md",
                     "k8s-knowledge", "CLAUDE-agents.md")
    
    # 5. Index CLAUDE-services.md → k8s-knowledge
    await index_file("/home/neokube-beta/CLAUDE-services.md",
                     "k8s-knowledge", "CLAUDE-services.md")
    
    print("\n=== Résumé ===")
    for col in ["k8s-knowledge","temporal-knowledge","python-agent-patterns","dev-process"]:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{QDRANT_URL}/collections/{col}")
            count = r.json().get('result',{}).get('points_count','?')
            print(f"  {col}: {count} points")

asyncio.run(main())
