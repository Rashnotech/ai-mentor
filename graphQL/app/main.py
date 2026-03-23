#!/usr/bin/python3
"""an entry point"""
import strawberry
from app.db.session import engine
from app.db.base import Base
from fastapi import FastAPI, Request, Depends
from strawberry.fastapi import GraphQLRouter
from strawberry.extensions import QueryDepthLimiter, QueryComplexityLimiter
from app.schema.mutation.mutation import Mutation
from app.schema.query.query import Query
from app.auth.dependencies import get_currrent_user
from app.loaders.course_loader import get_course_loader
from app.loaders.module_loader import get_module_loader
from app.loaders.lesson_loader import get_lesson_loader
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter


app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    extensions=[
        QueryDepthLimiter(max_depth=6),
        QueryComplexityLimiter(max_complexity=300)
    ])

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_context(request: Request):
    async with engine.session_factory() as session:
        
        yield {
            "db": session,
            "course_loader": get_course_loader(session),
            "lesson_loader": get_lesson_loader(session),
            "module_loader": get_module_loader(session),
            "user": await get_currrent_user(request)
        }

graphql_app = GraphQLRouter(
    schema,
    context_getter=get_context,
    dependencies=[Depends(limiter.limit("20/minute"))]
)

app.include_router(graphql_app, prefix="/dbengine")