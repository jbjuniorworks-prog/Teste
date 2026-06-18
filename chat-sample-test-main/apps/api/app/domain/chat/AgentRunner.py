from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from uuid import UUID

from app.domain.chat.model.RunEvent import RunEvent


class AgentRunner(ABC):
    """Runs the agent and emits the trajectory as a stream of RunEvent.

    The ephemeral token (minted from the session) is injected as the bearer on
    the MCP, so the agent inherits the user's RBAC. `history` is the previous
    turns as (role, content) pairs.
    """

    @abstractmethod
    def run(
        self,
        *,
        run_id: UUID,
        ephemeral_token: str,
        message: str,
        history: list[tuple[str, str]],
        attachment_ids: list[UUID] | None = None,
    ) -> AsyncIterator[RunEvent]:
        ...
