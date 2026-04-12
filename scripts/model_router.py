"""
ModelRouter — LLM Gateway avec retry exponentiel et fallback automatique.

Priorité : Anthropic (Claude) → Mistral/Codestral
Bascule sur : HTTP 529 (overloaded), timeout, erreur réseau.
Audit trail : chaque appel est loggé avec provider, model, latency, fallback.
"""
import os
import re
import time
import random
import logging
from typing import Optional

log = logging.getLogger("model-router")

_ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_MISTRAL_API_KEY   = os.getenv("MISTRAL_API_KEY", "")

_MAX_RETRIES = 3
_BASE_DELAY  = 1.0   # secondes (doublé à chaque retry)
_JITTER      = 0.4   # aléatoire ajouté pour éviter les tempêtes de retry


class ModelRouter:
    """
    Route les requêtes LLM avec retry exponentiel et fallback automatique.

    Usage :
        router = ModelRouter()
        result = router.complete(
            messages=[{"role": "user", "content": "..."}],
            system="Tu es un SRE expert.",
        )
        print(result["text"], result["model_used"], result["provider_used"])
    """

    PRIMARY_MODEL  = "claude-sonnet-4-5"
    FALLBACK_MODEL = "codestral-latest"

    def __init__(self) -> None:
        self._anthropic = None  # lazy-init
        self._mistral   = None  # lazy-init

    # ── Clients lazy ──────────────────────────────────────────────────────────

    def _get_anthropic(self):
        if self._anthropic is None:
            import anthropic
            self._anthropic = anthropic.Anthropic(api_key=_ANTHROPIC_API_KEY)
        return self._anthropic

    def _get_mistral(self):
        if self._mistral is None:
            from mistralai import Mistral
            self._mistral = Mistral(api_key=_MISTRAL_API_KEY)
        return self._mistral

    # ── Point d'entrée public ─────────────────────────────────────────────────

    def complete(
        self,
        messages:   list[dict],
        system:     str  = "",
        tools:      list = None,
        model:      str  = "",
        provider:   str  = "anthropic",
        max_tokens: int  = 2048,
    ) -> dict:
        """
        Exécute une requête LLM avec retry et fallback.

        Retourne :
            {
                text:           str,
                tool_uses:      list[dict],   # [{id, name, input}]
                stop_reason:    str,
                provider_used:  str,
                model_used:     str,
                fallback_reason: str | None,  # raison du basculement si fallback
            }
        """
        t0            = time.monotonic()
        primary_error: Optional[Exception] = None

        # ── Tentatives sur le provider primaire ───────────────────────────────
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                result = self._dispatch(
                    provider, messages, system, tools or [],
                    model or (self.PRIMARY_MODEL if provider == "anthropic" else self.FALLBACK_MODEL),
                    max_tokens,
                )
                self._audit(result, attempt, t0)
                return result

            except Exception as exc:
                primary_error = exc
                retry, fallback_now = self._classify(exc)

                if fallback_now:
                    log.warning(f"[ROUTER] {provider} erreur critique (attempt={attempt}): {exc!s:.80} → fallback")
                    break
                if retry and attempt < _MAX_RETRIES:
                    delay = _BASE_DELAY * (2 ** (attempt - 1)) + random.uniform(0, _JITTER)
                    log.warning(f"[ROUTER] {provider} erreur (attempt={attempt}): {exc!s:.80} → retry dans {delay:.1f}s")
                    time.sleep(delay)
                else:
                    log.error(f"[ROUTER] {provider} abandonné après {attempt} tentative(s): {exc!s:.120}")
                    break

        # ── Fallback Mistral ──────────────────────────────────────────────────
        if provider == "anthropic" and _MISTRAL_API_KEY:
            log.warning(f"[ROUTER] Basculement Mistral — erreur primaire: {primary_error!s:.120}")
            try:
                result = self._call_mistral(messages, system, self.FALLBACK_MODEL, max_tokens)
                result["fallback_reason"] = str(primary_error)
                self._audit(result, attempt=0, t0=t0, fallback=True)
                return result
            except Exception as fb_exc:
                log.error(f"[ROUTER] Mistral fallback échoué: {fb_exc}")

        raise RuntimeError(f"Tous les providers ont échoué. Dernière erreur: {primary_error}")

    # ── Dispatch interne ──────────────────────────────────────────────────────

    def _dispatch(self, provider, messages, system, tools, model, max_tokens) -> dict:
        if provider == "anthropic":
            return self._call_anthropic(messages, system, tools, model, max_tokens)
        if provider == "mistral":
            return self._call_mistral(messages, system, model, max_tokens)
        raise ValueError(f"Provider inconnu: {provider!r}")

    def _call_anthropic(self, messages, system, tools, model, max_tokens) -> dict:
        client = self._get_anthropic()
        kwargs: dict = dict(model=model, max_tokens=max_tokens, messages=messages)
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        resp = client.messages.create(**kwargs)

        text      = ""
        tool_uses = []
        for block in resp.content:
            if block.type == "text":
                text += block.text
            elif block.type == "tool_use":
                tool_uses.append({"id": block.id, "name": block.name, "input": block.input})

        return {
            "text":            text,
            "tool_uses":       tool_uses,
            "stop_reason":     resp.stop_reason,
            "provider_used":   "anthropic",
            "model_used":      resp.model,
            "fallback_reason": None,
        }

    def _call_mistral(self, messages, system, model, max_tokens) -> dict:
        client = self._get_mistral()
        msgs: list = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.extend(messages)

        resp = client.chat.complete(model=model, messages=msgs, max_tokens=max_tokens)
        return {
            "text":            resp.choices[0].message.content or "",
            "tool_uses":       [],
            "stop_reason":     resp.choices[0].finish_reason,
            "provider_used":   "mistral",
            "model_used":      model,
            "fallback_reason": None,
        }

    # ── Classification des erreurs ────────────────────────────────────────────

    @staticmethod
    def _classify(exc: Exception) -> tuple[bool, bool]:
        """
        Retourne (should_retry, fallback_immediately).
        fallback_immediately=True → passe directement à Mistral sans retry.
        """
        msg = str(exc).lower()
        # 529 / overloaded → fallback immédiat
        if "529" in msg or "overloaded" in msg:
            return False, True
        # Réseau / DNS → fallback immédiat
        if re.search(r"connection|network|name or service", msg):
            return False, True
        # Rate limit (429) → retry avec backoff
        if "429" in msg or "rate_limit" in msg:
            return True, False
        # Timeout → retry
        if "timeout" in msg or "timed out" in msg:
            return True, False
        # 500/503 serveur → retry
        if re.search(r"\b(500|503)\b", msg):
            return True, False
        # Défaut : retry une fois
        return True, False

    # ── Audit ─────────────────────────────────────────────────────────────────

    @staticmethod
    def _audit(result: dict, attempt: int, t0: float, fallback: bool = False) -> None:
        latency_ms = int((time.monotonic() - t0) * 1000)
        log.info(
            f"[AUDIT] provider={result['provider_used']} model={result['model_used']} "
            f"attempt={attempt} latency={latency_ms}ms fallback={fallback}"
        )
