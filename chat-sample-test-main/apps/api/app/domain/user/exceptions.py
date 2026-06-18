class UserNotFoundError(Exception):
    """User not found."""


class EmailAlreadyExistsError(Exception):
    """A user with this email already exists."""
