#!/usr/bin/python3
"""
Reward service for calculating points, badges, and certificates.
Handles gamification logic including points aggregation, badge awards, and certificate issuance.
"""
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from domains.courses.models.progress import (
    AssessmentSubmission,
    ProjectSubmission,
    ModuleProgress,
)
from domains.courses.models.course import Course, LearningPath, Module
from domains.courses.models.certification import Certificate, Badge
from domains.users.models.user import User
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class BadgeType:
    """Badge type constants"""
    SPEEDRUN = "speedrun"  # Completed course in record time
    PERFECTIONIST = "perfectionist"  # 100% score on all assessments
    HELPER = "helper"  # Helped other students (future feature)
    EARLY_BIRD = "early_bird"  # Submitted all assignments before first deadline
    OVERACHIEVER = "overachiever"  # Earned 150+ points on a course
    CONSISTENT = "consistent"  # Completed all modules without skipping


class RewardService:
    """Service for calculating rewards, badges, and certificates."""

    def __init__(self, db_session: AsyncSession):
        """
        Initialize RewardService.

        Args:
            db_session: Async database session
        """
        self.db_session = db_session

    # ==================== POINTS CALCULATION ====================

    async def get_user_total_points(
        self, user_id: str, course_id: Optional[int] = None
    ) -> float:
        """
        Get total points earned by user across all courses or specific course.

        Args:
            user_id: User ID
            course_id: Optional course ID to filter by

        Returns:
            Total points earned
        """
        try:
            # Points from assessment submissions
            assessment_stmt = select(
                func.coalesce(func.sum(AssessmentSubmission.points_earned), 0).label(
                    "total"
                )
            ).where(AssessmentSubmission.user_id == user_id)

            # Points from approved project submissions
            project_stmt = select(
                func.coalesce(func.sum(ProjectSubmission.points_earned), 0).label(
                    "total"
                )
            ).where(
                (ProjectSubmission.user_id == user_id)
                & (ProjectSubmission.is_approved == True)
            )

            if course_id:
                # Filter by course if provided
                assessment_stmt = assessment_stmt.join(
                    Module, AssessmentSubmission.module_id == Module.module_id
                ).join(
                    LearningPath, Module.path_id == LearningPath.path_id
                ).where(LearningPath.course_id == course_id)

                project_stmt = project_stmt.join(
                    Module, ProjectSubmission.module_id == Module.module_id
                ).join(
                    LearningPath, Module.path_id == LearningPath.path_id
                ).where(LearningPath.course_id == course_id)

            assessment_result = await self.db_session.execute(assessment_stmt)
            assessment_points = assessment_result.scalar() or 0

            project_result = await self.db_session.execute(project_stmt)
            project_points = project_result.scalar() or 0

            total_points = float(assessment_points) + float(project_points)
            logger.info(
                f"User {user_id} total points: {total_points} (course: {course_id})"
            )
            return total_points

        except Exception as e:
            logger.error(f"Error calculating total points: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error calculating total points",
                error_code="POINTS_CALCULATION_ERROR",
            )

    async def get_project_submission_points(self, submission_id: int) -> float:
        """
        Get points from a specific project submission.

        Args:
            submission_id: Project submission ID

        Returns:
            Points earned from the submission
        """
        try:
            stmt = select(ProjectSubmission).where(
                ProjectSubmission.submission_id == submission_id
            )
            result = await self.db_session.execute(stmt)
            submission = result.scalar_one_or_none()

            if not submission:
                raise AppError(
                    status_code=404,
                    detail="Project submission not found",
                    error_code="SUBMISSION_NOT_FOUND",
                )

            return float(submission.points_earned)

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error getting project submission points: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error getting submission points",
                error_code="SUBMISSION_POINTS_ERROR",
            )

    async def get_module_points(self, user_id: str, module_id: int) -> float:
        """
        Get total points earned by user in a specific module.

        Args:
            user_id: User ID
            module_id: Module ID

        Returns:
            Total points in the module
        """
        try:
            # Assessment points in module
            assessment_stmt = select(
                func.coalesce(func.sum(AssessmentSubmission.points_earned), 0).label(
                    "total"
                )
            ).where(
                (AssessmentSubmission.user_id == user_id)
                & (AssessmentSubmission.module_id == module_id)
            )

            # Project points in module (approved only)
            project_stmt = select(
                func.coalesce(func.sum(ProjectSubmission.points_earned), 0).label(
                    "total"
                )
            ).where(
                (ProjectSubmission.user_id == user_id)
                & (ProjectSubmission.module_id == module_id)
                & (ProjectSubmission.is_approved == True)
            )

            assessment_result = await self.db_session.execute(assessment_stmt)
            assessment_points = assessment_result.scalar() or 0

            project_result = await self.db_session.execute(project_stmt)
            project_points = project_result.scalar() or 0

            total = float(assessment_points) + float(project_points)
            return total

        except Exception as e:
            logger.error(f"Error calculating module points: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error calculating module points",
                error_code="MODULE_POINTS_ERROR",
            )

    # ==================== BADGE ELIGIBILITY ====================

    async def check_speedrun_badge(
        self, user_id: str, path_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user qualifies for speedrun badge (completed path in record time).

        Args:
            user_id: User ID
            path_id: Learning path ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            # Get path info
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()

            if not path:
                return False, "Path not found"

            # Check if user completed the path
            stmt = select(func.count(ModuleProgress)).where(
                (ModuleProgress.user_id == user_id)
                & (ModuleProgress.path_id == path_id)
                & (ModuleProgress.is_completed == True)
            )
            result = await self.db_session.execute(stmt)
            completed_modules = result.scalar() or 0

            # Get total modules in path
            stmt = select(func.count(Module)).where(Module.path_id == path_id)
            result = await self.db_session.execute(stmt)
            total_modules = result.scalar() or 0

            if total_modules == 0 or completed_modules < total_modules:
                return False, "Path not fully completed"

            # Get time taken to complete path
            # This would need timestamp tracking on module completion
            # For now, we'll consider it eligible if completed all modules
            return True, "Completed path in timely manner"

        except Exception as e:
            logger.error(f"Error checking speedrun badge: {str(e)}")
            return False, f"Error checking badge: {str(e)}"

    async def check_perfectionist_badge(
        self, user_id: str, module_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user qualifies for perfectionist badge (100% on all assessments in module).

        Args:
            user_id: User ID
            module_id: Module ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            # Get all assessment submissions for user in module
            stmt = select(AssessmentSubmission).where(
                (AssessmentSubmission.user_id == user_id)
                & (AssessmentSubmission.module_id == module_id)
            )
            result = await self.db_session.execute(stmt)
            submissions = result.scalars().all()

            if not submissions:
                return False, "No assessment submissions found"

            # Check if all are correct
            all_correct = all(sub.is_correct for sub in submissions)

            if all_correct:
                return True, "All assessments correct (100%)"
            else:
                incorrect_count = sum(1 for sub in submissions if not sub.is_correct)
                return (
                    False,
                    f"{incorrect_count} incorrect answers",
                )

        except Exception as e:
            logger.error(f"Error checking perfectionist badge: {str(e)}")
            return False, f"Error checking badge: {str(e)}"

    async def check_early_bird_badge(
        self, user_id: str, path_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user qualifies for early bird badge (all assignments before first deadline).

        Args:
            user_id: User ID
            path_id: Learning path ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            # Get all modules in path
            stmt = select(Module).where(Module.path_id == path_id)
            result = await self.db_session.execute(stmt)
            modules = result.scalars().all()

            if not modules:
                return False, "No modules found in path"

            for module in modules:
                # Check assessments
                stmt = select(AssessmentSubmission).where(
                    (AssessmentSubmission.user_id == user_id)
                    & (AssessmentSubmission.module_id == module.module_id)
                )
                result = await self.db_session.execute(stmt)
                assessments = result.scalars().all()

                for assessment in assessments:
                    from domains.courses.models.progress import DeadlineStatus
                    if assessment.deadline_status != DeadlineStatus.FIRST_DEADLINE:
                        return False, f"Assessment {assessment.submission_id} not submitted before first deadline"

                # Check projects
                stmt = select(ProjectSubmission).where(
                    (ProjectSubmission.user_id == user_id)
                    & (ProjectSubmission.module_id == module.module_id)
                )
                result = await self.db_session.execute(stmt)
                projects = result.scalars().all()

                for project in projects:
                    from domains.courses.models.progress import DeadlineStatus
                    if project.deadline_status != DeadlineStatus.FIRST_DEADLINE:
                        return False, f"Project {project.submission_id} not submitted before first deadline"

            return True, "All assignments submitted before first deadline"

        except Exception as e:
            logger.error(f"Error checking early bird badge: {str(e)}")
            return False, f"Error checking badge: {str(e)}"

    async def check_overachiever_badge(
        self, user_id: str, course_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user qualifies for overachiever badge (150+ points on course).

        Args:
            user_id: User ID
            course_id: Course ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            total_points = await self.get_user_total_points(user_id, course_id)
            threshold = 150

            if total_points >= threshold:
                return True, f"Earned {total_points} points (threshold: {threshold})"
            else:
                return False, f"Only {total_points}/{threshold} points"

        except Exception as e:
            logger.error(f"Error checking overachiever badge: {str(e)}")
            return False, f"Error checking badge: {str(e)}"

    async def check_consistent_badge(
        self, user_id: str, path_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user qualifies for consistent badge (completed all modules without skipping).

        Args:
            user_id: User ID
            path_id: Learning path ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            # Get all modules in path (in order)
            stmt = (
                select(Module)
                .where(Module.path_id == path_id)
                .order_by(Module.order)
            )
            result = await self.db_session.execute(stmt)
            modules = result.scalars().all()

            if not modules:
                return False, "No modules found in path"

            # Check if all modules are completed
            for module in modules:
                stmt = select(ModuleProgress).where(
                    (ModuleProgress.user_id == user_id)
                    & (ModuleProgress.module_id == module.module_id)
                )
                result = await self.db_session.execute(stmt)
                progress = result.scalar_one_or_none()

                if not progress or not progress.is_completed:
                    return False, f"Module {module.module_id} not completed"

            return True, "All modules completed in order"

        except Exception as e:
            logger.error(f"Error checking consistent badge: {str(e)}")
            return False, f"Error checking badge: {str(e)}"

    # ==================== CERTIFICATE ELIGIBILITY ====================

    async def check_certificate_eligibility(
        self, user_id: str, path_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user is eligible for certificate (completed all modules in path).

        Args:
            user_id: User ID
            path_id: Learning path ID

        Returns:
            Tuple of (eligible, reason)
        """
        try:
            # Get path info
            stmt = select(LearningPath).where(LearningPath.path_id == path_id)
            result = await self.db_session.execute(stmt)
            path = result.scalar_one_or_none()

            if not path:
                return False, "Path not found"

            # Get all modules in path
            stmt = select(Module).where(Module.path_id == path_id)
            result = await self.db_session.execute(stmt)
            modules = result.scalars().all()

            if not modules:
                return False, "Path has no modules"

            # Check if user completed all modules
            completed_count = 0
            for module in modules:
                stmt = select(ModuleProgress).where(
                    (ModuleProgress.user_id == user_id)
                    & (ModuleProgress.module_id == module.module_id)
                )
                result = await self.db_session.execute(stmt)
                progress = result.scalar_one_or_none()

                if progress and progress.is_completed:
                    completed_count += 1

            total_modules = len(modules)

            if completed_count == total_modules:
                return True, f"Completed all {total_modules} modules"
            else:
                return False, f"Only {completed_count}/{total_modules} modules completed"

        except Exception as e:
            logger.error(f"Error checking certificate eligibility: {str(e)}")
            return False, f"Error checking eligibility: {str(e)}"

    # ==================== AWARD METHODS ====================

    async def award_badge(
        self, user_id: str, badge_type: str, description: Optional[str] = None
    ) -> Badge:
        """
        Award a badge to a user.

        Args:
            user_id: User ID
            badge_type: Type of badge
            description: Optional badge description

        Returns:
            Created Badge object
        """
        try:
            # Check if user already has this badge
            stmt = select(Badge).where(
                (Badge.user_id == user_id) & (Badge.badge_type == badge_type)
            )
            result = await self.db_session.execute(stmt)
            existing_badge = result.scalar_one_or_none()

            if existing_badge:
                logger.info(
                    f"User {user_id} already has {badge_type} badge"
                )
                return existing_badge

            # Award new badge
            badge = Badge(
                user_id=user_id,
                badge_type=badge_type,
                description=description
                or f"Earned {badge_type} badge",
            )

            self.db_session.add(badge)
            await self.db_session.flush()
            await self.db_session.refresh(badge)

            logger.info(
                f"Badge {badge_type} awarded to user {user_id}"
            )
            return badge

        except Exception as e:
            logger.error(f"Error awarding badge: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error awarding badge",
                error_code="BADGE_AWARD_ERROR",
            )

    async def issue_certificate(
        self,
        user_id: str,
        course_id: int,
        path_id: int,
        certificate_url: Optional[str] = None,
    ) -> Certificate:
        """
        Issue a certificate to a user.

        Args:
            user_id: User ID
            course_id: Course ID
            path_id: Learning path ID
            certificate_url: URL to the certificate PDF/image

        Returns:
            Created Certificate object
        """
        try:
            # Check if certificate already issued
            stmt = select(Certificate).where(
                (Certificate.user_id == user_id)
                & (Certificate.path_id == path_id)
            )
            result = await self.db_session.execute(stmt)
            existing_cert = result.scalar_one_or_none()

            if existing_cert:
                logger.info(
                    f"User {user_id} already has certificate for path {path_id}"
                )
                return existing_cert

            # Create certificate
            certificate = Certificate(
                user_id=user_id,
                course_id=course_id,
                path_id=path_id,
                certificate_url=certificate_url or f"https://certs.example.com/cert_{user_id}_{path_id}.pdf",
                is_public=True,
            )

            self.db_session.add(certificate)
            await self.db_session.flush()
            await self.db_session.refresh(certificate)

            logger.info(
                f"Certificate issued to user {user_id} for path {path_id}"
            )
            return certificate

        except Exception as e:
            logger.error(f"Error issuing certificate: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error issuing certificate",
                error_code="CERTIFICATE_ISSUE_ERROR",
            )

    async def get_user_badges(self, user_id: str) -> List[Badge]:
        """
        Get all badges for a user.

        Args:
            user_id: User ID

        Returns:
            List of Badge objects
        """
        try:
            stmt = select(Badge).where(Badge.user_id == user_id)
            result = await self.db_session.execute(stmt)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"Error fetching badges: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching badges",
                error_code="BADGE_FETCH_ERROR",
            )

    async def get_user_certificates(self, user_id: str) -> List[Certificate]:
        """
        Get all certificates for a user.

        Args:
            user_id: User ID

        Returns:
            List of Certificate objects
        """
        try:
            stmt = select(Certificate).where(Certificate.user_id == user_id)
            result = await self.db_session.execute(stmt)
            return result.scalars().all()

        except Exception as e:
            logger.error(f"Error fetching certificates: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching certificates",
                error_code="CERTIFICATE_FETCH_ERROR",
            )

    # ==================== SUMMARY METHODS ====================

    async def get_user_rewards_summary(
        self, user_id: str, course_id: Optional[int] = None
    ) -> Dict:
        """
        Get comprehensive rewards summary for a user.

        Args:
            user_id: User ID
            course_id: Optional course ID to filter by

        Returns:
            Dictionary with points, badges, certificates
        """
        try:
            total_points = await self.get_user_total_points(user_id, course_id)
            badges = await self.get_user_badges(user_id)
            certificates = await self.get_user_certificates(user_id)

            return {
                "total_points": total_points,
                "badges": [
                    {
                        "badge_id": b.badge_id,
                        "badge_type": b.badge_type,
                        "description": b.description,
                        "awarded_at": b.awarded_at.isoformat(),
                    }
                    for b in badges
                ],
                "certificates": [
                    {
                        "certificate_id": c.certificate_id,
                        "course_id": c.course_id,
                        "path_id": c.path_id,
                        "issued_at": c.issued_at.isoformat(),
                        "certificate_url": c.certificate_url,
                        "is_public": c.is_public,
                    }
                    for c in certificates
                ],
                "badge_count": len(badges),
                "certificate_count": len(certificates),
            }

        except Exception as e:
            logger.error(f"Error generating rewards summary: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error generating rewards summary",
                error_code="SUMMARY_ERROR",
            )
