#!/usr/bin/python3
"""a main entry point"""

from fastapi import FastAPI
import strawberry
from strawberry.fastapi import GraphQLRouter


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello GraphQL"



schema = strawberry.Schema(query=Query)

app = FastAPI()
graphql_app = GraphQLRouter(schema)

app.include_router(graphql_app, prefix="/graphql")