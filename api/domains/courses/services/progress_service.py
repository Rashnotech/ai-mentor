#!/usr/bin/python3
"""
Progress tracking and submission management service.
Handles lesson completion, assessments, and project submissions with deadline-based rewards.
"""
from typing import Optional, Dict
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from domains.courses.models.progress import (
    LessonProgress,
    AssessmentSubmission,
    ProjectSubmission,
    ModuleProgress,
    DeadlineStatus,
    UserModuleAvailability,
)
from domains.courses.models.course import Module, Lesson, Project
from domains.courses.models.assessment import AssessmentQuestion
from domains.users.models.user import User
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class ProgressService:
    """Service for tracking student progress and managing submissions."""

    def __init__(self, db_session: AsyncSession):
        """
        Initialize ProgressService.

        Args:
            db_session: Async database session
        """
        self.db_session = db_session

    # Deadline reward constants
    FIRST_DEADLINE_POINTS = 100  # Full points
    SECOND_DEADLINE_POINTS = 50  # Half points
    THIRD_DEADLINE_POINTS = 25  # Quarter points for third deadline
    LATE_POINTS = 0  # No points for late submission

    async def mark_lesson_completed(
        self,
        user_id: str,
        lesson_id: int,
        time_spent_minutes: int = 0,
        notes: Optional[str] = None,
    ) -> LessonProgress:
        """
        Mark a lesson as completed by a student.

        Args:
            user_id: Student user ID
            lesson_id: Lesson ID
            time_spent_minutes: Time spent on lesson
            notes: Optional student notes

        Returns:
            Created/updated LessonProgress

        Raises:
            AppError: If lesson not found or update fails
        """
        try:
            # Get or create progress record
            stmt = select(LessonProgress).where(
                and_(
                    LessonProgress.user_id == user_id,
                    LessonProgress.lesson_id == lesson_id,
                )
            )
            result = await self.db_session.execute(stmt)
            progress = result.scalar_one_or_none()

            if not progress:
                progress = LessonProgress(
                    user_id=user_id,
                    lesson_id=lesson_id,
                )
                self.db_session.add(progress)
            
            # Check if already completed - return existing progress without error
            if progress.completed:
                logger.info(f"Lesson {lesson_id} already completed for user {user_id}")
                return progress
            
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)
            progress.time_spent_minutes = time_spent_minutes
            if notes:
                progress.notes = notes
            progress.updated_at = datetime.now(timezone.utc)

            await self.db_session.commit()
            await self.db_session.refresh(progress)

            logger.info(f"Lesson {lesson_id} marked completed for user {user_id}")
            return progress

        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error marking lesson completed: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error marking lesson as completed",
                error_code="LESSON_COMPLETION_ERROR",
            )

    async def submit_assessment(
        self,
        user_id: str,
        question_id: int,
        module_id: int,
        response_text: str,
        time_taken_seconds: int,
        is_correct: Optional[bool] = None,
        confidence_level: Optional[int] = None,
    ) -> AssessmentSubmission:
        """
        Submit an assessment response.

        Automatically calculates points based on user-specific deadline status.

        Args:
            user_id: Student user ID
            question_id: Assessment question ID
            module_id: Module ID
            response_text: Student's response
            time_taken_seconds: Time spent answering
            is_correct: Whether answer is correct (auto-graded)
            confidence_level: Student's confidence (1-10)

        Returns:
            Created AssessmentSubmission with points calculated

        Raises:
            AppError: If submission fails
        """
        try:
            # Get module to check deadlines
            module = await self._get_module(module_id)
            if not module:
                raise AppError(
                    status_code=404,
                    detail="Module not found",
                    error_code="MODULE_NOT_FOUND",
                )

            # Get user's module availability for personalized deadlines
            user_availability = await self._get_user_module_availability(user_id, module_id)

            # Calculate deadline status and points using user-specific deadlines
            now = datetime.now(timezone.utc)
            deadline_status, points = self._calculate_deadline_status_and_points(
                now, module, user_availability
            )

            submission = AssessmentSubmission(
                user_id=user_id,
                question_id=question_id,
                module_id=module_id,
                response_text=response_text,
                time_taken_seconds=time_taken_seconds,
                is_correct=is_correct,
                confidence_level=confidence_level,
                deadline_status=deadline_status,
                points_earned=points if is_correct else 0,  # Only award if correct
            )

            self.db_session.add(submission)
            await self.db_session.commit()
            await self.db_session.refresh(submission)

            # Update module progress
            await self._update_module_progress(user_id, module_id)
            
            # Update gamification (XP and streak)
            await self._update_gamification(
                user_id=user_id,
                question_id=question_id,
                is_correct=is_correct,
                points_earned=submission.points_earned,
                submitted_at=submission.submitted_at,
            )

            logger.info(
                f"Assessment submitted for user {user_id}: {deadline_status} ({points} points)"
            )
            return submission

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error submitting assessment: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error submitting assessment",
                error_code="ASSESSMENT_SUBMISSION_ERROR",
            )

    async def submit_project(
        self,
        user_id: str,
        project_id: int,
        module_id: int,
        solution_url: str,
        description: Optional[str] = None,
    ) -> ProjectSubmission:
        """
        Submit a project solution.

        Automatically calculates points based on user-specific deadline status.
        If user has already submitted this project, returns the existing submission.

        Args:
            user_id: Student user ID
            project_id: Project ID
            module_id: Module ID
            solution_url: URL to solution (repo, file, etc.)
            description: Optional description of solution

        Returns:
            Created or existing ProjectSubmission with points calculated

        Raises:
            AppError: If submission fails
        """
        try:
            # Check for existing submission to prevent duplicates
            existing_stmt = select(ProjectSubmission).where(
                and_(
                    ProjectSubmission.user_id == user_id,
                    ProjectSubmission.project_id == project_id,
                )
            ).order_by(ProjectSubmission.submitted_at.desc())
            result = await self.db_session.execute(existing_stmt)
            existing_submission = result.scalars().first()
            
            if existing_submission:
                logger.info(
                    f"Project {project_id} already submitted by user {user_id}, returning existing submission"
                )
                return existing_submission
            
            # Verify project exists
            project = await self._get_project(project_id)
            if not project:
                raise AppError(
                    status_code=404,
                    detail="Project not found",
                    error_code="PROJECT_NOT_FOUND",
                )

            # Get module to check deadlines
            module = await self._get_module(module_id)
            if not module:
                raise AppError(
                    status_code=404,
                    detail="Module not found",
                    error_code="MODULE_NOT_FOUND",
                )

            # Get user's module availability for personalized deadlines
            user_availability = await self._get_user_module_availability(user_id, module_id)

            # Calculate deadline status and points using user-specific deadlines
            now = datetime.now(timezone.utc)
            deadline_status, points = self._calculate_deadline_status_and_points(
                now, module, user_availability
            )

            submission = ProjectSubmission(
                user_id=user_id,
                project_id=project_id,
                module_id=module_id,
                solution_url=solution_url,
                description=description,
                deadline_status=deadline_status,
                points_earned=points,  # Points awarded on submission, pending approval
                status="submitted",
            )

            self.db_session.add(submission)
            await self.db_session.commit()
            await self.db_session.refresh(submission)

            logger.info(
                f"Project submitted for user {user_id}: {deadline_status} ({points} points pending)"
            )
            return submission

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error submitting project: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error submitting project",
                error_code="PROJECT_SUBMISSION_ERROR",
            )

    async def approve_project_submission(
        self,
        submission_id: int,
        feedback: Optional[str] = None,
    ) -> ProjectSubmission:
        """
        Approve a project submission (reviewer/mentor action).

        Args:
            submission_id: Submission ID to approve
            feedback: Optional reviewer feedback

        Returns:
            Updated ProjectSubmission

        Raises:
            AppError: If submission not found
        """
        try:
            submission = await self._get_project_submission(submission_id)
            if not submission:
                raise AppError(
                    status_code=404,
                    detail="Submission not found",
                    error_code="SUBMISSION_NOT_FOUND",
                )

            submission.is_approved = True
            submission.status = "approved"
            submission.reviewed_at = datetime.now(timezone.utc)
            if feedback:
                submission.reviewer_feedback = feedback

            self.db_session.add(submission)
            await self.db_session.commit()
            await self.db_session.refresh(submission)

            # Update module progress
            await self._update_module_progress(submission.user_id, submission.module_id)

            logger.info(f"Project submission {submission_id} approved")
            return submission

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error approving submission: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error approving submission",
                error_code="APPROVAL_ERROR",
            )

    async def reject_project_submission(
        self,
        submission_id: int,
        feedback: str,
    ) -> ProjectSubmission:
        """
        Reject a project submission with feedback (reviewer/mentor action).

        Args:
            submission_id: Submission ID to reject
            feedback: Reason for rejection

        Returns:
            Updated ProjectSubmission

        Raises:
            AppError: If submission not found
        """
        try:
            submission = await self._get_project_submission(submission_id)
            if not submission:
                raise AppError(
                    status_code=404,
                    detail="Submission not found",
                    error_code="SUBMISSION_NOT_FOUND",
                )

            submission.is_approved = False
            submission.status = "rejected"
            submission.reviewed_at = datetime.now(timezone.utc)
            submission.reviewer_feedback = feedback
            submission.points_earned = 0  # No points for rejected

            self.db_session.add(submission)
            await self.db_session.commit()
            await self.db_session.refresh(submission)

            logger.info(f"Project submission {submission_id} rejected")
            return submission

        except AppError:
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error rejecting submission: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error rejecting submission",
                error_code="REJECTION_ERROR",
            )

    async def get_user_progress(
        self,
        user_id: str,
        module_id: int,
    ) -> Dict:
        """
        Get student's progress in a module.

        Returns:
        - Lessons completed/total
        - Assessments passed/total
        - Projects approved/total
        - Total points earned

        Args:
            user_id: Student user ID
            module_id: Module ID

        Returns:
            Dictionary with progress details
        """
        try:
            # Get module progress
            stmt = select(ModuleProgress).where(
                and_(
                    ModuleProgress.user_id == user_id,
                    ModuleProgress.module_id == module_id,
                )
            )
            result = await self.db_session.execute(stmt)
            progress = result.scalar_one_or_none()

            if not progress:
                progress = await self._initialize_module_progress(user_id, module_id)

            return {
                "module_id": module_id,
                "lessons": {
                    "completed": progress.lessons_completed,
                    "total": progress.total_lessons,
                },
                "assessments": {
                    "passed": progress.assessments_passed,
                    "total": progress.total_assessments,
                },
                "projects": {
                    "approved": progress.projects_approved,
                    "total": progress.total_projects,
                },
                "total_points": progress.total_points_earned,
                "module_completed": progress.module_completed,
            }

        except Exception as e:
            logger.error(f"Error getting user progress: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching progress",
                error_code="PROGRESS_FETCH_ERROR",
            )

    def _calculate_deadline_status_and_points(
        self,
        submission_time: datetime,
        module: Module,
        user_availability: Optional[UserModuleAvailability] = None,
    ) -> tuple:
        """
        Calculate deadline status and points based on submission time and deadlines.
        
        Uses user-specific deadlines from UserModuleAvailability if available,
        otherwise falls back to module defaults.

        Returns:
            Tuple of (deadline_status, points)
        """
        # Prefer user-specific deadlines from availability record
        first_deadline = None
        second_deadline = None
        third_deadline = None
        
        if user_availability:
            first_deadline = user_availability.first_deadline
            second_deadline = user_availability.second_deadline
            third_deadline = user_availability.third_deadline
        else:
            # Fallback to module defaults
            first_deadline = module.first_deadline
            second_deadline = module.second_deadline
        
        # Check deadlines in order
        if first_deadline and submission_time <= first_deadline:
            return DeadlineStatus.FIRST_DEADLINE, self.FIRST_DEADLINE_POINTS
        elif second_deadline and submission_time <= second_deadline:
            return DeadlineStatus.SECOND_DEADLINE, self.SECOND_DEADLINE_POINTS
        elif third_deadline and submission_time <= third_deadline:
            return DeadlineStatus.LATE, self.THIRD_DEADLINE_POINTS  # 25 points for third
        else:
            return DeadlineStatus.LATE, self.LATE_POINTS

    async def _get_user_module_availability(
        self,
        user_id: str,
        module_id: int,
    ) -> Optional[UserModuleAvailability]:
        """Get user's module availability record for deadline info."""
        stmt = select(UserModuleAvailability).where(
            and_(
                UserModuleAvailability.user_id == user_id,
                UserModuleAvailability.module_id == module_id,
            )
        )
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _update_module_progress(
        self,
        user_id: str,
        module_id: int,
    ) -> None:
        """Update module progress stats."""
        try:
            # Get or create progress record
            stmt = select(ModuleProgress).where(
                and_(
                    ModuleProgress.user_id == user_id,
                    ModuleProgress.module_id == module_id,
                )
            )
            result = await self.db_session.execute(stmt)
            progress = result.scalar_one_or_none()

            if not progress:
                progress = await self._initialize_module_progress(user_id, module_id)

            # Recalculate stats
            lessons_stmt = select(LessonProgress).where(
                and_(
                    LessonProgress.user_id == user_id,
                )
            )
            lessons_result = await self.db_session.execute(lessons_stmt)
            all_lessons = lessons_result.scalars().all()
            completed = sum(1 for l in all_lessons if l.completed)

            assessments_stmt = select(AssessmentSubmission).where(
                and_(
                    AssessmentSubmission.user_id == user_id,
                    AssessmentSubmission.module_id == module_id,
                )
            )
            assessments_result = await self.db_session.execute(assessments_stmt)
            assessments = assessments_result.scalars().all()
            passed = sum(1 for a in assessments if a.is_correct)

            projects_stmt = select(ProjectSubmission).where(
                and_(
                    ProjectSubmission.user_id == user_id,
                    ProjectSubmission.module_id == module_id,
                    ProjectSubmission.is_approved == True,
                )
            )
            projects_result = await self.db_session.execute(projects_stmt)
            approved_projects = projects_result.scalars().all()

            total_points = sum(a.points_earned for a in assessments) + sum(
                p.points_earned for p in approved_projects
            )

            progress.lessons_completed = completed
            progress.assessments_passed = passed
            progress.projects_approved = len(approved_projects)
            progress.total_points_earned = total_points
            progress.last_updated = datetime.now(timezone.utc)

            self.db_session.add(progress)
            await self.db_session.commit()

        except Exception as e:
            logger.error(f"Error updating module progress: {str(e)}")
            await self.db_session.rollback()

    async def _initialize_module_progress(
        self,
        user_id: str,
        module_id: int,
    ) -> ModuleProgress:
        """Create initial module progress record."""
        progress = ModuleProgress(
            user_id=user_id,
            module_id=module_id,
        )
        self.db_session.add(progress)
        await self.db_session.commit()
        await self.db_session.refresh(progress)
        return progress

    async def _get_module(self, module_id: int) -> Optional[Module]:
        """Get module by ID."""
        stmt = select(Module).where(Module.module_id == module_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_project(self, project_id: int) -> Optional[Project]:
        """Get project by ID."""
        stmt = select(Project).where(Project.project_id == project_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_project_submission(self, submission_id: int) -> Optional[ProjectSubmission]:
        """Get project submission by ID."""
        stmt = select(ProjectSubmission).where(ProjectSubmission.submission_id == submission_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def _update_gamification(
        self,
        user_id: str,
        question_id: int,
        is_correct: bool,
        points_earned: float,
        submitted_at: datetime,
    ) -> None:
        """
        Update user's gamification data (XP and streak) after quiz submission.
        
        This is called AFTER the assessment submission is committed.
        
        Args:
            user_id: User who submitted the quiz
            question_id: Question that was answered
            is_correct: Whether the answer was correct
            points_earned: Points awarded (0 if incorrect)
            submitted_at: When the submission was made (UTC)
        
        Note: This method handles its own transaction to ensure gamification
        updates don't affect the main submission flow if they fail.
        """
        try:
            from domains.courses.services.gamification_service import GamificationService
            
            gamification_service = GamificationService(self.db_session)
            await gamification_service.record_quiz_activity(
                user_id=user_id,
                question_id=question_id,
                is_correct=is_correct,
                points_earned=int(points_earned),  # Convert to int for XP
                submitted_at=submitted_at,
            )
            
        except Exception as e:
            # Log but don't fail the main submission
            # Gamification can be recalculated later if needed
            logger.error(f"Error updating gamification for user {user_id}: {str(e)}")
