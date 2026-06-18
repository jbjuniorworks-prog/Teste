"""Chat domain constants (values persisted as strings)."""


class MessageRole:
    USER = "user"
    ASSISTANT = "assistant"


class MessageStatus:
    RUNNING = "running"     # assistant: run in progress (still only in Redis)
    COMPLETE = "complete"   # run finished and was persisted
    FAILED = "failed"       # run aborted (error / process died)


class EventType:
    SYSTEM = "system"
    ASSISTANT_STEP = "assistant_step"     # supervisor's intermediate turn
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    SUBAGENT_START = "subagent_start"     # delegation (task)
    SUBAGENT_RESULT = "subagent_result"   # condensed subagent response
    # Transient — only on the live stream, NEVER in the database:
    TOKEN = "token"
    ASSISTANT_FINAL = "assistant_final"   # assembled final text -> goes to messages.content
    TITLE = "title"   # generated chat title -> the UI updates the label live
    DONE = "done"     # sentinel: end of run (closes the SSE)
    ERROR = "error"

    # Types that go into the database (supervisor's curated process).
    PERSISTED = frozenset(
        {SYSTEM, ASSISTANT_STEP, TOOL_CALL, TOOL_RESULT, SUBAGENT_START, SUBAGENT_RESULT}
    )


# Owner of an event: the supervisor or a subagent ("subagent:1", ...).
SUPERVISOR = "supervisor"

# Default title ("not yet titled" sentinel) of a new chat.
DEFAULT_CHAT_TITLE = "New Chat"
MAX_TITLE_ATTEMPTS = 3   # try to title up to the user's 3rd message
