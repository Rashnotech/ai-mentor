#!/usr/bin/python3
"""a main entry"""
import strawberry
from .types import User


@strawberry.type
class Query:
    @strawberry.field
    def users(self) -> list[User]:
        return []