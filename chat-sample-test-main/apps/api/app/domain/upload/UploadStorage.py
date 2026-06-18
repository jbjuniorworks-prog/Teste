from abc import ABC, abstractmethod
from uuid import UUID


class UploadStorage(ABC):
    """Where the files uploaded by the user live (raw bytes).

    Local in the PoC; GCS in the real app (same port). Unlike DocumentStorage
    (generated PDFs), there is no `url` here: the file is an internal input (extraction),
    it is not served back to the browser.
    """

    @abstractmethod
    async def save(self, upload_id: UUID, content: bytes) -> None:
        ...

    @abstractmethod
    async def load(self, upload_id: UUID) -> bytes | None:
        ...
