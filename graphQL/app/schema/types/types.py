#!/usr/bin/python3
"""a module for the types"""

import strawberry



@strawberry.type
class LessonType:
    id: int
    title: str
    content: str

@strawberry.type
class ModuleType:
    id: int
    title: str

    @strawberry.field
    async def lessons(self, info) -> list[LessonType]:
        loader = info.context["lesson_loader"]
        lessons = await loader.load(self.id)
        return [
            LessonType(id=l.id, title=l.title, content=l.content)
            for l in lessons
        ]


@strawberry.type
class CourseType:
    id: int
    title: str
    description: str

    @strawberry.field
    async def modules(self, info) -> list[ModuleType]:
        loader = info.context["module_loader"]
        modules = await loader.load(self.id)
        return [
            ModuleType(id=m.id, title=m.title)
            for m in modules
        ]





@strawberry.type
class UserType:
    id: int
    username: str
    email: str

    @strawberry.field
    async def courses(self, info) -> list[CourseType]:
        loader = info.context["course_loader"]
        session = info.context["db"]
        courses = await loader.load(self.id)
        return [CourseType(id=c.id, title=c.title) for c in courses]

