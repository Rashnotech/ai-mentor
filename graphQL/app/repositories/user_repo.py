#!/usr/bin/python3
"""user repository for graphQL"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import User
from app.auth.password import hash_password, verify_password
from sqlalchemy import select



class UserRepository:

    async def create(self, session: AsyncSession, username: str, email: str) -> User:
        user = User(username=username, email=email)
        session.add(user)
        await session.commit()

        await session.refresh(user)
        return user
    
    async def create_with_password(self, session: AsyncSession,
                            username: str, email: str, password: str, role: str):
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
    
    async def authenticate(self, session, username, password):
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user
    
    async def list(self, session: AsyncSession) -> list[User]:
        result = await session.execute(select(User))
        return result.scalars().all()