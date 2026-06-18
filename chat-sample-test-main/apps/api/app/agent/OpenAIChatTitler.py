"""Chat titler: a small model generates a short title for the conversation.

Returns None when the conversation does not yet have a clear subject
(greeting/small talk), signaling that it should be retried on the next turn.
"""

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.core.llm_http import llm_async_http_client, llm_http_client
from app.domain.chat.ChatTitler import ChatTitler

_PROMPT = (
    "You generate a short title (2 to 5 words) for a conversation, in the same "
    "language as it. Respond with ONLY the title, without quotes or trailing "
    "punctuation.\n"
    "If the conversation does not yet have a clear subject (only a greeting, small "
    "talk or not enough content), respond with exactly: INSUFFICIENT"
)
_SENTINEL = "INSUFFICIENT"


class OpenAIChatTitler(ChatTitler):
    def __init__(self) -> None:
        self._llm = ChatOpenAI(
            model=settings.TITLE_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=0,
            max_tokens=20,
            http_client=llm_http_client(),
            http_async_client=llm_async_http_client(),
        )

    async def title(self, conversation: list[tuple[str, str]]) -> str | None:
        convo = "\n".join(f"{role}: {content}" for role, content in conversation)
        resp = await self._llm.ainvoke(
            [SystemMessage(content=_PROMPT), HumanMessage(content=convo)]
        )
        text = resp.content if isinstance(resp.content, str) else str(resp.content)
        text = text.strip().strip('"').strip()
        if not text or text.upper().startswith(_SENTINEL):
            return None
        return text[:60]
