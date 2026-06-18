import asyncio
from uuid import uuid4

from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

# Import the registry to ensure ALL models are registered
# before SQLAlchemy configures the mappers (RoleModel.users references UserModel).
import app.data.infra.models_registry  # noqa: F401
from app.data.infra.database import create_engine, create_session_factory
from app.data.role.repository.SQLRoleRepository import SQLRoleRepository
from app.data.role.model.RoleModel import RoleModel
from app.data.role.model.RolePermissionModel import RolePermissionModel
from app.data.user.repository.SQLUserRepository import SQLUserRepository
from app.data.auth.BcryptPasswordHasher import BcryptPasswordHasher
from app.domain.user.model.User import User
from app.domain.permission.model.Permission import Permission

# Default roles definition. Single source of truth for what each role gets.
# The permissions come from the enum (in code), not from loose strings.
DEFAULT_ROLES: dict[str, set[Permission]] = {
    "users.viewer": {
        Permission.USERS_GET_ALL,
        Permission.USERS_GET,
    },
    "users.admin": set(Permission),  # all permissions
}

# Initial admin — DEV ONLY. In production, come from an environment variable / secret.
ADMIN_NAME = "Admin"
ADMIN_EMAIL = "admin@chat-sample.dev"
ADMIN_PASSWORD = "admin"
ADMIN_ROLE = "users.admin"


async def seed_roles(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        repo = SQLRoleRepository(session)

        for name, permissions in DEFAULT_ROLES.items():
            existing = await repo.get_by_name(name)

            if existing is None:
                role_model = RoleModel(
                    name=name,
                    permissions=[
                        RolePermissionModel(permission=permission)
                        for permission in permissions
                    ],
                )
                session.add(role_model)
                print(f"created: role '{name}' with {len(permissions)} permissions")
                continue

            # Additive reconciliation: ensures that new permissions from DEFAULT_ROLES
            # reach already-existing roles (e.g. roles:get_all added later).
            missing = permissions - existing.permissions
            for permission in missing:
                session.add(
                    RolePermissionModel(role_id=existing.id, permission=permission)
                )
            if missing:
                print(f"updated: role '{name}' +{len(missing)} permissions")
            else:
                print(f"skip: role '{name}' already complete")

        await session.commit()


async def seed_admin(session_factory: async_sessionmaker[AsyncSession]) -> None:
    async with session_factory() as session:
        users = SQLUserRepository(session)
        roles = SQLRoleRepository(session)
        hasher = BcryptPasswordHasher()

        if await users.get_by_email(ADMIN_EMAIL) is not None:
            print(f"skip: admin '{ADMIN_EMAIL}' already exists")
            return

        role = await roles.get_by_name(ADMIN_ROLE)
        if role is None:
            raise RuntimeError(
                f"role '{ADMIN_ROLE}' not found — run seed_roles first"
            )

        admin = User(
            id=uuid4(),
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            hashed_password=await hasher.hash(ADMIN_PASSWORD),
            role=role,
        )
        await users.create(admin)
        print(f"created: admin '{ADMIN_EMAIL}' (dev password: '{ADMIN_PASSWORD}')")


async def main() -> None:
    # Standalone script: creates its own engine (outside the app lifespan) and
    # disposes of it at the end.
    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        # Order matters: the admin depends on the role 'users.admin' already existing.
        await seed_roles(session_factory)
        await seed_admin(session_factory)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
