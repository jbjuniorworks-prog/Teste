from dataclasses import dataclass, field


@dataclass
class MatchedUser:
    email: str
    name: str
    role: str


@dataclass
class RoleMismatch:
    email: str
    name: str
    upload_role: str
    system_role: str


@dataclass
class UserListComparison:
    """Deterministic result of the diff between the upload list and the system.

    The sides are explicitly labeled: `only_in_upload` is what the user's document
    brought and does not exist in the system — it does not become truth, it creates nothing.
    """

    matched: list[MatchedUser] = field(default_factory=list)
    role_mismatch: list[RoleMismatch] = field(default_factory=list)
    only_in_upload: list[MatchedUser] = field(default_factory=list)
    only_in_system: list[MatchedUser] = field(default_factory=list)
