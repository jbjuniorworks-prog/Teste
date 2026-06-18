from dataclasses import dataclass


@dataclass
class ExtractedUser:
    """A user extracted from the uploaded PDF. It is NOT system truth — it is only what
    the user's document says. It becomes one side of the diff in CompareUserListsUseCase."""

    name: str
    email: str
    role: str
