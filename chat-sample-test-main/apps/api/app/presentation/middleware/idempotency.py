"""ASGI idempotency middleware (contract: every write requires an Idempotency-Key).

- Mutating methods (POST/PUT/PATCH/DELETE) require the `Idempotency-Key` header.
- 1st time: reserves the key (in_progress), runs the handler, stores the response.
- Replay (same key): returns the original response (does not re-run the effect).
- Same key with a different request (fingerprint) -> 422. In progress -> 409.
- A 5xx response is not stored (allows retry).

GET/HEAD/OPTIONS pass straight through (they are safe). The ledger is Postgres (`idempotency_keys`).
"""

import hashlib
import json
from datetime import datetime, timezone

from app.core.config import settings
from app.data.idempotency.SQLIdempotencyStore import SQLIdempotencyStore
from app.domain.idempotency.model.IdempotencyRecord import IdempotencyStatus

_MUTATING = {"POST", "PUT", "PATCH", "DELETE"}


class IdempotencyMiddleware:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or scope["method"] not in _MUTATING:
            await self.app(scope, receive, send)
            return

        body = await _read_body(receive)
        key = _header(scope, b"idempotency-key")
        if not key:
            await _send_json(
                send, 400,
                _envelope("IDEMPOTENCY_KEY_REQUIRED",
                          "Idempotency-Key header is required for mutating requests"),
            )
            return

        fingerprint = hashlib.sha256(
            scope["method"].encode() + b" " + scope["path"].encode() + b"\n" + body
        ).hexdigest()
        session_factory = scope["app"].state.session_factory

        async with session_factory() as session:
            store = SQLIdempotencyStore(session)
            inserted = await store.begin(key, fingerprint)
            if not inserted:
                record = await store.get(key)
                if record is None or record.fingerprint != fingerprint:
                    await _send_json(send, 422, _envelope(
                        "IDEMPOTENCY_KEY_REUSE",
                        "Idempotency-Key reused with a different request"))
                    return
                if record.status == IdempotencyStatus.COMPLETED:
                    await _replay(send, record)
                    return
                # in_progress: orphan (> threshold) is claimed; otherwise, it is in flight.
                age = (datetime.now(timezone.utc) - record.created_at).total_seconds()
                if age <= settings.IDEMPOTENCY_STALE_SECONDS:
                    await _send_json(send, 409, _envelope(
                        "IDEMPOTENCY_IN_PROGRESS",
                        "A request with this Idempotency-Key is already in progress"))
                    return
                await store.discard(key)
                if not await store.begin(key, fingerprint):
                    await _send_json(send, 409, _envelope(
                        "IDEMPOTENCY_IN_PROGRESS",
                        "A request with this Idempotency-Key is already in progress"))
                    return

        # Run the handler capturing status/body (the 1st response goes out intact).
        captured: dict = {"status": 500, "headers": [], "body": b""}

        async def receive_replay():
            return {"type": "http.request", "body": body, "more_body": False}

        async def send_capture(message):
            if message["type"] == "http.response.start":
                captured["status"] = message["status"]
                captured["headers"] = message.get("headers", [])
            elif message["type"] == "http.response.body":
                captured["body"] += message.get("body", b"")
            await send(message)

        await self.app(scope, receive_replay, send_capture)

        async with session_factory() as session:
            store = SQLIdempotencyStore(session)
            if captured["status"] < 500:
                content_type = _find_header(captured["headers"], b"content-type") or "application/json"
                await store.complete(
                    key, captured["status"],
                    captured["body"].decode("utf-8", "replace"), content_type,
                )
            else:
                await store.discard(key)  # transient 5xx -> release for retry


# --- helpers ASGI ---

async def _read_body(receive) -> bytes:
    chunks: list[bytes] = []
    more = True
    while more:
        message = await receive()
        if message["type"] == "http.request":
            chunks.append(message.get("body", b""))
            more = message.get("more_body", False)
        elif message["type"] == "http.disconnect":
            break
    return b"".join(chunks)


def _header(scope, name: bytes) -> str | None:
    for k, v in scope["headers"]:
        if k == name:
            return v.decode()
    return None


def _find_header(headers, name: bytes) -> str | None:
    for k, v in headers:
        if k.lower() == name:
            return v.decode()
    return None


def _envelope(code: str, message: str) -> bytes:
    return json.dumps({"error": {"code": code, "message": message}}).encode()


async def _send_json(send, status: int, body: bytes) -> None:
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
        ],
    })
    await send({"type": "http.response.body", "body": body})


async def _replay(send, record) -> None:
    body = (record.response_body or "").encode()
    await send({
        "type": "http.response.start",
        "status": record.response_status or 200,
        "headers": [
            (b"content-type", (record.content_type or "application/json").encode()),
            (b"content-length", str(len(body)).encode()),
            (b"idempotent-replay", b"true"),
        ],
    })
    await send({"type": "http.response.body", "body": body})
