#!/usr/bin/python3
"""a module for enumeration"""

from enum import Enum


class Role(str, Enum):
    ADMIN = "admin"
    MENTOR = "mentor"
    STUDENT = "student"
    BUYER = "buyer"
    STOREOWNER = "storeowner"