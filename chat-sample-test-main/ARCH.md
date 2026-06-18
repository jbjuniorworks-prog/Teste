# ARCH.md — Chat Sample (PoC)

Record of the architecture, decisions, and pitfalls solved. This project is a **PoC**
(learning → production-shaped) that validates the pattern to be used in a real app
(multi-vendor product catalog — see §11). Special focus on **building the agent** (§5).

---

## 1. Overview

Monorepo with three apps:

| App | Stack | Role |
|---|---|---|
| `apps/api` | FastAPI + SQLModel/SQLAlchemy async + Alembic, Python 3.14, uv | Auth/users/roles API + **chatbot backend** (agent, persistence, PDF) + **worker** |
| `apps/mcp` | Official MCP SDK (`mcp.server.fastmcp`), httpx | **Pass-through** MCP server (translates tools → HTTP on the API) |
| `apps/web` | Next.js 16 (App Router) + Tailwind v4 + shadcn, pnpm | **BFF** frontend (the browser never talks to the API directly) |

Infra (docker compose): `postgres`, `redis`, `api`, `worker`, `mcp`, `web`.

Macro chat flow:
```
browser → (BFF) Next → API (POST /chat enqueues) → worker consumes → agent (LangGraph)
   → tools via MCP (ephemeral token) → MCP forwards to API → RBAC
   → events on Redis Stream → SSE (API) → (BFF proxy) Next → browser
```

---

## 2. Cross-cutting principles

- **Clean architecture / ports & adapters.** Layers: `domain` (models, abstract ports,
  use cases — framework-free), `data` (concrete adapters: SQL*, Redis*, WeasyPrint…),
  `presentation` (FastAPI routers, schemas, dependencies, middleware).
  `core/dependencies.py` is the cross-feature **composition root**; per-feature wiring
  lives in `presentation/<feature>/dependencies.py`.
- **"The model orchestrates; deterministic code does the exact part."** A recurring
  theme: the LLM decides *what* to do and disambiguates; the logic that must be
  correct/auditable (RBAC, document generation, comparison, pricing) is code.
- **Determinism where it matters.** Documents use a fixed template + data; the model
  never "authors" the artifact.
- **Single error envelope** `{error:{code,message}}` (`presentation/errors.py`): a
  domain exception → (status, code) via a central map; the front branches on `code`.
- **No committed secrets.** `.env` gitignored; `.mcp.json` uses `${CHAT_SAMPLE_PAT}`.
- **No assistant co-author trailer in commits** (rule in `CLAUDE.md`).

---

## 3. AuthN / AuthZ

- **Opaque server-side session** (Redis): httponly `session_id` cookie; hash holds
  `user_id` + `expires_at` (absolute cap) and a **sliding idle TTL**. Index
  `sessions:user:{id}` for logout-all.
- **RBAC**: `Role` has `set[Permission]` (enum in code, source of truth). Permission
  cache in Redis (`PermissionCache`, short TTL). `require_permission(perm)` is a
  **dependency factory** (`core/dependencies.py`) — credential-agnostic, so HTTP and MCP
  inherit the same RBAC.
- **`Authenticator` chain (Strategy)**: `get_current_user_id` resolves any credential by
  walking `[ephemeral, pat, session]` (bearer before cookie; among bearers, ephemeral/Redis
  before PAT/Postgres). Every route accepts any credential without knowing which.

### Two token types (decision)
| | PAT | Ephemeral token (`eat_`) |
|---|---|---|
| Where | Postgres `personal_access_tokens` (1/user, reveal-once) | Redis `agent_token:{hash}` + TTL (`AGENT_TOKEN_TTL`) |
| For | external clients (e.g. connect MCP to Claude) | **in-app agent** (minted from the user's session) |
| Hash | **sha256** | **sha256** |

> **Why sha256 (not bcrypt) for tokens:** auth needs an **indexed lookup by hash**;
> sha256 is deterministic (same input → same hash → index). bcrypt is salted/slow by
> design → not indexable. (User passwords **stay bcrypt** — see §12, passlib broken.)

> **Why an ephemeral token for the agent:** asking the user for a PAT is bad UX and
> doesn't scale across devices. The backend **mints** an `eat` from the session, the
> agent uses it as the MCP bearer, and the API revalidates on every tool-call → the
> agent inherits **exactly** the logged-in user's RBAC, and the token expires on its own.

---

## 4. MCP (apps/mcp)

- **FastMCP**, **streamable-http** transport, `stateless_http=True`, host/port via env
  (`MCP_HOST`/`MCP_PORT`: `0.0.0.0` in the container).
- **Deliberately pass-through**: each tool injects `ctx: Context`, reads
  `ctx.request_context.request.headers["authorization"]` and forwards to the API via
  httpx (`api_client.call`). **Auth + RBAC + validation are the API's job.** The MCP
  duplicates nothing.
- `api_client.call` translates the `{error:{code,message}}` envelope into an exception
  (becomes the tool's error result, which the model reads) and forwards `Idempotency-Key`.
- Tools: `whoami`, `list_users`, `get_user`, `create_user`, `update_user`,
  `delete_user`, `list_roles`, `generate_user_report`.

---

## 5. THE AGENT (LangGraph) — detailed

Lives **inside `apps/api`** (not a microservice). Runs in the **worker** (§7.1).

### 5.1 ReAct supervisor + LLM
- `app/agent/graph.py::build_agent` = `create_react_agent(model, [*mcp_tools, delegate], prompt=SUPERVISOR_PROMPT, checkpointer)`.
- **LLM = OpenAI** via `langchain-openai.ChatOpenAI` (`AGENT_MODEL`, default `gpt-4o`).
  User's choice (the `claude-api` skill produces Anthropic code, but this is LangGraph,
  where the LLM is pluggable; no Anthropic SDK).
- `app/agent/LangGraphAgentRunner.py` implements the `AgentRunner` port (domain): runs
  `agent.astream_events(..., version="v2")` and **translates** the graph events into
  domain `RunEvent`s.

### 5.2 MCP as the tool source
- **Per request**, it builds a `MultiServerMCPClient({"chat-sample": {transport:
  "streamable_http", url: MCP_URL, headers: {Authorization: Bearer <eat>}}})` and
  `await client.get_tools()`. The user's ephemeral token rides in the header → per-user RBAC.

### 5.3 Subagents (context management)
- Tool `delegate_to_subagent(task)`: spins up a fresh `create_react_agent` with the
  **same MCP tools** but **without** the delegate tool (cuts recursion), runs it in
  isolation, and returns **only the final text**.
- **Why:** all of the subtask's tool-call chatter stays in the subagent's context; the
  supervisor only gets the condensed result → lean context, scales with the number of
  subtasks. **Fan-out** works (the supervisor can emit N `delegate` calls in one turn →
  N concurrent subagents, each with its own context).
- **Subagent's own checkpoint** (§7.2): `thread_id = "{run_id}:{delegate_tool_call_id}"`
  — derived from the (checkpoint-stable) id of the delegation → the subagent is resumable
  and its `tool_call_id`s stay stable on replay.

### 5.4 Event translation (astream_events → RunEvent)
- Each v2 event carries `event`, `run_id`, `parent_ids`, `data`. **Owner by ancestry**:
  if any ancestor is a `delegate_to_subagent` run → the event belongs to a subagent
  (`subagent:N`); otherwise `supervisor`.
- Mapping: `on_chat_model_stream`→`token`; `on_tool_start/end`→`tool_call`/`tool_result`;
  `delegate` start/end→`subagent_start`/`subagent_result`; supervisor's `on_chat_model_end`
  with tool_calls→`assistant_step`, without tool_calls→accumulates the `assistant_final`.
- **Subagent-internal events are streamed live but NOT persisted** — the subagent is a
  black box (only `subagent_start`/`subagent_result` go to the DB).

### 5.5 Idempotency for mutating tools
- The mutating tools (`create_user`, `update_user`, `delete_user`, `generate_user_report`)
  are **wrapped** in the runner: the wrapper hides `idempotency_key` from the LLM and
  injects `sha256(run_id:tool_call_id)` (via `InjectedToolCallId`). The MCP forwards it as
  the `Idempotency-Key` header; the API dedupes (§7.3).
- **Why it's stable:** with the checkpoint, the boundary step's `tool_call_id` is preserved
  on replay → same key → the API recognizes it and doesn't duplicate the effect.
- ⚠️ **Duplicate-event bug (fixed):** the wrapper calls the inner MCP tool (same name) via
  `ainvoke`, and `astream_events` emitted the event **at both levels** (wrapper + inner
  MCP) → 2 bubbles/2 events for one execution. **Fix:** ignore the nested inner call
  (whose ancestor is the wrapper's run). The effect was always single.

### 5.6 Chat auto-titling
- After each run (turns 1..3, while the title is `"New Chat"`), `OpenAIChatTitler`
  (`TITLE_MODEL`, default `gpt-4o-mini`) generates a short title for the conversation.
- For small talk, the model returns the sentinel `INSUFICIENTE` → it stays `"New Chat"`
  and retries next turn. The title is persisted and emitted as an SSE `title` event → the
  UI updates the label live.

> **A lesson learned:** the model invents a download link (e.g. `sandbox:/documents/{id}`).
> Fixed in the prompt: when generating a document, **do not include links/URLs** — the UI
> shows the file (§8); the answer just confirms.

---

## 6. Chat: persistence + streaming

### 6.1 Decoupled POST → SSE
- `POST /chat` creates/continues the chat, writes the user message + the assistant one
  (`running`), **enqueues** the run, and quickly returns `{chat_id, run_id}`. The front
  then opens the SSE.
- Separating the **command** (start) from the **subscription** (watch) gives reconnection,
  multi-device, and "left the screen and came back".

### 6.2 Redis Streams (not pub/sub)
- Run events go to a **Redis Stream** `chat:stream:{run_id}` (XADD). The subscriber uses
  `XREAD` from `0` (catch-up from the start) or from an id (resume). **Pub/sub won't do**
  (fire-and-forget; a late subscriber misses everything).
- **SSE + `Last-Event-ID` = the Stream entry id** → native `EventSource` resume.
- A `done` sentinel ends the stream; TTL (`CHAT_STREAM_TTL`) after it finishes. Pointer
  `chat:active_run:{chat_id}` for reattach after reload.

### 6.3 Persistence (Postgres) — schema
| table | role |
|---|---|
| `chats` | thread per user (id, user_id, title, created/updated) |
| `messages` | complete messages; the `assistant` row **is the run** (id = runId), with `status` (running/complete/failed), `content`, `error`, `meta`, `completed_at` |
| `message_events` | the run's curated trajectory (`seq`, `type`, `owner`, `payload` JSONB); `UNIQUE(message_id, seq)` |

- **During the run only Redis**; **at the end** (`finalize_run`, one transaction) it writes
  the final message + the curated events. Curation: **no tokens**; subagent **collapsed**
  (`subagent_start`/`subagent_result`); `owner=supervisor` only.
- The assistant's final answer lives in `messages.content`; "the process" in `message_events`.

### 6.4 BFF + filtering
- **SSE proxy** `app/api/chat/[runId]/stream/route.ts` (Next): browser → Next (injects the
  session cookie) → API. The browser never touches the API; `EventSource` can't send headers.
- **Owner filtering live:** the UI ignores events with `owner != supervisor` → the
  subagent's internal tools **don't leak** as top-level bubbles (consistent with history).
  ⚠️ this was a bug (the subagent's internal `list_users` leaked).

---

## 7. Durability & production (the 3 fixes)

Context: `/chat` ran the agent via `asyncio.create_task` in the web process → not durable
(process dies = orphan run stuck `running` forever, no retry).

### 7.1 Worker + durable queue
- `POST /chat` **enqueues** a job on a **Redis Stream + consumer group** (`chat:jobs`/
  `workers`). `app/worker.py` (separate process, same image as the API) consumes via
  `XREADGROUP`.
- **`XACK` only after `finalize` commits** (at-least-once, never lost).
- **Dedup/claim:** checks terminal state in Postgres (terminal → ack and skip) + a **lease**
  `run:lease:{run_id}` in Redis.
- **Recovery:** `XAUTOCLAIM` reclaims jobs pending from a dead worker and reprocesses.
- A startup reconciler marks old orphan `running` runs as `failed`.

### 7.2 Checkpointer (resume)
- `AsyncRedisSaver` (`langgraph-checkpoint-redis`), `thread_id = run_id`. On reprocessing,
  the supervisor **resumes from the checkpoint** instead of redoing tool calls.
- **Resume with `input=None`** when a checkpoint exists (re-sending the messages would
  corrupt the state — `tool_calls` with no response → `_validate_chat_history` error).
- Subagents also have their own checkpoint (§5.3).
- ⚠️ `langgraph-checkpoint-redis` requires `redis-py < 8` → we pinned the client to
  `>=7,<8` (the redis:8 server talks fine).

### 7.3 Idempotency-Key on EVERY write
- **ASGI middleware** (`presentation/middleware/idempotency.py`, registered before CORS so
  CORS stays outermost): mutating methods require `Idempotency-Key`. Ledger in **Postgres**
  (`idempotency_keys`): `fingerprint`=sha(method+path+body), `status`, `response_status`,
  `response_body`.
  - `completed` → **replay** the original response; different fingerprint → 422; in
    progress → 409.
  - Stores 2xx/4xx (deterministic); **does not** store 5xx (allows retry).
- **Self-heal**: an orphan `in_progress` (> `IDEMPOTENCY_STALE_SECONDS` = 5 min) is reclaimed
  (instead of an eternal 409). A **reaper** in the worker purges orphans + old `completed`.
- The **web BFF** sends `Idempotency-Key` (uuid) on every write.

### 7.4 Exactly-once discussion (important)
- A durable queue is **at-least-once** — there's no exactly-once for external effects (gap
  between "did it" and "recorded it"). The goal is **safe redelivery** (effectively-once).
- Two levels of duplication: the **whole run** (worker reprocesses) and the **effect** (a
  mutating tool runs again).
- **Layered defenses:** (a) run dedup (terminal state in Postgres = ledger); (b) effect
  idempotency (key per `run_id:tool_call_id`, + natural idempotency: unique email, by-id);
  (c) checkpoint → resume instead of redo.
- **Why an event log does NOT give exactly-once:** writing "I called X" to Postgres isn't
  the same transaction as the effect in another system (dual-write). The **Idempotency-Key**
  solves it at the destination; the log can't.
- **Heartbeat lease (multi-worker):** a short lease (`RUN_LEASE_TTL`=15s) **renewed by a
  heartbeat** while the run lives; recovery acquires it via `SET NX` (only takes over if the
  owner died) → safe with multiple workers, no force-lease. (`XAUTOCLAIM_MIN_IDLE_MS` ≥ the
  lease TTL.)
- **Fundamental residue:** if a worker freezes (GC/STW) > the TTL without dying, two could
  run — neutralized by the Idempotency-Key at the destination.

---

## 8. PDF generation (template)

- **Jinja2 (template → HTML) + WeasyPrint (HTML/CSS → PDF)** in the backend; native libs
  (pango/cairo) in the Dockerfile. No browser, deterministic.
  - *Why not Playwright / model-generates-code:* a business document needs determinism/
    branding/QA; a model generating the doc = non-deterministic + the risk of executing
    generated code. WeasyPrint covers documents (tables, `@page`, page numbers, embedded font).
- **Rigid contract** (not a free `data`): `UserReportRequest{title, users:[{name,email,role}]}`
  with Pydantic `extra="forbid"` → 422 on an extra/missing field. Dedicated endpoint
  `POST /documents/user-report`. `generated_at` is backend-controlled. Template at
  `app/data/document/templates/user_report.html`.
- **Storage via port** `DocumentStorage` (local in the PoC → **GCS** in the real app: `save`
  = `blob.upload_from_string`, `url` = `generate_signed_url`; with a signed URL the download
  goes direct, no proxy). The use case doesn't change.
- **Download via BFF** (`/api/documents/[id]`, like the SSE). In the UI, the result becomes a
  **file bubble** (a clickable card) **after** the tool — no link in the text.
- MCP/agent tool: `generate_user_report(users, title)` (typed; the wrapper injects the key).

---

## 9. Frontend (Next BFF)

- **BFF**: server actions + `lib/api.ts` (injects the session cookie server-side).
  Server-side session gate in the dashboard layout.
- Chat: a server page loads `getChats()`; **route `/chat/[chatId]`** (selecting navigates;
  the server page brings the history). When creating a chat on send,
  `window.history.replaceState` updates the URL **without remounting** (doesn't cut the
  stream).
- `chat-view.tsx`: consumes the SSE via `EventSource`; a shared **`applyEvent` reducer**
  (live and history) assembles the blocks: `user`, `assistant`, `tool`, `subagent`, `file`.
- **Markdown** in the bubbles (react-markdown + remark-gfm); raw input.
- **Tool result = a collapsible JSON tree, Swagger-style** (`Object`/`Array[n]`, expands
  level by level); raw text (subagent/error) stays raw.
- Fonts: **Poppins** (headings) / **Work Sans** (body) via `next/font` (fixed a circular
  `--font-sans` that fell back to serif).

---

## 10. Migrations & data

Alembic (async): `users/roles/role_permissions` → `personal_access_tokens` →
`chats/messages/message_events` → `idempotency_keys`. Seed: admin
`admin@chat-sample.dev` / `admin` (dev). Models registered in
`data/infra/models_registry.py` (all of them before SQLAlchemy configures the mappers).

---

## 11. Roadmap — the real app (multi-vendor catalog)

Core feature: upload a **budget PDF** (with/without prices) → **quote it**.
```
PDF → EXTRACTION (reads everything; vision→rigid JSON) → MATCHING (find it in the catalog)
    → PRICING (best multi-vendor offer, deterministic) → QUOTE (+ PDF)
```
- **Extraction**: the whole PDF → schema-validated JSON (not RAG-of-the-PDF: you can't miss
  line items). OpenAI Files API: **no** (couples + sends data to them + retrieval you don't
  need).
- **Matching (the heart)**: the PDF description × the catalog. Layers: exact (SKU/normalized)
  → **hybrid search over the CATALOG** (`pg_trgm`/`tsvector` + **`pgvector`**) top-k →
  rerank/confidence. **Low confidence → human review** (a wrong match = wrong money).
  > This is where — and **only** where — embeddings/"RAG-like" belong: **over the catalog**,
  > not over the PDF.
- **Pricing**: deterministic; "best" considers stock/MOQ/lead-time/vendor, not just the lowest.
- **Upload storage**: the raw file in `DocumentStorage` (→ GCS) + a record; scoped to the owner.
- **Tools (agent)**: `extract_budget` → `match_products` (candidates+confidence) → `quote`.
  The model orchestrates/disambiguates; code does extraction/search/pricing.

---

## 12. Problem → solution log

| Problem | Solution |
|---|---|
| `passlib 1.7.4` breaks with `bcrypt 5.0` | use `bcrypt` directly (no passlib) |
| pnpm 11: build scripts | `allowBuilds:{...}` in `pnpm-workspace.yaml` (not the deprecated `onlyBuiltDependencies`) |
| Playwright browser won't build on the host (Ubuntu 26.04) | Playwright MCP with `--browser chrome` (system Chrome); PDF render tested in the container |
| `langgraph-checkpoint-redis` requires redis-py < 8 | pin the client to `>=7,<8` (the redis:8 server is fine) |
| Empty SSE (race): subscriber connects before the 1st event | drop the early `exists`; `XREAD BLOCK` already waits for the stream to appear |
| Resume broke (`_validate_chat_history`: tool_calls with no response) | resume with `input=None` when a checkpoint exists |
| Idempotency tool emitted the event **twice** (wrapper + inner MCP) | ignore the nested inner call (ancestor = the wrapper's run) |
| Subagent **leaked** internal tools as top-level bubbles | UI filters `owner != supervisor` events (black box, like history) |
| Model invented a broken link (`sandbox:/documents/...`) | prompt: don't include links when generating a document (the UI shows the file) |
| Background run died with the web process | worker + durable queue (§7.1) |

---

## 13. Known limitations (PoC)

- `GET /documents/{id}` requires a session but is **not scoped to the owner** (any
  authenticated user can download any id) — scope it in the real app (or a signed GCS URL).
- No retention/cleanup of PDFs on disk (on GCS: bucket lifecycle).
- WeasyPrint render blocks ~100–200ms (via `to_thread`); high volume → a dedicated queue.
- `api` is single-instance and assumes local disk for documents; multi-replica requires
  object storage (GCS).
- Test chat history has old broken links (stale data, harmless).
