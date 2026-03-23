#!/usr/bin/python3
"""a database session"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


class DBEngine:

    __engine = None

    def __init__(self, name):
        self.__engine = create_async_engine(name, echo=True)
        self.session_factory = sessionmaker(
            self.__engine,
            expire_on_commit=False,
            class_=AsyncSession
        )
    
    def begin(self):
        return self.__engine.begin()
    
    async def get_session(self):
        async with self.session_factory() as session:
            yield session

    def save(self):
        pass




engine = DBEngine(settings.DATABASE_URL)