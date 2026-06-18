from collections.abc import AsyncGenerator

from fastapi import Request
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def create_engine() -> AsyncEngine:
    # echo=True just for learning (logs the SQL).
    return create_async_engine(
        settings.DATABASE_URL,
        echo=True,
        pool_pre_ping=True,
    )


def create_session_factory(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    # The session factory is created in the lifespan and stored in app.state.
    factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with factory() as session:
        yield session
