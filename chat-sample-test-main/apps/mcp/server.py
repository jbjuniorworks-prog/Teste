import os
from typing import Any

from mcp.server.fastmcp import Context, FastMCP
from pydantic import BaseModel

from api_client import call

# "Pass-through" MCP proxy: stateless, forwards the caller's bearer to the API.
# Host/port come from the environment: local stays on 127.0.0.1; in the container, 0.0.0.0.
mcp = FastMCP(
    "chat-sample",
    stateless_http=True,
    json_response=True,
    host=os.environ.get("MCP_HOST", "127.0.0.1"),
    port=int(os.environ.get("MCP_PORT", "9000")),
)


def _auth(ctx: Context) -> str | None:
    # In streamable-http, request_context.request is the HTTP request (Starlette).
    request = ctx.request_context.request
    if request is None:
        return None
    return request.headers.get("authorization")


@mcp.tool()
async def whoami(ctx: Context) -> Any:
    """Return the current authenticated user with their role and permissions."""
    return await call("GET", "/auth/me", authorization=_auth(ctx))


@mcp.tool()
async def list_users(ctx: Context) -> Any:
    """List all users."""
    return await call("GET", "/users", authorization=_auth(ctx))


@mcp.tool()
async def get_user(user_id: str, ctx: Context) -> Any:
    """Get a single user by id."""
    return await call("GET", f"/users/{user_id}", authorization=_auth(ctx))


@mcp.tool()
async def create_user(
    name: str,
    email: str,
    password: str,
    role_id: str,
    idempotency_key: str,
    ctx: Context,
) -> Any:
    """Create a user with the given role (use list_roles to find a role_id)."""
    return await call(
        "POST",
        "/users",
        authorization=_auth(ctx),
        json={"name": name, "email": email, "password": password, "role_id": role_id},
        idempotency_key=idempotency_key,
    )


@mcp.tool()
async def update_user(
    user_id: str,
    idempotency_key: str,
    ctx: Context,
    name: str | None = None,
    email: str | None = None,
    password: str | None = None,
    role_id: str | None = None,
) -> Any:
    """Update a user. Only provided fields change; role_id changes the user's role."""
    body = {
        key: value
        for key, value in {
            "name": name,
            "email": email,
            "password": password,
            "role_id": role_id,
        }.items()
        if value is not None
    }
    return await call(
        "PATCH", f"/users/{user_id}", authorization=_auth(ctx), json=body,
        idempotency_key=idempotency_key,
    )


@mcp.tool()
async def delete_user(user_id: str, idempotency_key: str, ctx: Context) -> Any:
    """Delete a user by id."""
    return await call(
        "DELETE", f"/users/{user_id}", authorization=_auth(ctx),
        idempotency_key=idempotency_key,
    )


@mcp.tool()
async def list_roles(ctx: Context) -> Any:
    """List roles and their permissions (use to find a role_id)."""
    return await call("GET", "/roles", authorization=_auth(ctx))


@mcp.tool()
async def compare_user_lists(upload_id: str, ctx: Context) -> Any:
    """Compare the user list in an uploaded PDF with the system's users.

    `upload_id` comes from a document the human attached. Returns a ready-made diff:
    {matched, role_mismatch, only_in_upload, only_in_system}. Read-only — it never
    creates or changes users; the upload is just one side of the comparison.
    """
    return await call(
        "GET", f"/uploads/{upload_id}/compare-users", authorization=_auth(ctx)
    )


class UserReportRow(BaseModel):
    name: str
    email: str
    role: str


@mcp.tool()
async def generate_user_report(
    users: list[UserReportRow],
    idempotency_key: str,
    ctx: Context,
    title: str = "User Report",
) -> Any:
    """Generate the 'User Report' PDF; returns {id, url}.

    `users` is a list of {name, email, role} (use list_users/list_roles to build it).
    """
    return await call(
        "POST",
        "/documents/user-report",
        authorization=_auth(ctx),
        json={"title": title, "users": [u.model_dump() for u in users]},
        idempotency_key=idempotency_key,
    )


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
