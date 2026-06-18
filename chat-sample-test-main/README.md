# Chat Sample

Monorepo of a server-side session authentication API (Clean Architecture)
and the web app that consumes it.

## Structure

```
.
├── apps/
│   ├── api/        # FastAPI API (Python) — session + PAT auth, RBAC
│   ├── web/        # Next.js app (login, users, roles, settings/PAT) via BFF
│   └── mcp/        # MCP server (thin HTTP proxy over the API)
├── docker-compose.yml   # dev infra: Postgres 17 + Redis
├── .env                 # vars consumed by docker-compose
└── .mcp.json            # MCP server registration (token via ${CHAT_SAMPLE_PAT})
```

## Bring up the infra (Postgres + Redis)

```bash
docker compose up -d
```

## Run the API

```bash
cd apps/api
uv sync                                  # first time
uv run alembic upgrade head              # apply migrations
uv run python -m app.data.infra.seed     # roles + admin (dev)
uv run uvicorn app.main:app --reload     # http://127.0.0.1:8000
```

Interactive docs at `http://127.0.0.1:8000/docs`.

> The API config lives in `apps/api/.env` (separate from the root `.env`, which
> serves only docker-compose).

## Run the web app

```bash
cd apps/web
pnpm install
pnpm dev                                 # http://localhost:3000
```

## Run the MCP server

```bash
cd apps/mcp
uv sync
uv run python server.py                  # http://127.0.0.1:9000/mcp
```

Connect from Claude Code: generate a PAT at `/settings` (web app), `export CHAT_SAMPLE_PAT=pat_…`
and reopen `claude` (the server is already in `.mcp.json`). Details in [apps/mcp/README.md](apps/mcp/README.md).
