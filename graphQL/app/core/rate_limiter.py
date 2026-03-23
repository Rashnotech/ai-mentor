#!/usr/bin/python3
"""a module that limit rate of requests"""
from slowapi import Limiter
from slowapi.util import get_remote_address


limiter = Limiter(key_func=get_remote_address)