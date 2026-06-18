class InvalidCredentialsError(Exception):
    """Email not found or incorrect password at login."""


class NotAuthenticatedError(Exception):
    """Request without a valid session (no cookie or expired/nonexistent session)."""


class PermissionDeniedError(Exception):
    """User authenticated, but without the permission required by the route."""
