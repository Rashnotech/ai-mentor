#!/usr/bin/python3
"""a module graphql type progress"""
import strawberry


@strawberry.type
class LessonProgressType:
    lesson_id: int
    completed: bool
    score: int
    time_spent: int

@strawberry.type
class ModuleProgressType:
    module_id: int
    completed: bool
    progress_percent: int

@strawberry.type
class CourseProgressType:
    course_id: int
    completed: bool
    progress_percent: int