"""HTTP clients for the OpenAI SDK used by langchain-openai.

Behind a corporate TLS-intercepting proxy, the injected root CA may violate
RFC 5280 (basicConstraints not marked critical), which Python 3.13+ rejects
under ``ssl.VERIFY_X509_STRICT`` (enabled by default in ``create_default_context``).
When ``settings.LLM_RELAX_TLS_STRICT`` is set we drop *only* that strict flag —
the certificate chain is still verified against the system trust store (which,
in our image, includes the corporate CA). Otherwise we return ``None`` so the
SDK builds its own default client.
"""

from __future__ import annotations

import ssl

import httpx

from app.core.config import settings


def _relaxed_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
    return ctx


def llm_http_client() -> httpx.Client | None:
    if not settings.LLM_RELAX_TLS_STRICT:
        return None
    return httpx.Client(verify=_relaxed_context())


def llm_async_http_client() -> httpx.AsyncClient | None:
    if not settings.LLM_RELAX_TLS_STRICT:
        return None
    return httpx.AsyncClient(verify=_relaxed_context())
