#!/usr/bin/python3
"""a types for schema"""

import strawberry


@strawberry.type
class User:
    id: int
    username: str
    email: str