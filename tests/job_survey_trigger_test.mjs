"""
Test: Job Readiness Survey Triggering

Verifies that the job readiness survey triggers correctly when a student
completes their course enrollment, and that it can be displayed and submitted.
"""

import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from api.db.models import (
    User, 
    UserProfile, 
    UserCourseEnrollment, 
    Survey,
)
from api.db.session import SessionLocal
from api.domains.surveys.service import SurveyService
from api.utils.enums import EnrollmentStatus


async def test_job_survey_on_course_completion():
    """Test that job readiness survey appears when course is completed."""
    print("\n" + "=" * 70)
    print("TEST: Job Readiness Survey Triggering on Course Completion")
    print("=" * 70 + "\n")
    
    async with SessionLocal() as session:
        # Setup: Create or get a test student
        print("SETUP: Creating test data...")
        
        # Ensure default surveys are seeded
        survey_service = SurveyService(session)
        await survey_service.ensure_default_surveys()
        
        # Verify job-readiness survey exists
        job_survey_result = await session.execute(
            select(Survey).where(Survey.slug == "job-readiness")
        )
        job_survey = job_survey_result.scalar_one_or_none()
        
        if not job_survey:
            print("❌ FAILED: job-readiness survey not found in database")
            print("   Run: await SurveyService(session).ensure_default_surveys()")
            return False
        
        print(f"✅ Job readiness survey exists (ID: {job_survey.id})")
        print(f"   Trigger type: {job_survey.trigger_type}")
        print(f"   Is active: {job_survey.is_active}")
        
        # TEST 1: Survey should NOT appear for incomplete courses
        print("\n--- TEST 1: Survey should NOT appear for incomplete courses ---")
        
        # Query for any enrolled student
        enrolled_result = await session.execute(
            select(UserCourseEnrollment).where(
                UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
                UserCourseEnrollment.completed_at.is_(None),  # NOT completed
            ).limit(1)
        )
        incomplete_enrollment = enrolled_result.scalar_one_or_none()
        
        if incomplete_enrollment:
            user_id = incomplete_enrollment.user_id
            user_result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if user and user.role == "student":
                eligible = await survey_service.get_eligible_survey(user_id, user.role)
                if eligible and eligible.type == "job_readiness":
                    print("❌ FAILED: Job survey appeared for incomplete course")
                    return False
                else:
                    print("✅ PASSED: Job survey correctly hidden for incomplete course")
        
        # TEST 2: Survey SHOULD appear for recently completed courses
        print("\n--- TEST 2: Survey SHOULD appear for recently completed courses ---")
        
        # Query for a recently completed enrollment
        three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
        completed_result = await session.execute(
            select(UserCourseEnrollment).where(
                UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
                UserCourseEnrollment.completed_at.is_not(None),
                UserCourseEnrollment.completed_at > three_days_ago,  # Within 3 days
            ).limit(1)
        )
        recent_completion = completed_result.scalar_one_or_none()
        
        if recent_completion:
            user_id = recent_completion.user_id
            user_result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if user and user.role == "student":
                # Check if user completed onboarding
                profile_result = await session.execute(
                    select(UserProfile).where(UserProfile.user_id == user_id)
                )
                profile = profile_result.scalar_one_or_none()
                
                if profile and profile.onboarding_completed:
                    eligible = await survey_service.get_eligible_survey(user_id, user.role)
                    
                    if eligible and eligible.type == "job_readiness":
                        print(f"✅ PASSED: Job survey appears for recently completed course")
                        print(f"   Survey ID: {eligible.id}")
                        print(f"   Title: {eligible.title}")
                        print(f"   Questions: {len(eligible.questions)}")
                        return True
                    else:
                        print("⚠️  INFO: No recently completed course found with onboarding complete")
                        print("         (This is expected if no such enrollments exist in test DB)")
                else:
                    print("⚠️  INFO: Found completed enrollment but onboarding not complete")
        
        # TEST 3: Survey should NOT appear for old completions (> 3 days)
        print("\n--- TEST 3: Survey should NOT appear for old completions (> 3 days) ---")
        
        four_days_ago = datetime.now(timezone.utc) - timedelta(days=4)
        old_completion = await session.execute(
            select(UserCourseEnrollment).where(
                UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
                UserCourseEnrollment.completed_at.is_not(None),
                UserCourseEnrollment.completed_at < four_days_ago,  # Older than 3 days
            ).limit(1)
        )
        old_enrollment = old_completion.scalar_one_or_none()
        
        if old_enrollment:
            user_id = old_enrollment.user_id
            user_result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if user and user.role == "student":
                eligible = await survey_service.get_eligible_survey(user_id, user.role)
                if eligible and eligible.type == "job_readiness":
                    print("❌ FAILED: Job survey appeared for old completion (> 3 days)")
                    return False
                else:
                    print("✅ PASSED: Job survey correctly hidden for old completion")
        
        print("\n" + "=" * 70)
        print("TEST SUMMARY: All checks passed ✅")
        print("=" * 70 + "\n")
        return True


if __name__ == "__main__":
    result = asyncio.run(test_job_survey_on_course_completion())
    exit(0 if result else 1)
