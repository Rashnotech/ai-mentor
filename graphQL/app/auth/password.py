#!/usr/bin/python3
"""a module that handles password hashing"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


MAX_PASSWORD_LENGTH = 72

def hash_password(password: str) -> str:
    password = password.encode("utf-8")[:MAX_PASSWORD_LENGTH]
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    plain = plain.encode("utf-8")[:MAX_PASSWORD_LENGTH]
    return pwd_context.verify(plain, hashed)