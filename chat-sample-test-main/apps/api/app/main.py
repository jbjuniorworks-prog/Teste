from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Registers the 3 models on import — SQLAlchemy needs all of them before
# configuring the mappers on the first query.
import app.data.infra.models_registry  # noqa: F401
from app.core.config import settings
from app.data.infra.database import create_engine, create_session_factory
from app.data.infra.redis import create_redis
from app.presentation.errors import register_error_handlers
from app.presentation.middleware.idempotency import IdempotencyMiddleware
from app.presentation.auth.router import router as auth_router
from app.presentation.user.router import router as user_router
from app.presentation.role.router import router as role_router
from app.presentation.token.router import router as token_router
from app.presentation.chat.router import router as chat_router
from app.presentation.document.router import router as document_router
from app.presentation.upload.router import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup: create the resources and store them in app.state ---
    engine = create_engine()
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    app.state.redis = create_redis()

    yield

    # --- shutdown: close gracefully (release database/redis connections) ---
    await app.state.redis.aclose()
    await engine.dispose()


app = FastAPI(title="Chat Sample", lifespan=lifespan)

# Idempotency added BEFORE CORS -> CORS sits more outward and covers even the
# middleware's error responses (e.g. 400 without Idempotency-Key).
app.add_middleware(IdempotencyMiddleware)

# A cross-origin frontend with a session cookie requires a specific origin (not "*")
# and allow_credentials=True. The frontend must send credentials: "include".
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(role_router)
app.include_router(token_router)
app.include_router(chat_router)
app.include_router(document_router)
app.include_router(upload_router)
