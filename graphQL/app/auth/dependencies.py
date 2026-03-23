#!/usr/bin/python3
"""a module that handle GraphQL"""
from fastapi import Request
from app.auth.jwt import decode_access_token


async def get_currrent_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    
    token = auth.replace("Bearer", "")
    return decode_access_token(token)


async def require_role(user, allowed_roles: list[str]):
    if not user:
        raise Exception("Not authenticated")
    if user["role"] not in allowed_roles:
        raise Exception("Forbidden")