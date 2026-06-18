class UploadNotFoundError(Exception):
    """Upload does not exist or belongs to another user."""


class ExtractionError(Exception):
    """Failed to extract the user list from the uploaded PDF."""
