# MCP server (proxy pass-through) — uv + Python 3.14
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY . .
RUN uv sync --frozen

EXPOSE 9000
CMD ["uv", "run", "python", "server.py"]
