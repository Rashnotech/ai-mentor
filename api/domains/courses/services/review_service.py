#!/usr/bin/python3
"""
Course review service.
Handles course ratings and reviews from students.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from domains.courses.models.course import Course, CourseReview
from core.errors import AppError
import logging

logger = logging.getLogger(__name__)


class ReviewService:
    """Service for managing course reviews and ratings."""

    def __init__(self, db_session: AsyncSession):
        """Initialize ReviewService."""
        self.db_session = db_session

    async def create_review(
        self,
        user_id: str,
        user_name: str,
        course_id: int,
        rating: int,
        review_text: Optional[str] = None,
        is_anonymous: bool = False,
    ) -> dict:
        """
        Create a course review.

        Args:
            user_id: Reviewer's user ID
            user_name: Reviewer's display name
            course_id: Course ID to review
            rating: 1-5 stars
            review_text: Optional review text
            is_anonymous: Hide reviewer name

        Returns:
            Created review data

        Raises:
            AppError: If course not found or already reviewed
        """
        try:
            # Verify course exists
            course_stmt = select(Course).where(Course.course_id == course_id)
            course_result = await self.db_session.execute(course_stmt)
            course = course_result.scalar_one_or_none()

            if not course:
                raise AppError(
                    status_code=404,
                    detail="Course not found",
                    error_code="COURSE_NOT_FOUND",
                )

            # Check if user already reviewed this course
            existing_stmt = select(CourseReview).where(
                and_(
                    CourseReview.course_id == course_id,
                    CourseReview.user_id == user_id,
                )
            )
            existing_result = await self.db_session.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()

            if existing:
                raise AppError(
                    status_code=400,
                    detail="You have already reviewed this course",
                    error_code="ALREADY_REVIEWED",
                )

            # Create review
            review = CourseReview(
                course_id=course_id,
                user_id=user_id,
                rating=rating,
                review_text=review_text,
                is_anonymous=is_anonymous,
            )
            self.db_session.add(review)

            # Update course rating aggregate
            await self._update_course_rating(course_id)

            await self.db_session.commit()
            await self.db_session.refresh(review)

            logger.info(f"User {user_id} reviewed course {course_id} with {rating} stars")

            return {
                "review_id": review.review_id,
                "course_id": review.course_id,
                "user_id": None if is_anonymous else user_id,
                "reviewer_name": None if is_anonymous else user_name,
                "rating": review.rating,
                "review_text": review.review_text,
                "is_anonymous": review.is_anonymous,
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
            }

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error creating review: {str(e)}")
            await self.db_session.rollback()
            raise AppError(
                status_code=500,
                detail="Error creating review",
                error_code="REVIEW_CREATE_ERROR",
            )

    async def get_course_reviews(self, course_id: int) -> dict:
        """
        Get all reviews for a course.

        Args:
            course_id: Course ID

        Returns:
            Dictionary with reviews list and statistics
        """
        try:
            # Get all approved reviews
            stmt = select(CourseReview).where(
                and_(
                    CourseReview.course_id == course_id,
                    CourseReview.is_approved == True,
                )
            ).order_by(CourseReview.created_at.desc())
            result = await self.db_session.execute(stmt)
            reviews = result.scalars().all()

            # Get user names for non-anonymous reviews
            from domains.users.models.user import User
            user_ids = [r.user_id for r in reviews if not r.is_anonymous]
            user_names = {}
            
            if user_ids:
                users_stmt = select(User).where(User.id.in_(user_ids))
                users_result = await self.db_session.execute(users_stmt)
                users = users_result.scalars().all()
                user_names = {u.id: u.full_name for u in users}

            # Build reviews list
            reviews_data = []
            for review in reviews:
                reviews_data.append({
                    "review_id": review.review_id,
                    "course_id": review.course_id,
                    "user_id": None if review.is_anonymous else review.user_id,
                    "reviewer_name": None if review.is_anonymous else user_names.get(review.user_id, "Unknown"),
                    "rating": review.rating,
                    "review_text": review.review_text,
                    "is_anonymous": review.is_anonymous,
                    "created_at": review.created_at.isoformat(),
                    "updated_at": review.updated_at.isoformat(),
                })

            # Calculate statistics
            total_count = len(reviews)
            if total_count > 0:
                average_rating = sum(r.rating for r in reviews) / total_count
            else:
                average_rating = 0.0

            # Rating breakdown
            rating_breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for review in reviews:
                rating_breakdown[review.rating] += 1

            return {
                "reviews": reviews_data,
                "total_count": total_count,
                "average_rating": round(average_rating, 1),
                "rating_breakdown": rating_breakdown,
            }

        except Exception as e:
            logger.error(f"Error getting reviews: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching reviews",
                error_code="REVIEWS_FETCH_ERROR",
            )

    async def get_user_review(self, user_id: str, course_id: int) -> dict:
        """
        Get a user's review for a specific course.

        Args:
            user_id: User ID
            course_id: Course ID

        Returns:
            Review data or raises 404
        """
        try:
            stmt = select(CourseReview).where(
                and_(
                    CourseReview.course_id == course_id,
                    CourseReview.user_id == user_id,
                )
            )
            result = await self.db_session.execute(stmt)
            review = result.scalar_one_or_none()

            if not review:
                raise AppError(
                    status_code=404,
                    detail="Review not found",
                    error_code="REVIEW_NOT_FOUND",
                )

            # Get user name
            from domains.users.models.user import User
            user_stmt = select(User).where(User.id == user_id)
            user_result = await self.db_session.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            user_name = user.full_name if user else "Unknown"

            return {
                "review_id": review.review_id,
                "course_id": review.course_id,
                "user_id": None if review.is_anonymous else review.user_id,
                "reviewer_name": None if review.is_anonymous else user_name,
                "rating": review.rating,
                "review_text": review.review_text,
                "is_anonymous": review.is_anonymous,
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
            }

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error getting user review: {str(e)}")
            raise AppError(
                status_code=500,
                detail="Error fetching review",
                error_code="REVIEW_FETCH_ERROR",
            )

    async def update_review(
        self,
        review_id: int,
        user_id: str,
        rating: Optional[int] = None,
        review_text: Optional[str] = None,
        is_anonymous: Optional[bool] = None,
    ) -> dict:
        """
        Update a user's review.

        Args:
            review_id: Review ID
            user_id: User ID (for authorization)
            rating: Optional new rating
            review_text: Optional new text
            is_anonymous: Optional anonymity change

        Returns:
            Updated review data
        """
        try:
            # Get review and verify ownership
            stmt = select(CourseReview).where(CourseReview.review_id == review_id)
            result = await self.db_session.execute(stmt)
            review = result.scalar_one_or_none()

            if not review:
                raise AppError(
                    status_code=404,
                    detail="Review not found",
                    error_code="REVIEW_NOT_FOUND",
                )

            if review.user_id != user_id:
                raise AppError(
                    status_code=403,
                    detail="You can only update your own reviews",
                    error_code="UNAUTHORIZED",
                )

            # Update fields
            if rating is not None:
                review.rating = rating
            if review_text is not None:
                review.review_text = review_text
            if is_anonymous is not None:
                review.is_anonymous = is_anonymous

            review.updated_at = datetime.now(timezone.utc)

            # Update course rating aggregate
            await self._update_course_rating(review.course_id)

            await self.db_session.commit()
            await self.db_session.refresh(review)

            # Get user name
            from domains.users.models.user import User
            user_stmt = select(User).where(User.id == user_id)
            user_result = await self.db_session.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            user_name = user.full_name if user else "Unknown"

            return {
                "review_id": review.review_id,
                "course_id": review.course_id,
                "user_id": None if review.is_anonymous else review.user_id,
                "reviewer_name": None if review.is_anonymous else user_name,
                "rating": review.rating,
                "review_text": review.review_text,
                "is_anonymous": review.is_anonymous,
                "created_at": review.created_at.isoformat(),
                "updated_at": review.updated_at.isoformat(),
            }

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error updating review: {str(e)}")
            await self.db_session.rollback()
            raise AppError(
                status_code=500,
                detail="Error updating review",
                error_code="REVIEW_UPDATE_ERROR",
            )

    async def delete_review(self, review_id: int, user_id: str) -> None:
        """
        Delete a user's review.

        Args:
            review_id: Review ID
            user_id: User ID (for authorization)
        """
        try:
            # Get review and verify ownership
            stmt = select(CourseReview).where(CourseReview.review_id == review_id)
            result = await self.db_session.execute(stmt)
            review = result.scalar_one_or_none()

            if not review:
                raise AppError(
                    status_code=404,
                    detail="Review not found",
                    error_code="REVIEW_NOT_FOUND",
                )

            if review.user_id != user_id:
                raise AppError(
                    status_code=403,
                    detail="You can only delete your own reviews",
                    error_code="UNAUTHORIZED",
                )

            course_id = review.course_id
            await self.db_session.delete(review)

            # Update course rating aggregate
            await self._update_course_rating(course_id)

            await self.db_session.commit()

            logger.info(f"User {user_id} deleted review {review_id}")

        except AppError:
            raise
        except Exception as e:
            logger.error(f"Error deleting review: {str(e)}")
            await self.db_session.rollback()
            raise AppError(
                status_code=500,
                detail="Error deleting review",
                error_code="REVIEW_DELETE_ERROR",
            )

    async def _update_course_rating(self, course_id: int) -> None:
        """Update course's cached rating aggregate."""
        try:
            # Calculate average rating
            stmt = select(
                func.avg(CourseReview.rating),
                func.count(CourseReview.review_id),
            ).where(
                and_(
                    CourseReview.course_id == course_id,
                    CourseReview.is_approved == True,
                )
            )
            result = await self.db_session.execute(stmt)
            avg_rating, total_reviews = result.one()

            # Update course
            course_stmt = select(Course).where(Course.course_id == course_id)
            course_result = await self.db_session.execute(course_stmt)
            course = course_result.scalar_one_or_none()

            if course:
                # Store as integer * 10 for precision (e.g., 4.5 = 45)
                course.average_rating = int((avg_rating or 0) * 10)
                course.total_reviews = total_reviews or 0

        except Exception as e:
            logger.error(f"Error updating course rating: {str(e)}")
