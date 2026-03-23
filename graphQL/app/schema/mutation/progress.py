import strawberry
from app.repositories.progress_repo import ProgressRepository


@strawberry.type
class ProgressMutations:

    @strawberry.mutation
    async def complete_lesson(self, info, lesson_id: int, score: int, time_spent: int) -> str:
        user = info.context["user"]
        session = info.context["db"]
        repo = ProgressRepository()
        await repo.mark_lesson_complete(session, user["sub"], lesson_id, score, time_spent)
        return "Progress updated successfully"