#!/usr/bin/env python3
"""a module for password hashing"""
from pwdlib import PasswordHash


pwd_context = PasswordHash.recommended()


def verify_password(plain_password, hashed_password):
    """Verify the password"""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hash the password"""
    return pwd_context.hash(password)