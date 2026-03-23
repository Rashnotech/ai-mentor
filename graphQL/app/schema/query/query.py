#!/usr/bin/python3
"""a module that handle user query"""
import strawberry
from strawberry.types import Info
from app.schema.types.types import UserType
from app.repositories.user_repo import UserRepository
from app.schema.query.progress import ProgressQueries

repo = UserRepository()

@strawberry.type
class Query(ProgressQueries):
    @strawberry.field
    async def users(self, info: Info) -> list[UserType]:
        session = info.context["db"]
        users = await repo.list(session)

        return [
            UserType(
                id=u.id,
                username=u.username,
                email=u.email
            ) for u in users
        ]
    
    @strawberry.field
    async def admin_users(self, info) -> list[UserType]:
        from app.auth.dependencies import require_role
        require_role(info.context["user"], ["admin"])
        session = info.context["db"]
        users = await repo.list(session)
        return [...]