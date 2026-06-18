# API FastAPI — uv + Python 3.14
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app

# WeasyPrint native libs (HTML/CSS -> PDF): Pango/Cairo + fonts.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpangocairo-1.0-0 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Dependencies first (cacheable layer): only re-resolves if the lock changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Application code.
COPY . .
RUN uv sync --frozen

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
