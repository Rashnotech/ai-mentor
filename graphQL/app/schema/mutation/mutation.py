#!/usr/bin/python3
"""mutation for db"""

import strawberry
from strawberry.types import Info
from app.schema.types.types import UserType, CourseType
from app.repositories.user_repo import UserRepository
from app.auth.roles import Role
from app.auth.jwt import create_access_token
from app.repositories.course_repo import CourseRepository
from app.schema.mutation.progress import ProgressMutations


repo = UserRepository()
course = CourseRepository()

@strawberry.type
class AuthPayload:
    access_token: str


@strawberry.type
class Mutation(ProgressMutations):
    @strawberry.mutation
    async def create_user(
        self, info: Info, username: str, email: str
    ) -> UserType:
        session = info.context["db"]
        user = await repo.create(session, username, email)
        return UserType(
            id=user.id,
            username=user.username,
            email=user.email
        )
    
    @strawberry.mutation
    async def create_course(
        self, info: Info, title: str, user_id: int) -> CourseType:
        session = info.context["db"]
        c = await course.create(session, title, user_id)
        return CourseType(
            id=c.id,
            title=c.title,
        )
    
    @strawberry.mutation
    async def register(
        self, info, username: str, email: str, password: str
    ) -> UserType:
        session = info.context["db"]
        user = await repo.create_with_password(
            session, username, email, password, Role.STUDENT.value
        )
        return UserType(id=user.id, username=user.username, email=user.email)
    
    @strawberry.mutation
    async def login(
        self, info, username: str, password: str
    ) -> AuthPayload:
        session = info.context["db"]
        user = await repo.authenticate(session, username, password)
        if not user:
            raise Exception("Invalid credentials")
        
        token = create_access_token({
            "sub": user.username,
            "role": user.role
        })
        return AuthPayload(access_token=token)
    
    @strawberry.mutation
    async def submit_lesson(
        self, info, lesson_id: int, answer: str
    ) -> str:
        from app.services.ai_feedback import generate_feedback
        from app.db.models import Submission, AIFeedback

        session = info.context["db"]
        user = info.context["user"]

        submission = Submission(
            lesson_id=lesson_id,
            user_id=user["sub"],
            answer=answer
        )
        session.add(submission)
        await session.flush()

        ai = await generate_feedback(answer)

        feedback = AIFeedback(
            submission_id = submission.id,
            score=ai["score"],
            feedback=ai["feedback"]
        )

        session.add(feedback)
        await session.commit()

        return "Submitted successfully"