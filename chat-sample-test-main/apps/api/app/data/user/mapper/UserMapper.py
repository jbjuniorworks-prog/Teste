from app.domain.user.model.User import User
from app.data.user.model.UserModel import UserModel
from app.data.role.mapper.RoleMapper import RoleMapper


class UserMapper:
    @staticmethod
    def to_entity(model: UserModel) -> User:
        return User(
            id=model.id,
            name=model.name,
            email=model.email,
            hashed_password=model.hashed_password,
            role=RoleMapper.to_entity(model.role),
        )
