#!/usr/bin/python3
"""
Fix Python Programming Quiz Answers Migration Job

Corrects the `correct_answer` field for all AssessmentQuestion records that
belong to the **Python Programming** course.

Background
----------
The intended schema stores `correct_answer` as the *index* of the correct
option within the `options` array (e.g. ``"2"`` means the third option).
The Python Programming course was seeded incorrectly: many records store the
full option *text* instead of the index.

This job is idempotent – questions whose `correct_answer` already holds a
valid index string are left untouched.

Safety features
---------------
- Single database transaction; rolls back on any unexpected error.
- Advisory lock prevents concurrent execution across multiple processes.
- Detailed logging of every updated record.
- Questions where the stored text cannot be matched against any option are
  flagged and reported but are *not* silently modified.

Usage
-----
Run directly::

    cd api
    python -m domains.courses.jobs.fix_python_quiz_answers_job

Or call ``run_fix_python_quiz_answers_job()`` from application code.
"""

import asyncio
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db.session import db_session
from domains.courses.models.course import Course, LearningPath, Module
from domains.courses.models.assessment import AssessmentQuestion

logger = logging.getLogger(__name__)

# Unique advisory lock ID for this job (arbitrary 64-bit integer)
FIX_PYTHON_QUIZ_LOCK_ID = 920_301_002

PYTHON_COURSE_TITLE = "Python Programming"


class PythonQuizAnswerFixer:
    """
    Traverses the Python Programming course hierarchy and corrects
    ``correct_answer`` values that store option text instead of option index.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def run(self) -> dict:
        """
        Execute the migration inside a single transaction.

        Returns
        -------
        dict
            Summary with counts of updated, skipped, and flagged questions.
        """
        updated: list[dict] = []
        skipped: list[int] = []
        flagged: list[dict] = []

        try:
            course = await self._get_python_course()
            if course is None:
                logger.warning(
                    "Course '%s' not found – nothing to do.", PYTHON_COURSE_TITLE
                )
                return {
                    "status": "not_found",
                    "course": PYTHON_COURSE_TITLE,
                    "updated": 0,
                    "skipped": 0,
                    "flagged": 0,
                }

            logger.info(
                "Found course '%s' (id=%d). Starting migration.",
                course.title,
                course.course_id,
            )

            paths = await self._get_learning_paths(course.course_id)
            logger.info("Found %d learning path(s).", len(paths))

            for path in paths:
                modules = await self._get_modules(path.path_id)
                logger.info(
                    "  Path '%s' (id=%d): %d module(s).",
                    path.title,
                    path.path_id,
                    len(modules),
                )

                for module in modules:
                    questions = await self._get_questions(module.module_id)
                    logger.info(
                        "    Module '%s' (id=%d): %d question(s).",
                        module.title,
                        module.module_id,
                        len(questions),
                    )

                    for question in questions:
                        result = self._process_question(question)
                        if result == "updated":
                            updated.append(
                                {
                                    "question_id": question.question_id,
                                    "module_id": module.module_id,
                                    "new_correct_answer": question.correct_answer,
                                }
                            )
                            self.session.add(question)
                        elif result == "skipped":
                            skipped.append(question.question_id)
                        else:
                            # result is the unmatched answer text
                            flagged.append(
                                {
                                    "question_id": question.question_id,
                                    "module_id": module.module_id,
                                    "correct_answer": question.correct_answer,
                                    "options": question.options,
                                    "reason": result,
                                }
                            )

            await self.session.commit()

            summary = {
                "status": "success",
                "course": PYTHON_COURSE_TITLE,
                "updated_count": len(updated),
                "skipped_count": len(skipped),
                "flagged_count": len(flagged),
                "updated": updated,
                "flagged": flagged,
            }

            logger.info(
                "Migration completed – updated: %d, skipped: %d, flagged: %d.",
                len(updated),
                len(skipped),
                len(flagged),
            )

            if flagged:
                logger.warning(
                    "%d question(s) could not be matched and were NOT modified: %s",
                    len(flagged),
                    flagged,
                )

            return summary

        except Exception as exc:
            await self.session.rollback()
            logger.error(
                "Migration failed, transaction rolled back: %s", exc, exc_info=True
            )
            raise

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _process_question(self, question: AssessmentQuestion) -> str:
        """
        Inspect a single question and update it in-place if necessary.

        Returns
        -------
        "skipped"  – already stored as a valid index; no change needed.
        "updated"  – was a text answer; corrected to the matching index.
        str        – error description when no option matched (flagged).
        """
        options = question.options or []
        current = question.correct_answer

        if current is None:
            return "skipped"

        # Check whether current value is already a valid index string.
        if self._is_valid_index(current, options):
            logger.debug(
                "Question %d already has index answer '%s' – skipping.",
                question.question_id,
                current,
            )
            return "skipped"

        # Try to find the matching option index.
        for idx, option in enumerate(options):
            if option == current:
                old_value = question.correct_answer
                question.correct_answer = str(idx)
                logger.info(
                    "Question %d: '%s' → '%s' (option index %d).",
                    question.question_id,
                    old_value,
                    question.correct_answer,
                    idx,
                )
                return "updated"

        # No match found – flag for manual review.
        return (
            f"correct_answer '{current}' did not match any option in {options}"
        )

    @staticmethod
    def _is_valid_index(value: str, options: list) -> bool:
        """Return True when *value* is a non-negative integer string that
        falls within the bounds of *options*."""
        if not value.isdigit():
            return False
        index = int(value)
        return 0 <= index < len(options)

    async def _get_python_course(self) -> Optional[Course]:
        result = await self.session.execute(
            select(Course).where(Course.title == PYTHON_COURSE_TITLE)
        )
        return result.scalar_one_or_none()

    async def _get_learning_paths(self, course_id: int) -> list[LearningPath]:
        result = await self.session.execute(
            select(LearningPath).where(LearningPath.course_id == course_id)
        )
        return result.scalars().all()

    async def _get_modules(self, path_id: int) -> list[Module]:
        result = await self.session.execute(
            select(Module).where(Module.path_id == path_id).order_by(Module.order)
        )
        return result.scalars().all()

    async def _get_questions(self, module_id: int) -> list[AssessmentQuestion]:
        result = await self.session.execute(
            select(AssessmentQuestion)
            .where(AssessmentQuestion.module_id == module_id)
            .order_by(AssessmentQuestion.order)
            .with_for_update(skip_locked=True)
        )
        return result.scalars().all()


# ---------------------------------------------------------------------------
# Advisory lock helpers
# ---------------------------------------------------------------------------


async def _acquire_advisory_lock(session: AsyncSession) -> bool:
    result = await session.execute(
        text("SELECT pg_try_advisory_lock(:lock_id)"),
        {"lock_id": FIX_PYTHON_QUIZ_LOCK_ID},
    )
    return result.scalar()


async def _release_advisory_lock(session: AsyncSession) -> None:
    await session.execute(
        text("SELECT pg_advisory_unlock(:lock_id)"),
        {"lock_id": FIX_PYTHON_QUIZ_LOCK_ID},
    )


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------


async def run_fix_python_quiz_answers_job() -> dict:
    """
    Run the Python quiz answer migration with an advisory lock.

    - Skips gracefully if another instance is already running.
    - Always releases the lock, even on error.
    """
    logger.info("Starting Python quiz answer fix job…")

    async with db_session.get_async_session_context() as session:
        acquired = await _acquire_advisory_lock(session)
        if not acquired:
            logger.warning(
                "Fix Python quiz answers job skipped – another instance holds the lock."
            )
            return {"status": "skipped", "reason": "lock_held"}

        try:
            fixer = PythonQuizAnswerFixer(session)
            return await fixer.run()
        finally:
            try:
                await _release_advisory_lock(session)
            except Exception as unlock_err:
                logger.error("Failed to release advisory lock: %s", unlock_err)


# Allow direct execution: python -m domains.courses.jobs.fix_python_quiz_answers_job
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(run_fix_python_quiz_answers_job())
