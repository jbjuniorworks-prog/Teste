from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    REDIS_HOST: str
    REDIS_PORT: int

    SESSION_IDLE_TTL: int = 604800       # 7 days — expires after inactivity (sliding)
    SESSION_ABSOLUTE_TTL: int = 2592000  # 30 days — cap: forces relogin regardless of use
    PERMS_CACHE_TTL: int = 30
    AGENT_TOKEN_TTL: int = 600  # 10 min — ephemeral chatbot token (minted from the session)
    COOKIE_NAME: str = "session_id"
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "lax"

    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Chatbot / in-app agent (LLM via langchain-openai)
    OPENAI_API_KEY: str | None = None           # LLM key
    # Dev: behind a TLS-intercepting corporate proxy whose root CA fails Python's
    # strict X.509 check (basicConstraints not critical). When True, the LLM HTTP
    # clients drop only ssl.VERIFY_X509_STRICT (chain still verified vs. the store).
    LLM_RELAX_TLS_STRICT: bool = False
    AGENT_MODEL: str = "gpt-4o"                  # model for the supervisor and the subagents
    TITLE_MODEL: str = "gpt-4o-mini"             # cheap model to title the chat
    MCP_URL: str = "http://127.0.0.1:9000/mcp"  # MCP the agent consumes (pass-through -> API)
    DOCUMENTS_DIR: str = "/data/documents"      # where generated PDFs are saved (volume)
    UPLOADS_DIR: str = "/data/uploads"          # where user-uploaded PDFs are kept (volume)
    MAX_UPLOAD_BYTES: int = 10_485_760          # 10 MiB — simple upload cap (PoC)
    CHAT_STREAM_TTL: int = 300                  # s — lifetime of the run's Redis Stream after 'done'
    # Durable queue of runs (worker consumes via consumer group)
    CHAT_JOBS_STREAM: str = "chat:jobs"
    CHAT_JOBS_GROUP: str = "workers"
    RUN_LEASE_TTL: int = 15                     # s — short lease, renewed by heartbeat
    RUN_LEASE_HEARTBEAT_SECONDS: int = 5        # s — lease renewal interval
    XAUTOCLAIM_MIN_IDLE_MS: int = 60000         # ms idle to claim a dead worker's job
    CHAT_RUN_STALE_SECONDS: int = 3600          # s — running older than this becomes failed (safety)
    # Idempotency ledger reaper
    IDEMPOTENCY_STALE_SECONDS: int = 300        # s — in_progress older than this is orphaned (5 min)
    IDEMPOTENCY_RETENTION_SECONDS: int = 86400  # s — completed beyond this is discarded (24 h)
    IDEMPOTENCY_REAPER_INTERVAL_SECONDS: int = 60

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

settings = Settings()