#!/usr/bin/python3
"""
Student progress, quiz, project submission, and gamification routes.
"""
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from auth.dependencies import get_current_user, get_db_session
from domains.courses.services.progress_service import ProgressService
from domains.courses.services.gamification_service import GamificationService
from domains.courses.schemas.course_schema import (
    LessonCompletionRequest,
    AssessmentSubmissionRequest,
    AssessmentSubmissionResponse,
    ProjectSubmissionRequest,
    ProjectSubmissionResponse,
    ModuleProgressResponse,
)
from domains.users.models.user import User
from core.errors import AppError

logger = logging.getLogger(__name__)

progress_router = APIRouter(prefix="/progress", tags=["student-progress"])


@progress_router.post(
    "/lessons/{lesson_id}/complete",
    status_code=status.HTTP_200_OK,
    summary="Mark lesson as completed",
    description="Mark a lesson as completed by the student",
)
async def complete_lesson(
    lesson_id: int,
    request: LessonCompletionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Mark a lesson as completed and update daily XP/streak."""
    try:
        from domains.courses.models.course import Lesson
        from domains.courses.models.progress import LessonProgress
        from domains.users.services.activity_service import touch_last_active

        user_id = current_user.get("user_id")
        await touch_last_active(db_session, user_id)

        service = ProgressService(db_session)
        progress = await service.mark_lesson_completed(
            user_id=user_id,
            lesson_id=lesson_id,
            time_spent_minutes=request.time_spent_minutes,
            notes=request.notes,
        )

        # Update daily streak and award XP for completing a lesson (best-effort)
        try:
            await GamificationService(db_session).record_learning_activity(
                user_id=user_id,
                xp_earned=10,
                submitted_at=datetime.now(timezone.utc),
            )
        except Exception as gam_err:
            logger.error(f"Gamification update failed on lesson complete: {str(gam_err)}")

        # Get lesson details to return module/path context
        lesson_stmt = select(Lesson).where(Lesson.lesson_id == lesson_id)
        lesson_result = await db_session.execute(lesson_stmt)
        lesson = lesson_result.scalar_one_or_none()

        module_progress = None
        if lesson and lesson.module_id:
            total_lessons_stmt = select(func.count(Lesson.lesson_id)).where(
                Lesson.module_id == lesson.module_id
            )
            total_result = await db_session.execute(total_lessons_stmt)
            total_lessons = total_result.scalar() or 0

            completed_stmt = (
                select(func.count(LessonProgress.lesson_id))
                .join(Lesson, LessonProgress.lesson_id == Lesson.lesson_id)
                .where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.completed == True,
                    Lesson.module_id == lesson.module_id,
                )
            )
            completed_result = await db_session.execute(completed_stmt)
            completed_lessons = completed_result.scalar() or 0

            module_progress = {
                "module_id": lesson.module_id,
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
                "progress_percent": round((completed_lessons / total_lessons * 100))
                if total_lessons > 0
                else 0,
            }

        return {
            "progress_id": progress.progress_id,
            "lesson_id": progress.lesson_id,
            "completed": progress.completed,
            "is_completed": progress.completed,
            "time_spent_minutes": progress.time_spent_minutes,
            "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
            "module_progress": module_progress,
        }

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error completing lesson: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error completing lesson",
        )


@progress_router.post(
    "/quiz/{question_id}/answer",
    status_code=status.HTTP_200_OK,
    summary="Submit quiz answer",
    description="Submit answer to a quiz question and verify against correct answer",
)
async def submit_quiz_answer(
    question_id: int,
    answer: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Submit a quiz answer, verify correctness, and record XP/streak."""
    try:
        from domains.courses.models.assessment import AssessmentQuestion, AssessmentResponse
        from domains.users.services.activity_service import touch_last_active

        result = await db_session.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.question_id == question_id)
        )
        question = result.scalar_one_or_none()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )

        is_correct = False
        correct_index = int(question.correct_answer)
        if question.correct_answer:
            is_correct = answer.strip().lower() == question.options[correct_index].strip().lower()

        user_id = current_user.get("user_id")
        await touch_last_active(db_session, user_id)

        existing_result = await db_session.execute(
            select(AssessmentResponse).where(
                AssessmentResponse.user_id == user_id,
                AssessmentResponse.question_id == question_id,
            )
        )
        existing_response = existing_result.scalar_one_or_none()
        was_already_correct = bool(existing_response and existing_response.is_correct)

        if existing_response:
            existing_response.response_text = answer
            existing_response.is_correct = is_correct
            existing_response.attempts = (existing_response.attempts or 0) + 1
        else:
            new_response = AssessmentResponse(
                user_id=user_id,
                question_id=question_id,
                response_text=answer,
                is_correct=is_correct,
                time_taken_seconds=0,
                attempts=1,
            )
            db_session.add(new_response)

        await db_session.commit()

        # Award XP and update daily streak on first correct answer (best-effort)
        points_to_award = (
            (question.points or 10) if (is_correct and not was_already_correct) else 0
        )
        try:
            await GamificationService(db_session).record_quiz_activity(
                user_id=user_id,
                question_id=question_id,
                is_correct=is_correct,
                points_earned=points_to_award,
                submitted_at=datetime.now(timezone.utc),
            )
        except Exception as gam_err:
            logger.error(f"Gamification update failed on quiz answer: {str(gam_err)}")

        # AI mentor trigger (best-effort)
        try:
            await _maybe_trigger_quiz_feedback(db_session, user_id, question.module_id)
        except Exception as e:
            logger.error(f"AI mentor quiz feedback trigger failed: {str(e)}")

        return {
            "question_id": question_id,
            "is_correct": is_correct,
            "correct_answer": question.options[correct_index],
            "explanation": question.explanation,
            "points_earned": question.points if is_correct else 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting quiz answer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting quiz answer",
        )


async def _maybe_trigger_quiz_feedback(
    db_session: AsyncSession, user_id: str, module_id: int
) -> None:
    """If the student has answered every question in this module's quiz, generate AI mentor feedback once."""
    from domains.courses.models.assessment import AssessmentQuestion, AssessmentResponse
    from domains.courses.models.course import Module
    from domains.ai.services import mentor_feedback_service

    questions_stmt = select(AssessmentQuestion).where(AssessmentQuestion.module_id == module_id)
    questions_result = await db_session.execute(questions_stmt)
    questions = questions_result.scalars().all()
    if not questions:
        return

    question_ids = [q.question_id for q in questions]
    responses_stmt = select(AssessmentResponse).where(
        AssessmentResponse.user_id == user_id,
        AssessmentResponse.question_id.in_(question_ids),
    )
    responses_result = await db_session.execute(responses_stmt)
    responses = {r.question_id: r for r in responses_result.scalars().all()}

    if len(responses) < len(questions):
        return

    if await mentor_feedback_service.has_quiz_feedback(db_session, user_id, module_id):
        return

    total_points = sum(q.points or 0 for q in questions)
    earned_points = sum(q.points or 0 for q in questions if responses[q.question_id].is_correct)
    correct_count = sum(1 for q in questions if responses[q.question_id].is_correct)
    score_percent = (earned_points / total_points * 100) if total_points > 0 else 0.0

    module_result = await db_session.execute(select(Module).where(Module.module_id == module_id))
    module = module_result.scalar_one_or_none()
    module_title = module.title if module else "this module"

    await mentor_feedback_service.generate_quiz_feedback(
        db_session=db_session,
        user_id=user_id,
        module_id=module_id,
        module_title=module_title,
        score_percent=score_percent,
        correct_count=correct_count,
        total_count=len(questions),
    )


@progress_router.post(
    "/assessments/{question_id}/submit",
    response_model=AssessmentSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit assessment response",
    description="Submit answer to assessment question with deadline-based points",
)
async def submit_assessment(
    question_id: int,
    request: AssessmentSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Submit an assessment response."""
    try:
        service = ProgressService(db_session)
        submission = await service.submit_assessment(
            user_id=current_user.get("user_id"),
            question_id=question_id,
            module_id=request.module_id,
            response_text=request.response_text,
            time_taken_seconds=request.time_taken_seconds,
            confidence_level=request.confidence_level,
        )

        return AssessmentSubmissionResponse(
            submission_id=submission.submission_id,
            question_id=submission.question_id,
            module_id=submission.module_id,
            is_correct=submission.is_correct,
            deadline_status=submission.deadline_status.value,
            points_earned=submission.points_earned,
            submitted_at=submission.submitted_at.isoformat(),
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error submitting assessment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting assessment",
        )


@progress_router.post(
    "/projects/{project_id}/submit",
    response_model=ProjectSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit project solution",
    description="Submit solution URL for a project with deadline-based points",
)
async def submit_project(
    project_id: int,
    request: ProjectSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Submit a project solution and update daily XP/streak."""
    try:
        from domains.users.services.activity_service import touch_last_active

        user_id = current_user.get("user_id")
        await touch_last_active(db_session, user_id)

        service = ProgressService(db_session)
        submission = await service.submit_project(
            user_id=user_id,
            project_id=project_id,
            module_id=request.module_id,
            solution_url=request.solution_url,
            description=request.description,
        )

        # Update daily streak and award XP for project submission (best-effort)
        try:
            await GamificationService(db_session).record_learning_activity(
                user_id=user_id,
                xp_earned=25,
                submitted_at=datetime.now(timezone.utc),
            )
        except Exception as gam_err:
            logger.error(f"Gamification update failed on project submit: {str(gam_err)}")

        return ProjectSubmissionResponse(
            submission_id=submission.submission_id,
            project_id=submission.project_id,
            module_id=submission.module_id,
            solution_url=submission.solution_url,
            status=submission.status,
            is_approved=submission.is_approved,
            deadline_status=submission.deadline_status.value,
            points_earned=submission.points_earned,
            submitted_at=submission.submitted_at.isoformat(),
            reviewed_at=submission.reviewed_at.isoformat() if submission.reviewed_at else None,
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error submitting project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting project",
        )


@progress_router.put(
    "/projects/{submission_id}/update-url",
    response_model=ProjectSubmissionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update project submission URL",
    description="Update the solution URL for a submitted project (before mentor review)",
)
async def update_project_submission_url(
    submission_id: int,
    request: ProjectSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Update a project submission URL before mentor review."""
    try:
        from domains.users.services.activity_service import touch_last_active

        user_id = current_user.get("user_id")
        await touch_last_active(db_session, user_id)

        service = ProgressService(db_session)
        submission = await service.update_project_submission_url(
            submission_id=submission_id,
            new_solution_url=request.solution_url,
            user_id=user_id,
        )

        return ProjectSubmissionResponse(
            submission_id=submission.submission_id,
            project_id=submission.project_id,
            module_id=submission.module_id,
            solution_url=submission.solution_url,
            status=submission.status,
            is_approved=submission.is_approved,
            deadline_status=submission.deadline_status.value,
            points_earned=submission.points_earned,
            submitted_at=submission.submitted_at.isoformat(),
            reviewed_at=submission.reviewed_at.isoformat() if submission.reviewed_at else None,
        )

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error updating project submission URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating submission",
        )


@progress_router.post(
    "/projects/{project_id}/start",
    status_code=status.HTTP_200_OK,
    summary="Mark a project as started",
    description="Called once when a student opens a project. Marks progress in_progress and returns AI mentor guidance.",
)
async def start_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Mark a project as started and return AI mentor guidance."""
    try:
        from domains.courses.models.course import Project
        from domains.progress.models.progress import UserProgress
        from domains.ai.services import mentor_feedback_service
        from domains.users.services.activity_service import touch_last_active
        from core.constant import ProgressStatus

        user_id = current_user.get("user_id")
        await touch_last_active(db_session, user_id)

        project_result = await db_session.execute(
            select(Project).where(Project.project_id == project_id)
        )
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

        progress_result = await db_session.execute(
            select(UserProgress).where(
                UserProgress.user_id == user_id,
                UserProgress.project_id == project_id,
            )
        )
        progress = progress_result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if not progress:
            db_session.add(
                UserProgress(
                    user_id=user_id,
                    project_id=project_id,
                    status=ProgressStatus.IN_PROGRESS,
                    started_at=now,
                )
            )
            await db_session.commit()
        elif progress.status == ProgressStatus.NOT_STARTED:
            progress.status = ProgressStatus.IN_PROGRESS
            progress.started_at = now
            db_session.add(progress)
            await db_session.commit()

        existing = await mentor_feedback_service.get_existing_project_guidance(
            db_session, user_id, project_id
        )
        if existing:
            guidance = existing
        else:
            guidance = await mentor_feedback_service.generate_project_guidance(
                db_session=db_session,
                user_id=user_id,
                project_id=project_id,
                project_title=project.title,
                project_description=project.description,
                required_skills=project.required_skills,
            )

        return {
            "guidance": {
                "feedback_id": guidance.feedback_id,
                "category": guidance.category,
                "title": guidance.title,
                "message": guidance.message,
                "context_title": guidance.context_title,
                "score_percent": guidance.score_percent,
                "created_at": guidance.created_at.isoformat(),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error starting project",
        )


@progress_router.get(
    "/ai-feedback",
    status_code=status.HTTP_200_OK,
    summary="Get AI Mentor Feedback feed",
    description="The student's dashboard feed of AI-generated mentor messages.",
)
async def get_ai_mentor_feedback(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """List the current student's AI Mentor Feedback, newest first."""
    from domains.ai.services import mentor_feedback_service

    user_id = current_user.get("user_id")
    feed = await mentor_feedback_service.get_feed(db_session, user_id, limit=limit)
    return {
        "items": [
            {
                "feedback_id": item.feedback_id,
                "category": item.category,
                "title": item.title,
                "message": item.message,
                "context_title": item.context_title,
                "score_percent": item.score_percent,
                "created_at": item.created_at.isoformat(),
            }
            for item in feed
        ]
    }


@progress_router.get(
    "/modules/{module_id}",
    response_model=ModuleProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Get module progress",
    description="View your progress in a module",
)
async def get_module_progress(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
    """Get your progress in a module."""
    try:
        service = ProgressService(db_session)
        progress = await service.get_user_progress(
            user_id=current_user.get("user_id"),
            module_id=module_id,
        )

        return ModuleProgressResponse(**progress)

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        logger.error(f"Error getting module progress: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching module progress",
        )
