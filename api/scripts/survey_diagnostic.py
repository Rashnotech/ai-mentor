"""
Survey Triggering Diagnostic Script

Usage:
  python api/scripts/survey_diagnostic.py <student_user_id>

This script checks all prerequisites for survey display and provides
detailed diagnostic information to help troubleshoot why surveys aren't appearing.
"""

import asyncio
import sys
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from api.db.models import (
    User,
    UserProfile,
    UserCourseEnrollment,
    Survey,
    UserSurveyEvent,
    ModuleProgress,
    ProjectSubmission,
    LessonProgress,
)
from api.db.session import SessionLocal
from api.domains.surveys.service import SurveyService
from api.utils.enums import EnrollmentStatus


async def diagnose_student_survey_eligibility(user_id: str):
    """
    Comprehensive diagnostic check for survey eligibility.
    Prints detailed status and identifies blocking issues.
    """
    async with SessionLocal() as session:
        print("\n" + "=" * 70)
        print(f"SURVEY ELIGIBILITY DIAGNOSTIC FOR USER: {user_id}")
        print("=" * 70 + "\n")

        # ======== STEP 1: USER & ROLE CHECK ========
        print("STEP 1: USER & ROLE CHECK")
        print("-" * 70)
        user_result = await session.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if not user:
            print("❌ BLOCKING: User not found in database")
            return

        print(f"✅ User found: {user.email}")
        print(f"   Role: {user.role}")

        if user.role != "student":
            print(f"❌ BLOCKING: User is not a student (role={user.role})")
            return

        print("✅ User has student role")

        # ======== STEP 2: ONBOARDING CHECK ========
        print("\nSTEP 2: ONBOARDING COMPLETION CHECK")
        print("-" * 70)
        profile_result = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        if not profile:
            print("❌ BLOCKING: User profile not found")
            return

        print(f"✅ User profile exists")
        print(f"   Onboarding completed: {profile.onboarding_completed}")

        if not profile.onboarding_completed:
            print("❌ BLOCKING: Onboarding not completed (required to see surveys)")
            print("   → Student must complete the onboarding flow first")
            return

        print("✅ Onboarding completed")

        # ======== STEP 3: ACTIVE ENROLLMENT CHECK ========
        print("\nSTEP 3: ACTIVE ENROLLMENT CHECK")
        print("-" * 70)
        enrollment_result = await session.execute(
            select(UserCourseEnrollment).where(UserCourseEnrollment.user_id == user_id)
        )
        all_enrollments = list(enrollment_result.scalars().all())

        print(f"Total enrollments: {len(all_enrollments)}")
        active_enrollments = [
            e
            for e in all_enrollments
            if e.is_active and e.enrollment_status == EnrollmentStatus.ACTIVE
        ]

        if not active_enrollments:
            print("❌ BLOCKING: No active enrollments found")
            print(f"   Student has {len(all_enrollments)} total enrollments:")
            for e in all_enrollments:
                print(
                    f"   - Enrollment {e.enrollment_id}: status={e.enrollment_status}, is_active={e.is_active}"
                )
            print("   → Student must enroll in an active course first")
            return

        print(f"✅ Found {len(active_enrollments)} active enrollment(s)")
        for e in active_enrollments:
            days_enrolled = (datetime.now(timezone.utc) - e.enrolled_at).days
            print(
                f"   - Course {e.course_id} (enrolled {days_enrolled} days ago): "
                f"status={e.enrollment_status}"
            )

        # ======== STEP 4: ACTIVE SURVEYS CHECK ========
        print("\nSTEP 4: ACTIVE SURVEYS CHECK")
        print("-" * 70)
        survey_result = await session.execute(
            select(Survey).order_by(Survey.priority.desc(), Survey.id)
        )
        all_surveys = list(survey_result.scalars().all())

        print(f"Total surveys in database: {len(all_surveys)}")
        active_surveys = [s for s in all_surveys if s.is_active]

        if not active_surveys:
            print("❌ BLOCKING: No active surveys found in database")
            print("   → Admin must create and activate surveys first")
            print("   → Or run: SurveyService(session).ensure_default_surveys()")
            return

        print(f"✅ Found {len(active_surveys)} active survey(ies)")
        for s in active_surveys:
            print(
                f"   - {s.title} (trigger: {s.trigger_type}, priority: {s.priority})"
            )

        # ======== STEP 5: COOLDOWN CHECK ========
        print("\nSTEP 5: RECENT SURVEY EVENTS & COOLDOWN CHECK")
        print("-" * 70)
        event_result = await session.execute(
            select(UserSurveyEvent)
            .where(UserSurveyEvent.user_id == user_id, UserSurveyEvent.shown_at.is_not(None))
            .order_by(UserSurveyEvent.shown_at.desc())
            .limit(3)
        )
        recent_events = list(event_result.scalars().all())

        if not recent_events:
            print("✅ No recent survey events (no cooldown active)")
        else:
            print(f"Recent survey events: {len(recent_events)}")
            now = datetime.now(timezone.utc)
            for event in recent_events:
                days_ago = (now - event.shown_at).days
                print(
                    f"   - Survey {event.survey_id}: status={event.status}, "
                    f"shown {days_ago} days ago"
                )
                if days_ago <= 7:
                    print(
                        f"      ⚠️  COOLDOWN ACTIVE: Global 7-day cooldown (expires in {7 - days_ago} days)"
                    )

        # ======== STEP 6: TRIGGER CONDITIONS CHECK ========
        print("\nSTEP 6: SURVEY TRIGGER CONDITIONS CHECK")
        print("-" * 70)

        for enrollment in active_enrollments[:1]:  # Check first active enrollment
            print(f"\nEnrollment {enrollment.enrollment_id}:")

            # Course Completion Trigger
            print(f"  0. Course Completion Trigger (completed in last 3 days):")
            print(f"     - Completion status: {enrollment.completed_at}")
            if enrollment.completed_at:
                days_since_completion = (datetime.now(timezone.utc) - enrollment.completed_at).days
                print(f"     - Days since completion: {days_since_completion}")
                completion_eligible = days_since_completion <= 3
                print(f"     → {'✅ ELIGIBLE' if completion_eligible else '❌ NOT ELIGIBLE (completed > 3 days ago)'}")
            else:
                print(f"     → ❌ NOT ELIGIBLE (course not completed)")

            # Learning Timeline Trigger
            print(f"  1. Learning Timeline Trigger (7+ days OR 3+ lessons):")
            days_enrolled = (datetime.now(timezone.utc) - enrollment.enrolled_at).days
            print(f"     - Days enrolled: {days_enrolled}")

            lesson_result = await session.execute(
                select(LessonProgress).where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.enrollment_id == enrollment.enrollment_id,
                )
            )
            lessons = list(lesson_result.scalars().all())
            print(f"     - Lessons completed: {len(lessons)}")

            learning_eligible = days_enrolled >= 7 or len(lessons) >= 3
            print(f"     → {'✅ ELIGIBLE' if learning_eligible else '❌ NOT ELIGIBLE'}")

            # Module Completion Trigger
            print(f"  2. Module Completion Trigger (module completed in last 30 days):")
            module_result = await session.execute(
                select(ModuleProgress).where(
                    ModuleProgress.user_id == user_id,
                    ModuleProgress.enrollment_id == enrollment.enrollment_id,
                    ModuleProgress.updated_at > datetime.now(timezone.utc) - timedelta(days=30),
                    ModuleProgress.progress >= 1.0,
                )
            )
            completed_modules = list(module_result.scalars().all())
            print(f"     - Modules completed in last 30 days: {len(completed_modules)}")

            project_result = await session.execute(
                select(ProjectSubmission).where(
                    ProjectSubmission.user_id == user_id,
                    ProjectSubmission.enrollment_id == enrollment.enrollment_id,
                    ProjectSubmission.submitted_at
                    > datetime.now(timezone.utc) - timedelta(days=30),
                )
            )
            projects = list(project_result.scalars().all())
            print(f"     - Projects submitted in last 30 days: {len(projects)}")

            milestone_eligible = len(completed_modules) > 0 or len(projects) > 0
            print(f"     → {'✅ ELIGIBLE' if milestone_eligible else '❌ NOT ELIGIBLE'}")

            # Learning Inactivity Trigger
            print(f"  3. Learning Inactivity Trigger (10+ days inactive OR day 14+ with <50%):")

            activity_result = await session.execute(
                select(LessonProgress)
                .where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.enrollment_id == enrollment.enrollment_id,
                )
                .order_by(LessonProgress.updated_at.desc())
                .limit(1)
            )
            last_lesson = activity_result.scalar_one_or_none()

            module_activity_result = await session.execute(
                select(ModuleProgress)
                .where(
                    ModuleProgress.user_id == user_id,
                    ModuleProgress.enrollment_id == enrollment.enrollment_id,
                )
                .order_by(ModuleProgress.updated_at.desc())
                .limit(1)
            )
            last_module = module_activity_result.scalar_one_or_none()

            last_activity = max(
                filter(
                    None,
                    [last_lesson.updated_at if last_lesson else None,
                     last_module.updated_at if last_module else None],
                ),
                default=enrollment.enrolled_at,
            )
            inactivity_days = (datetime.now(timezone.utc) - last_activity).days
            print(f"     - Days since last activity: {inactivity_days}")
            print(f"     - Enrolled {days_enrolled} days ago")

            inactivity_eligible = inactivity_days >= 10 or (
                days_enrolled >= 14 and len(completed_modules) < (len(lessons) * 0.5)
            )
            print(f"     → {'✅ ELIGIBLE' if inactivity_eligible else '❌ NOT ELIGIBLE'}")

        # ======== STEP 7: TEST ELIGIBILITY SERVICE ========
        print("\nSTEP 7: FULL ELIGIBILITY CHECK (SERVICE)")
        print("-" * 70)
        service = SurveyService(session)
        eligible_survey = await service.get_eligible_survey(user_id, user.role)

        if eligible_survey:
            print(f"✅ SURVEY ELIGIBLE!")
            print(f"   Survey ID: {eligible_survey.id}")
            print(f"   Title: {eligible_survey.title}")
            print(f"   Type: {eligible_survey.type}")
            print(f"   Questions: {len(eligible_survey.questions)}")
            print(f"   Cycle Key: {eligible_survey.cycle_key}")
        else:
            print("❌ NO ELIGIBLE SURVEY RETURNED")
            print("   This could mean:")
            print("   1. At least one prerequisite check failed (see above)")
            print("   2. All trigger conditions are not met")
            print("   3. User is in cooldown period")

        print("\n" + "=" * 70)
        print("DIAGNOSTIC COMPLETE")
        print("=" * 70 + "\n")


async def main():
    if len(sys.argv) < 2:
        print("Usage: python api/scripts/survey_diagnostic.py <student_user_id>")
        print("\nExample: python api/scripts/survey_diagnostic.py user_12345")
        sys.exit(1)

    user_id = sys.argv[1]
    await diagnose_student_survey_eligibility(user_id)


if __name__ == "__main__":
    asyncio.run(main())
