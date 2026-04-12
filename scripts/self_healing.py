"""
SelfHealingAgent — Diagnostic automatique des erreurs K8s NeoKube.

Stratégie (du plus rapide au plus coûteux) :
  1. Pattern matching      → réponse instantanée, zéro coût
  2. KnowledgeDB lookup    → SQLite RAG sur incidents passés
  3. ModelRouter (LLM)     → Anthropic → fallback Mistral (dernier recours)

Chaque décision est auditée : source, modèle, latence, fallback.
"""
import re
import json
import logging
import time
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from knowledge_db import KnowledgeDB
    from model_router  import ModelRouter

log = logging.getLogger("self-healing")

# ── Patterns d'erreurs K8s connus ────────────────────────────────────────────
# Clé : substring recherché (lowercase)
# tag  : label pour la recherche KB
# hint : solution rapide sans LLM
ERROR_PATTERNS: dict[str, dict] = {
    "x509": {
        "tag": "tls",
        "hint": "Échec de vérification de certificat TLS. "
                "Vérifiez cert-manager ou régénérez le kubeconfig : "
                "sudo k3s kubectl config view --raw > ~/.kube/config",
    },
    "certificate signed by unknown": {
        "tag": "tls",
        "hint": "CA non reconnue. Ajoutez le certificat à /etc/ssl/certs/ "
                "ou configurez insecureSkipTLSVerify dans kubeconfig.",
    },
    "connection refused": {
        "tag": "network",
        "hint": "Service injoignable. Vérifiez le statut du pod : "
                "kubectl get pods -A | grep -v Running",
    },
    "no route to host": {
        "tag": "network",
        "hint": "Problème de routage réseau. Vérifiez le CNI (Flannel/Calico) "
                "et les NetworkPolicies.",
    },
    "errimageneverp": {
        "tag": "image",
        "hint": "Image absente de containerd. Exécutez : "
                "docker save <image> | sudo ctr -n k8s.io images import -",
    },
    "back-off pulling image": {
        "tag": "image",
        "hint": "Échec de pull image. Vérifiez le nom de l'image et les "
                "credentials registry (ImagePullSecret).",
    },
    "oomkilled": {
        "tag": "resources",
        "hint": "Pod tué par OOM. Augmentez les limits mémoire dans le manifest "
                "et vérifiez les fuites avec : kubectl top pods -A",
    },
    "crashloopbackoff": {
        "tag": "crash",
        "hint": "Boucle de crash. Inspectez les logs : "
                "kubectl logs <pod> --previous -n <ns>",
    },
    "pending": {
        "tag": "scheduling",
        "hint": "Pod en attente. Vérifiez les ressources nœud : "
                "kubectl describe node kubinote | grep -A5 Allocated",
    },
    "unauthorized": {
        "tag": "auth",
        "hint": "Token invalide ou expiré. Régénérez le token de service account.",
    },
    "forbidden": {
        "tag": "rbac",
        "hint": "Permission RBAC refusée. Vérifiez ClusterRoleBinding : "
                "kubectl get clusterrolebinding | grep <service-account>",
    },
    "timeout": {
        "tag": "network",
        "hint": "Timeout réseau. Vérifiez la connectivité inter-pods et les "
                "probes (liveness/readiness).",
    },
    "imagepullbackoff": {
        "tag": "image",
        "hint": "Impossible de puller l'image. Vérifiez que l'image existe "
                "localement ou dans le registry.",
    },
    "evicted": {
        "tag": "resources",
        "hint": "Pod évincé (disque ou mémoire saturés). Libérez de l'espace : "
                "df -h && docker system prune -f",
    },
}

_SRE_SYSTEM_PROMPT = """\
Tu es un expert SRE pour NeoKube (K3s sur Ubuntu, namespace open-webui).
Analyse l'erreur suivante et fournis un diagnostic et une solution actionnables.
Réponds UNIQUEMENT en JSON valide sur une ligne :
{"diagnosis": "...", "solution": "...", "severity": "low|medium|high"}
Ne mets aucun texte en dehors du JSON.
"""


class SelfHealingAgent:
    """
    Diagnostique des erreurs K8s en 3 étapes :
      1. Pattern matching (instantané)
      2. KnowledgeDB (RAG SQLite)
      3. LLM via ModelRouter (Anthropic → Mistral)
    """

    def __init__(self, kb: "KnowledgeDB", router: "ModelRouter") -> None:
        self._kb     = kb
        self._router = router

    def diagnose(
        self,
        log_line:  str,
        namespace: str = "",
        resource:  str = "",
    ) -> dict:
        """
        Diagnostic structuré d'une erreur.

        Retourne :
            {
                input:         str,
                pattern_found: str | None,
                kb_hit:        bool,
                kb_results:    list[dict],
                diagnosis:     str,
                solution:      str,
                severity:      str,
                source:        "pattern" | "kb" | "llm" | "error",
                model_used:    str | None,
                fallback:      bool,
                latency_ms:    int,
            }
        """
        t0        = time.monotonic()
        log_lower = log_line.lower()

        result: dict = {
            "input":         log_line,
            "pattern_found": None,
            "kb_hit":        False,
            "kb_results":    [],
            "diagnosis":     "",
            "solution":      "",
            "severity":      "medium",
            "source":        "unknown",
            "model_used":    None,
            "fallback":      False,
            "latency_ms":    0,
        }

        # ── 1. Pattern matching ───────────────────────────────────────────────
        matched_tag: Optional[str] = None
        for pattern, meta in ERROR_PATTERNS.items():
            if pattern in log_lower:
                result["pattern_found"] = pattern
                matched_tag             = meta["tag"]
                log.info(f"[HEAL] Pattern: {pattern!r} → tag={matched_tag}")
                break

        # ── 2. KnowledgeDB lookup ─────────────────────────────────────────────
        search_q = f"{matched_tag or ''} {log_line[:150]}"
        kb_hits  = self._kb.search_incidents(search_q, top_k=3)
        if kb_hits:
            best                = kb_hits[0]
            result["kb_hit"]    = True
            result["kb_results"] = kb_hits
            result["diagnosis"] = best["ai_diagnosis"]
            result["solution"]  = best["solution_applied"]
            result["source"]    = "kb"
            log.info(f"[HEAL] KB hit id={best['id']} tags={best['tags']!r}")
            result["latency_ms"] = int((time.monotonic() - t0) * 1000)
            return result

        # ── 2b. Réponse depuis le pattern (sans LLM) ──────────────────────────
        if result["pattern_found"]:
            meta = ERROR_PATTERNS[result["pattern_found"]]
            result["diagnosis"] = f"Pattern '{result['pattern_found']}' détecté."
            result["solution"]  = meta["hint"]
            result["source"]    = "pattern"
            result["latency_ms"] = int((time.monotonic() - t0) * 1000)
            return result

        # ── 3. LLM fallback ───────────────────────────────────────────────────
        log.info("[HEAL] Aucun match pattern/KB → escalade LLM")
        context = f"Namespace: {namespace}\nResource: {resource}\nErreur: {log_line}"
        try:
            llm_result = self._router.complete(
                messages=[{"role": "user", "content": context}],
                system=_SRE_SYSTEM_PROMPT,
                provider="anthropic",
                max_tokens=512,
            )
            raw  = llm_result["text"].strip()
            # Extraire le JSON de la réponse (robustesse si le LLM ajoute du texte)
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                parsed              = json.loads(m.group(0))
                result["diagnosis"] = parsed.get("diagnosis", raw)
                result["solution"]  = parsed.get("solution", "")
                result["severity"]  = parsed.get("severity", "medium")
            else:
                result["diagnosis"] = raw

            result["source"]    = "llm"
            result["model_used"] = llm_result["model_used"]
            result["fallback"]   = llm_result.get("fallback_reason") is not None
            log.info(
                f"[AUDIT] self-heal via LLM model={llm_result['model_used']} "
                f"fallback={result['fallback']}"
            )
        except Exception as exc:
            result["diagnosis"] = f"Diagnostic impossible : {exc}"
            result["source"]    = "error"
            log.error(f"[HEAL] LLM échoué: {exc}")

        result["latency_ms"] = int((time.monotonic() - t0) * 1000)
        return result
