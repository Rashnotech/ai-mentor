#!/usr/bin/python3
"""main entry"""
import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from app.schema.mutation import Mutation
from app.schema.query import Query


schema = strawberry.Schema(query=Query, mutation=Mutation)

app = FastAPI()
graphql_app = GraphQLRouter(schema)

app.include_router(graphql_app, prefix="/mutation")