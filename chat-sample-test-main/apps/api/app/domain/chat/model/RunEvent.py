from dataclasses import dataclass
from typing import Any


@dataclass
class RunEvent:
    """Transient event emitted by the agent during a run.

    It's what the AgentRunner produces; it becomes both a live event on the
    stream and (some of them) a persisted MessageEvent.
    """

    type: str                # EventType
    owner: str               # "supervisor" | "subagent:N"
    payload: dict[str, Any]
