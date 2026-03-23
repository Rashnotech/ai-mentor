#!/usr/bin/python3
"""mutation engine"""
import strawberry
from .types import User


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_user(self, username: str, email: str) -> User:
        return User(id=1, username=username, email=email)