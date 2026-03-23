#!/usr/bin/python3
"""main entry"""
from fastapi import FastAPI
import strawberry
from strawberry.fastapi import GraphQLRouter

@strawberry.type
class User:
    id: int
    username: str
    email: str

@strawberry.type
class Query:
    @strawberry.field
    def user(self) -> User:
        return User(
            id=1,
            username="rasheed",
            email="rasheed@example.com"
        )

schema = strawberry.Schema(query=Query)

app = FastAPI()
graphql_app = GraphQLRouter(schema)

app.include_router(graphql_app, prefix="/entry")