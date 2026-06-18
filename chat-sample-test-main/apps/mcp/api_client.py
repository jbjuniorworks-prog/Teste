import os
from typing import Any

import httpx

API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000")


class ApiError(Exception):
    """Error coming from the API, already translated from the {error:{code,message}} envelope."""


async def call(
    method: str,
    path: str,
    *,
    authorization: str | None,
    json: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> Any:
    """Forward the call to the API with the caller's bearer. The API does auth + RBAC.

    `idempotency_key` (writes) becomes the Idempotency-Key header that the API requires.
    """
    headers: dict[str, str] = {}
    if authorization:
        headers["Authorization"] = authorization
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    async with httpx.AsyncClient(base_url=API_URL, timeout=10.0) as client:
        response = await client.request(method, path, headers=headers, json=json)

    if response.status_code == 204:
        return {"status": "ok"}

    data = response.json() if response.content else None

    if response.status_code >= 400:
        error = data.get("error", {}) if isinstance(data, dict) else {}
        code = error.get("code", "HTTP_ERROR")
        message = error.get("message", response.reason_phrase)
        # Becomes the tool's error result (the model reads the code+message).
        raise ApiError(f"{code}: {message}")

    return data
