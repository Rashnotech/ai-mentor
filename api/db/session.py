#!/usr/bin/python3
"""
Database session management module for SQLAlchemy ORM.

This module provides a DBSession class that handles database engine creation,
session management, and common database operations for FastAPI applications.
"""

import os
from typing import Optional, Type, TypeVar, Any, Dict, List
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, scoped_session, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine, async_sessionmaker
from sqlalchemy.pool import NullPool, QueuePool
from core.config import settings
from db.base import Base
from contextlib import asynccontextmanager

T = TypeVar('T', bound='Base')

class DBSession:
    """
    Database session manager for handling SQLAlchemy ORM operations.
    
    This class provides:
    - Engine initialization with connection pooling
    - Session lifecycle management
    - Common CRUD operations
    - Thread-safe session handling with scoped_session
    
    Attributes:
        __engine: Private engine instance
        __async_engine: Private async engine instance (for async operations)
        __session_factory: Private session factory
        __async_session_factory: Private async session factory
    """
    
    __engine: Optional[Any] = None
    __async_engine: Optional[AsyncEngine] = None
    __session_factory: Optional[scoped_session] = None
    __async_session_factory: Optional[async_sessionmaker] = None

    def __init__(
        self,
        db_url: Optional[str] = None,
        use_async: bool = True,
        echo: bool = False,
        pool_size: int = 10,
        max_overflow: int = 20,
    ) -> None:
        """
        Initialize the database session.
        
        Args:
            db_url: Full database URL (includes host, port, and database name)
            use_async: Whether to use async engine (True by default)
            echo: Enable SQL echo logging
            pool_size: Connection pool size
            max_overflow: Maximum overflow connections
        """
        # Use provided db_url or get from settings
        database_url = db_url or settings.DATABASE_URL
        
        if database_url.startswith("postgres://"):
            database_url = database_url.replace(
                "postgres://",
                "postgresql+asyncpg://",
                1
            )
        elif database_url.startswith("postgresql://") and use_async:
            database_url = database_url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1
            )
        # Construct database URL

        if use_async:
            self.__async_engine = create_async_engine(
                database_url,
                echo=echo,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_pre_ping=True,  # Verify connections before using
            )
            self.__async_session_factory = async_sessionmaker(
                self.__async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        else:
            self.__engine = create_engine(
                database_url,
                echo=echo,
                poolclass=QueuePool,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_pre_ping=True,
            )
            session_factory = sessionmaker(
                bind=self.__engine,
                expire_on_commit=False,
            )
            self.__session_factory = scoped_session(session_factory)

    def get_session(self) -> Session:
        """
        Get a synchronous database session.
        
        Returns:
            A scoped SQLAlchemy session
            
        Raises:
            RuntimeError: If engine not initialized or async mode enabled
        """
        if self.__session_factory is None:
            raise RuntimeError(
                "Database session not initialized. "
                "Create DBSession instance or use get_async_session() for async mode."
            )
        return self.__session_factory()
    
    async def get_async_session(self) -> AsyncSession:
        """
        Get an asynchronous database session.
        
        Returns:
            An async SQLAlchemy session
            
        Raises:
            RuntimeError: If async engine not initialized
        """
        if self.__async_session_factory is None:
            raise RuntimeError(
                "Async database session not initialized. "
                "Create DBSession with use_async=True"
            )
        return self.__async_session_factory()

    async def create_tables_async(self) -> None:
        """Create all database tables asynchronously."""
        if self.__async_engine is None:
            raise RuntimeError("Async engine not initialized")
        async with self.__async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    def all(self, cls: Type[T], session: Optional[Session] = None) -> List[T]:
        """
        Query all objects of a given class.
        
        Args:
            cls: The model class to query
            session: Optional session instance (creates new if not provided)
            
        Returns:
            List of all objects of the given class
        """
        if session is None:
            session = self.get_session()
        try:
            return session.query(cls).all()
        finally:
            session.close()

    def get(self, cls: Type[T], id: Any, session: Optional[Session] = None) -> Optional[T]:
        """
        Retrieve a single object by ID.
        
        Args:
            cls: The model class to query
            id: The primary key value
            session: Optional session instance
            
        Returns:
            The object if found, None otherwise
        """
        if session is None:
            session = self.get_session()
        try:
            return session.query(cls).filter_by(id=id).first()
        finally:
            session.close()

    def filter(self, cls: Type[T], filters: Dict[str, Any], session: Optional[Session] = None) -> List[T]:
        """
        Query objects with filters.
        
        Args:
            cls: The model class to query
            filters: Dictionary of filter conditions
            session: Optional session instance
            
        Returns:
            List of filtered objects
        """
        if session is None:
            session = self.get_session()
        try:
            query = session.query(cls)
            for key, value in filters.items():
                if hasattr(cls, key):
                    query = query.filter(getattr(cls, key) == value)
            return query.all()
        finally:
            session.close()

    def new(self, obj: T, session: Optional[Session] = None) -> None:
        """
        Add a new object to the session.
        
        Args:
            obj: The object to add
            session: Optional session instance
        """
        if session is None:
            session = self.get_session()
        session.add(obj)

    def save(self, session: Optional[Session] = None) -> None:
        """
        Commit all changes in the current session.
        
        Args:
            session: Optional session instance
        """
        if session is None:
            session = self.get_session()
        session.commit()

    def delete(self, obj: T, session: Optional[Session] = None) -> None:
        """
        Delete an object from the session.
        
        Args:
            obj: The object to delete
            session: Optional session instance
        """
        if session is None:
            session = self.get_session()
        if obj:
            session.delete(obj)

    async def close_async(self) -> None:
        """Close async engine and dispose resources."""
        if self.__async_engine is not None:
            await self.__async_engine.dispose()

    async def reload_async(self) -> None:
        """Recreate all tables asynchronously."""
        if self.__async_engine is None:
            raise RuntimeError("Async engine not initialized")
        async with self.__async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await self.create_tables_async()


    @property
    def async_engine(self) -> AsyncEngine:
        """Get the async engine instance."""
        if self.__async_engine is None:
            raise RuntimeError("Async engine not initialized")
        return self.__async_engine

    @property
    def engine(self) -> Any:
        """Get the sync engine instance."""
        if self.__engine is None:
            raise RuntimeError("Sync engine not initialized")
        return self.__engine

    @asynccontextmanager
    async def get_async_session_context(self):
        if self.__async_session_factory is None:
            raise RuntimeError(
                "Async database session not initialized. "
                "Create DBSession with use_async=True"
            )
        session = self.__async_session_factory()
        try:
            yield session
        finally:
            await session.close()



# Singleton instance for application-wide use
# Initialize from environment variables or defaults
db_session = DBSession(
    db_url=settings.DATABASE_URL,
    use_async=True,  # Use async by default for FastAPI
    echo=os.getenv('DB_ECHO', 'False').lower() == 'true',
)

# Export engine for direct access if needed
engine = db_session.async_engine