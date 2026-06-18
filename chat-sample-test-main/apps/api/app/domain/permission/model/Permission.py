from enum import StrEnum

class Permission(StrEnum):
    USERS_GET_ALL = 'users:get_all'
    USERS_GET = 'users:get'
    USERS_CREATE = 'users:create'
    USERS_UPDATE = 'users:update'
    USERS_DELETE = 'users:delete'
    ROLES_GET_ALL = 'roles:get_all'