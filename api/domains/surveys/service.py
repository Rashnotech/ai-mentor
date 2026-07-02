"""Survey eligibility, persistence, administration, and analytics."""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from domains.courses.models.course import Course, LearningPath, Lesson, Module
from domains.courses.models.progress import (
    LessonProgress,
    ModuleProgress,
    ProjectSubmission,
    UserCourseEnrollment,
)
from domains.payments.models import EnrollmentStatus
from domains.surveys.models import Survey, SurveyQuestion, SurveyResponse, UserSurveyEvent
from domains.surveys.schemas import (
    AdminSurveyResponseItem,
    AdminSurveyResponsesPage,
    EligibleSurvey,
    EligibleSurveyContext,
    SurveyAnalyticsResponse,
    SurveyCreate,
    SurveyQuestionCreate,
    SurveyQuestionResponse,
    SurveyResponseModel,
    SurveyUpdate,
)
from domains.users.models.onboarding import UserProfile
from domains.users.models.user import User


logger = logging.getLogger(__name__)

GLOBAL_SURVEY_COOLDOWN_DAYS = 7
SHOWN_COOLDOWN_DAYS = 3
DISMISSED_COOLDOWN_DAYS = 5
SKIPPED_COOLDOWN_DAYS = 7
FIRST_CHECKIN_DAYS = 7
FIRST_CHECKIN_LESSONS = 3
MONTHLY_CYCLE_DAYS = 30
SUPPORT_CHECKIN_DAYS = 10
URGENT_SUPPORT_DAYS = 14

CHOICE_TYPES = {"single_choice", "multiple_choice", "rating"}
TEXT_TYPES = {"short_text", "long_text"}


DEFAULT_SURVEYS: tuple[dict[str, Any], ...] = (
    {
        "slug": "learning-experience",
        "title": "Monthly Learning Feedback",
        "description": "Quick check-in: how is your learning going?",
        "survey_type": "learning_experience",
        "trigger_type": "learning_timeline",
        "priority": 10,
        "questions": (
            ("learning_experience", "How would you rate your learning experience?", "rating", ["Excellent", "Good", "Average", "Poor"], True),
            ("course_pace", "Is the course pace okay for you?", "single_choice", ["Too fast", "Just right", "Too slow"], True),
            ("enjoying_learning", "Are you enjoying the learning process?", "single_choice", ["Yes", "Somewhat", "No"], True),
            ("improvement_feedback", "What can we improve?", "short_text", [], False),
        ),
    },
    {
        "slug": "course-difficulty",
        "title": "How did that module feel?",
        "description": "Your answer helps us improve the next learning milestone.",
        "survey_type": "course_difficulty",
        "trigger_type": "module_completion",
        "priority": 20,
        "questions": (
            ("module_difficulty", "How difficult was this module or project?", "rating", ["Very easy", "Easy", "Moderate", "Difficult", "Very difficult"], True),
            ("lesson_preparation", "Did the lessons prepare you well for the project?", "single_choice", ["Yes", "Partially", "No"], True),
            ("confusing_part", "What part was confusing?", "short_text", [], False),
        ),
    },
    {
        "slug": "support-progress",
        "title": "Would a little support help?",
        "description": "Learning can get sticky. Tell us what would help you move forward.",
        "survey_type": "support_progress",
        "trigger_type": "learning_inactivity",
        "priority": 100,
        "questions": (
            ("currently_stuck", "Are you currently stuck?", "single_choice", ["Yes", "No", "A little"], True),
            ("help_needed", "What do you need help with?", "single_choice", ["Understanding lessons", "Completing project", "Setting up tools", "Motivation/accountability", "Other"], True),
            ("mentor_support", "Would you like mentor support?", "single_choice", ["Yes", "Not now"], True),
            ("blocking_details", "Explain briefly what is blocking you.", "short_text", [], False),
        ),
    },
)


@dataclass(frozen=True)
class SurveyCandidate:
    survey: Survey
    enrollment: UserCourseEnrollment
    cycle_key: str
    reason: str
    module_id: Optional[int] = None
    urgent: bool = False


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _days_since(value: datetime, now: datetime) -> int:
    normalized = _as_utc(value) or now
    return max(0, (now - normalized).days)


class SurveyService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def ensure_default_surveys(self) -> None:
        """Seed the three standard templates without overwriting admin edits."""
        changed = False
        for definition in DEFAULT_SURVEYS:
            result = await self.session.execute(select(Survey).where(Survey.slug == definition["slug"]))
            survey = result.scalar_one_or_none()
            if survey is not None:
                continue
            survey = Survey(
                slug=definition["slug"],
                title=definition["title"],
                description=definition["description"],
                survey_type=definition["survey_type"],
                trigger_type=definition["trigger_type"],
                priority=definition["priority"],
                is_active=True,
            )
            self.session.add(survey)
            await self.session.flush()
            changed = True
            for order, question in enumerate(definition["questions"], start=1):
                key, text, question_type, options, required = question
                self.session.add(
                    SurveyQuestion(
                        survey_id=survey.id,
                        question_key=key,
                        question_text=text,
                        question_type=question_type,
                        options=options,
                        is_required=required,
                        order=order,
                    )
                )
                changed = True
        if changed:
            await self.session.commit()
            logger.info("Seeded missing default learning survey templates")

    async def get_eligible_survey(self, user_id: str, role: str) -> Optional[EligibleSurvey]:
        if role != "student":
            return None

        profile_result = await self.session.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile is None or not profile.onboarding_completed:
            return None

        survey_result = await self.session.execute(
            select(Survey).where(Survey.is_active.is_(True)).order_by(Survey.priority.desc(), Survey.id)
        )
        surveys: dict[str, Survey] = {}
        for active_survey in survey_result.scalars().all():
            surveys.setdefault(active_survey.trigger_type, active_survey)
        if not surveys:
            return None

        enrollment_result = await self.session.execute(
            select(UserCourseEnrollment)
            .where(
                UserCourseEnrollment.user_id == user_id,
                UserCourseEnrollment.is_active.is_(True),
                UserCourseEnrollment.enrollment_status == EnrollmentStatus.ACTIVE,
            )
            .order_by(UserCourseEnrollment.enrolled_at.desc())
        )
        enrollments = list(enrollment_result.scalars().all())
        if not enrollments:
            return None

        now = datetime.now(timezone.utc)
        recent_event_result = await self.session.execute(
            select(UserSurveyEvent)
            .where(UserSurveyEvent.user_id == user_id, UserSurveyEvent.shown_at.is_not(None))
            .order_by(UserSurveyEvent.shown_at.desc())
            .limit(1)
        )
        recent_event = recent_event_result.scalar_one_or_none()

        candidates: list[SurveyCandidate] = []
        for enrollment in enrollments:
            support = await self._support_candidate(user_id, enrollment, surveys.get("learning_inactivity"), now)
            if support:
                candidates.append(support)
            milestone = await self._milestone_candidate(user_id, enrollment, surveys.get("module_completion"), now)
            if milestone:
                candidates.append(milestone)
            learning = await self._learning_candidate(user_id, enrollment, surveys.get("learning_timeline"), now)
            if learning:
                candidates.append(learning)

        candidates.sort(key=lambda item: (item.urgent, item.survey.priority), reverse=True)
        for candidate in candidates:
            if recent_event and not candidate.urgent:
                shown_at = _as_utc(recent_event.shown_at)
                if shown_at and shown_at > now - timedelta(days=GLOBAL_SURVEY_COOLDOWN_DAYS):
                    continue
            event = await self._available_event(user_id, candidate, now)
            if event is None:
                continue
            await self._mark_shown(event, candidate, now)
            questions = await self._questions(candidate.survey.id)
            title = candidate.survey.title
            if candidate.reason == "first_learning_checkin":
                title = "Quick check-in: how is your learning going?"
            logger.info(
                "survey_eligible user_id=%s survey_id=%s enrollment_id=%s reason=%s cycle=%s",
                user_id,
                candidate.survey.id,
                candidate.enrollment.enrollment_id,
                candidate.reason,
                candidate.cycle_key,
            )
            return EligibleSurvey(
                id=candidate.survey.id,
                title=title,
                description=candidate.survey.description,
                type=candidate.survey.survey_type,
                cycle_key=candidate.cycle_key,
                questions=[self._question_response(question) for question in questions],
                context=EligibleSurveyContext(
                    enrollment_id=candidate.enrollment.enrollment_id,
                    course_id=candidate.enrollment.course_id,
                    path_id=candidate.enrollment.path_id,
                    module_id=candidate.module_id,
                    reason=candidate.reason,
                ),
            )
        return None

    async def _learning_candidate(
        self,
        user_id: str,
        enrollment: UserCourseEnrollment,
        survey: Optional[Survey],
        now: datetime,
    ) -> Optional[SurveyCandidate]:
        if survey is None:
            return None
        enrollment_days = _days_since(enrollment.enrolled_at, now)
        completed_lessons = await self._completed_lesson_count(user_id, enrollment)
        cycle_number = enrollment_days // MONTHLY_CYCLE_DAYS
        if cycle_number >= 1:
            return SurveyCandidate(
                survey,
                enrollment,
                f"monthly:{enrollment.enrollment_id}:{cycle_number}",
                "monthly_learning_feedback",
            )
        first_cycle = f"first:{enrollment.enrollment_id}"
        first_completed = await self._cycle_completed(user_id, survey.id, enrollment.enrollment_id, first_cycle)
        if not first_completed and (enrollment_days >= FIRST_CHECKIN_DAYS or completed_lessons >= FIRST_CHECKIN_LESSONS):
            return SurveyCandidate(survey, enrollment, first_cycle, "first_learning_checkin")
        return None

    async def _milestone_candidate(
        self,
        user_id: str,
        enrollment: UserCourseEnrollment,
        survey: Optional[Survey],
        now: datetime,
    ) -> Optional[SurveyCandidate]:
        if survey is None:
            return None
        scope = self._module_scope(enrollment)
        milestones: list[tuple[datetime, int]] = []
        progress_result = await self.session.execute(
            select(ModuleProgress)
            .join(Module, Module.module_id == ModuleProgress.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(
                ModuleProgress.user_id == user_id,
                ModuleProgress.module_completed.is_(True),
                ModuleProgress.completed_at.is_not(None),
                ModuleProgress.completed_at >= now - timedelta(days=30),
                scope,
            )
            .order_by(ModuleProgress.completed_at.desc())
            .limit(1)
        )
        progress = progress_result.scalar_one_or_none()
        if progress and progress.completed_at:
            milestones.append((_as_utc(progress.completed_at) or now, progress.module_id))

        project_result = await self.session.execute(
            select(ProjectSubmission)
            .join(Module, Module.module_id == ProjectSubmission.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(
                ProjectSubmission.user_id == user_id,
                ProjectSubmission.submitted_at >= now - timedelta(days=30),
                scope,
            )
            .order_by(ProjectSubmission.submitted_at.desc())
            .limit(1)
        )
        project = project_result.scalar_one_or_none()
        if project and project.submitted_at:
            milestones.append((_as_utc(project.submitted_at) or now, project.module_id))

        lesson_result = await self.session.execute(
            select(LessonProgress, Lesson)
            .join(Lesson, Lesson.lesson_id == LessonProgress.lesson_id)
            .join(Module, Module.module_id == Lesson.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed.is_(True),
                LessonProgress.completed_at >= now - timedelta(days=30),
                scope,
            )
            .order_by(LessonProgress.completed_at.desc())
            .limit(1)
        )
        lesson_row = lesson_result.first()
        if lesson_row:
            latest_lesson_progress, latest_lesson = lesson_row
            total_result = await self.session.execute(
                select(func.count(Lesson.lesson_id)).where(Lesson.module_id == latest_lesson.module_id)
            )
            complete_result = await self.session.execute(
                select(func.count(LessonProgress.progress_id))
                .join(Lesson, Lesson.lesson_id == LessonProgress.lesson_id)
                .where(
                    LessonProgress.user_id == user_id,
                    LessonProgress.completed.is_(True),
                    Lesson.module_id == latest_lesson.module_id,
                )
            )
            total_lessons = int(total_result.scalar_one() or 0)
            completed_lessons = int(complete_result.scalar_one() or 0)
            if total_lessons > 0 and completed_lessons >= total_lessons:
                milestones.append(
                    (_as_utc(latest_lesson_progress.completed_at) or now, latest_lesson.module_id)
                )

        if not milestones:
            return None
        _, module_id = max(milestones, key=lambda item: item[0])
        return SurveyCandidate(
            survey,
            enrollment,
            f"module:{enrollment.enrollment_id}:{module_id}",
            "module_completion",
            module_id=module_id,
        )

    async def _support_candidate(
        self,
        user_id: str,
        enrollment: UserCourseEnrollment,
        survey: Optional[Survey],
        now: datetime,
    ) -> Optional[SurveyCandidate]:
        if survey is None:
            return None
        activity_dates: list[datetime] = []
        scope = self._module_scope(enrollment)
        queries = (
            select(func.max(LessonProgress.updated_at))
            .join(Lesson, Lesson.lesson_id == LessonProgress.lesson_id)
            .join(Module, Module.module_id == Lesson.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(LessonProgress.user_id == user_id, scope),
            select(func.max(ModuleProgress.last_updated))
            .join(Module, Module.module_id == ModuleProgress.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(ModuleProgress.user_id == user_id, scope),
            select(func.max(ProjectSubmission.submitted_at))
            .join(Module, Module.module_id == ProjectSubmission.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(ProjectSubmission.user_id == user_id, scope),
        )
        for query in queries:
            result = await self.session.execute(query)
            value = result.scalar_one_or_none()
            if value:
                activity_dates.append(value)
        baseline = enrollment.started_learning_at or enrollment.enrolled_at
        activity_dates.append(baseline)
        last_activity = max(_as_utc(value) or now for value in activity_dates)
        inactive_days = _days_since(last_activity, now)
        enrollment_days = _days_since(enrollment.enrolled_at, now)
        total_lessons = await self._total_lesson_count(enrollment)
        completed_lessons = await self._completed_lesson_count(user_id, enrollment)
        low_progress = False
        if enrollment_days >= URGENT_SUPPORT_DAYS and total_lessons > 0:
            actual_progress = completed_lessons / total_lessons
            expected_progress = 0.0
            expected_completion = _as_utc(enrollment.expected_completion_date)
            enrolled_at = _as_utc(enrollment.enrolled_at) or now
            if expected_completion and expected_completion > enrolled_at:
                duration = (expected_completion - enrolled_at).total_seconds()
                expected_progress = min(1.0, max(0.0, (now - enrolled_at).total_seconds() / duration))
            else:
                expected_progress = min(1.0, enrollment_days / 90)
            low_progress = actual_progress + 0.15 < expected_progress
        if inactive_days < SUPPORT_CHECKIN_DAYS and not low_progress:
            return None
        cycle_number = max(1, enrollment_days // URGENT_SUPPORT_DAYS)
        return SurveyCandidate(
            survey,
            enrollment,
            f"support:{enrollment.enrollment_id}:{cycle_number}",
            "low_learning_progress" if low_progress and inactive_days < SUPPORT_CHECKIN_DAYS else "learning_inactivity",
            urgent=inactive_days >= URGENT_SUPPORT_DAYS,
        )

    def _module_scope(self, enrollment: UserCourseEnrollment):
        if enrollment.path_id is not None:
            return Module.path_id == enrollment.path_id
        return LearningPath.course_id == enrollment.course_id

    async def _completed_lesson_count(self, user_id: str, enrollment: UserCourseEnrollment) -> int:
        result = await self.session.execute(
            select(func.count(LessonProgress.progress_id))
            .join(Lesson, Lesson.lesson_id == LessonProgress.lesson_id)
            .join(Module, Module.module_id == Lesson.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed.is_(True),
                self._module_scope(enrollment),
            )
        )
        return int(result.scalar_one() or 0)

    async def _total_lesson_count(self, enrollment: UserCourseEnrollment) -> int:
        result = await self.session.execute(
            select(func.count(Lesson.lesson_id))
            .join(Module, Module.module_id == Lesson.module_id)
            .join(LearningPath, LearningPath.path_id == Module.path_id)
            .where(self._module_scope(enrollment))
        )
        return int(result.scalar_one() or 0)

    async def _cycle_completed(self, user_id: str, survey_id: int, enrollment_id: int, cycle_key: str) -> bool:
        result = await self.session.execute(
            select(UserSurveyEvent.id).where(
                UserSurveyEvent.user_id == user_id,
                UserSurveyEvent.survey_id == survey_id,
                UserSurveyEvent.enrollment_id == enrollment_id,
                UserSurveyEvent.cycle_key == cycle_key,
                UserSurveyEvent.status == "completed",
            )
        )
        return result.scalar_one_or_none() is not None

    async def _available_event(
        self, user_id: str, candidate: SurveyCandidate, now: datetime
    ) -> Optional[UserSurveyEvent]:
        result = await self.session.execute(
            select(UserSurveyEvent).where(
                UserSurveyEvent.user_id == user_id,
                UserSurveyEvent.survey_id == candidate.survey.id,
                UserSurveyEvent.enrollment_id == candidate.enrollment.enrollment_id,
                UserSurveyEvent.cycle_key == candidate.cycle_key,
            )
        )
        event = result.scalar_one_or_none()
        if event is None:
            return UserSurveyEvent(
                user_id=user_id,
                survey_id=candidate.survey.id,
                enrollment_id=candidate.enrollment.enrollment_id,
                module_id=candidate.module_id,
                cycle_key=candidate.cycle_key,
            )
        if event.status == "completed":
            return None
        next_eligible = _as_utc(event.next_eligible_at)
        if next_eligible and next_eligible > now:
            return None
        return event

    async def _mark_shown(self, event: UserSurveyEvent, candidate: SurveyCandidate, now: datetime) -> None:
        event.status = "shown"
        event.shown_at = now
        event.module_id = candidate.module_id
        event.next_eligible_at = now + timedelta(days=SHOWN_COOLDOWN_DAYS)
        self.session.add(event)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            logger.info("Concurrent survey eligibility request reused the existing event")

    async def submit_response(
        self, user_id: str, survey_id: int, cycle_key: str, responses: dict[str, Any]
    ):
        survey = await self._active_survey(survey_id)
        event = await self._latest_open_event(user_id, survey_id, cycle_key)
        questions = await self._questions(survey.id)
        normalized = self._validate_answers(questions, responses)
        now = datetime.now(timezone.utc)
        response = SurveyResponse(
            survey_id=survey.id,
            user_id=user_id,
            course_id=event.enrollment.course_id,
            path_id=event.enrollment.path_id,
            enrollment_id=event.record.enrollment_id,
            module_id=event.record.module_id,
            cycle_key=event.record.cycle_key,
            responses_json=normalized,
            submitted_at=now,
        )
        event.record.status = "completed"
        event.record.completed_at = now
        event.record.next_eligible_at = now + timedelta(days=GLOBAL_SURVEY_COOLDOWN_DAYS)
        self.session.add(response)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ValueError("This survey cycle has already been completed") from exc
        await self.session.refresh(response)
        logger.info(
            "survey_completed user_id=%s survey_id=%s enrollment_id=%s cycle=%s",
            user_id,
            survey_id,
            response.enrollment_id,
            response.cycle_key,
        )
        return response

    @dataclass
    class OpenEvent:
        record: UserSurveyEvent
        enrollment: UserCourseEnrollment

    async def _latest_open_event(
        self, user_id: str, survey_id: int, cycle_key: Optional[str] = None
    ) -> OpenEvent:
        filters = [
            UserSurveyEvent.user_id == user_id,
            UserSurveyEvent.survey_id == survey_id,
            UserSurveyEvent.status == "shown",
        ]
        if cycle_key:
            filters.append(UserSurveyEvent.cycle_key == cycle_key)
        result = await self.session.execute(
            select(UserSurveyEvent, UserCourseEnrollment)
            .join(UserCourseEnrollment, UserCourseEnrollment.enrollment_id == UserSurveyEvent.enrollment_id)
            .where(*filters)
            .order_by(UserSurveyEvent.shown_at.desc())
            .limit(1)
        )
        row = result.first()
        if row is None:
            raise LookupError("No eligible survey event was found")
        return self.OpenEvent(record=row[0], enrollment=row[1])

    async def dismiss(self, user_id: str, survey_id: int, event_status: str) -> UserSurveyEvent:
        await self._active_survey(survey_id)
        event = await self._latest_open_event(user_id, survey_id)
        now = datetime.now(timezone.utc)
        event.record.status = event_status
        if event_status == "skipped":
            event.record.skipped_at = now
            cooldown = SKIPPED_COOLDOWN_DAYS
        else:
            event.record.dismissed_at = now
            cooldown = DISMISSED_COOLDOWN_DAYS
        event.record.next_eligible_at = now + timedelta(days=cooldown)
        await self.session.commit()
        await self.session.refresh(event.record)
        logger.info(
            "survey_%s user_id=%s survey_id=%s next_eligible_at=%s",
            event_status,
            user_id,
            survey_id,
            event.record.next_eligible_at,
        )
        return event.record

    async def _active_survey(self, survey_id: int) -> Survey:
        result = await self.session.execute(
            select(Survey).where(Survey.id == survey_id, Survey.is_active.is_(True))
        )
        survey = result.scalar_one_or_none()
        if survey is None:
            raise LookupError("Survey not found or inactive")
        return survey

    async def _questions(self, survey_id: int) -> list[SurveyQuestion]:
        result = await self.session.execute(
            select(SurveyQuestion)
            .where(SurveyQuestion.survey_id == survey_id)
            .order_by(SurveyQuestion.order, SurveyQuestion.id)
        )
        return list(result.scalars().all())

    def _validate_answers(
        self, questions: list[SurveyQuestion], responses: dict[str, Any]
    ) -> dict[str, Any]:
        questions_by_key = {question.question_key: question for question in questions}
        unknown = set(responses) - set(questions_by_key)
        if unknown:
            raise ValueError(f"Unknown survey answers: {', '.join(sorted(unknown))}")
        normalized: dict[str, Any] = {}
        for key, question in questions_by_key.items():
            answer = responses.get(key)
            missing = answer is None or answer == "" or answer == []
            if missing:
                if question.is_required:
                    raise ValueError(f"An answer is required for '{question.question_text}'")
                continue
            options = list(question.options or [])
            if question.question_type in {"single_choice", "rating"}:
                if not isinstance(answer, str) or answer not in options:
                    raise ValueError(f"Invalid answer for '{question.question_text}'")
                normalized[key] = answer
            elif question.question_type == "multiple_choice":
                if not isinstance(answer, list) or not answer or any(item not in options for item in answer):
                    raise ValueError(f"Invalid answer for '{question.question_text}'")
                normalized[key] = list(dict.fromkeys(answer))
            elif question.question_type in TEXT_TYPES:
                if not isinstance(answer, str):
                    raise ValueError(f"Invalid answer for '{question.question_text}'")
                max_length = 500 if question.question_type == "short_text" else 2000
                answer = answer.strip()
                if len(answer) > max_length:
                    raise ValueError(f"Answer for '{question.question_text}' is too long")
                if answer:
                    normalized[key] = answer
            else:
                raise ValueError(f"Unsupported question type '{question.question_type}'")
        return normalized

    @staticmethod
    def _question_response(question: SurveyQuestion) -> SurveyQuestionResponse:
        return SurveyQuestionResponse(
            id=question.id,
            question_key=question.question_key,
            question_text=question.question_text,
            question_type=question.question_type,
            options=list(question.options or []),
            is_required=question.is_required,
            order=question.order,
        )

    async def _survey_response(self, survey: Survey) -> SurveyResponseModel:
        questions = await self._questions(survey.id)
        return SurveyResponseModel(
            id=survey.id,
            slug=survey.slug,
            title=survey.title,
            description=survey.description,
            survey_type=survey.survey_type,
            trigger_type=survey.trigger_type,
            is_active=survey.is_active,
            priority=survey.priority,
            questions=[self._question_response(question) for question in questions],
            created_at=survey.created_at,
            updated_at=survey.updated_at,
        )

    async def list_surveys(self) -> list[SurveyResponseModel]:
        result = await self.session.execute(select(Survey).order_by(Survey.priority.desc(), Survey.id))
        return [await self._survey_response(survey) for survey in result.scalars().all()]

    async def create_survey(self, payload: SurveyCreate, admin_id: str) -> SurveyResponseModel:
        self._validate_question_definitions(payload.questions)
        survey = Survey(
            slug=payload.slug,
            title=payload.title,
            description=payload.description,
            survey_type=payload.survey_type,
            trigger_type=payload.trigger_type,
            is_active=payload.is_active,
            priority=payload.priority,
            created_by=admin_id,
        )
        self.session.add(survey)
        try:
            await self.session.flush()
            for question in payload.questions:
                self.session.add(SurveyQuestion(survey_id=survey.id, **question.model_dump()))
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ValueError("Survey slug and question keys must be unique") from exc
        await self.session.refresh(survey)
        return await self._survey_response(survey)

    async def update_survey(self, survey_id: int, payload: SurveyUpdate) -> SurveyResponseModel:
        result = await self.session.execute(select(Survey).where(Survey.id == survey_id))
        survey = result.scalar_one_or_none()
        if survey is None:
            raise LookupError("Survey not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(survey, field, value)
        await self.session.commit()
        await self.session.refresh(survey)
        return await self._survey_response(survey)

    async def add_question(self, survey_id: int, payload: SurveyQuestionCreate) -> SurveyQuestionResponse:
        result = await self.session.execute(select(Survey.id).where(Survey.id == survey_id))
        if result.scalar_one_or_none() is None:
            raise LookupError("Survey not found")
        count_result = await self.session.execute(
            select(func.count(SurveyQuestion.id)).where(SurveyQuestion.survey_id == survey_id)
        )
        if int(count_result.scalar_one() or 0) >= 5:
            raise ValueError("A survey can contain at most five questions")
        self._validate_question_definitions([payload])
        question = SurveyQuestion(survey_id=survey_id, **payload.model_dump())
        self.session.add(question)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ValueError("Question key must be unique within the survey") from exc
        await self.session.refresh(question)
        return self._question_response(question)

    async def update_question(self, question_id: int, payload: dict[str, Any]) -> SurveyQuestionResponse:
        result = await self.session.execute(select(SurveyQuestion).where(SurveyQuestion.id == question_id))
        question = result.scalar_one_or_none()
        if question is None:
            raise LookupError("Survey question not found")
        candidate_type = payload.get("question_type", question.question_type)
        candidate_options = payload.get("options", question.options or [])
        self._validate_question_shape(candidate_type, candidate_options)
        for field, value in payload.items():
            setattr(question, field, value)
        await self.session.commit()
        await self.session.refresh(question)
        return self._question_response(question)

    async def delete_question(self, question_id: int) -> None:
        result = await self.session.execute(select(SurveyQuestion).where(SurveyQuestion.id == question_id))
        question = result.scalar_one_or_none()
        if question is None:
            raise LookupError("Survey question not found")
        count_result = await self.session.execute(
            select(func.count(SurveyQuestion.id)).where(SurveyQuestion.survey_id == question.survey_id)
        )
        if int(count_result.scalar_one() or 0) <= 1:
            raise ValueError("A survey must keep at least one question")
        await self.session.delete(question)
        await self.session.commit()

    def _validate_question_definitions(self, questions: list[SurveyQuestionCreate]) -> None:
        keys = [question.question_key for question in questions]
        if len(keys) != len(set(keys)):
            raise ValueError("Question keys must be unique within the survey")
        for question in questions:
            self._validate_question_shape(question.question_type, question.options)

    @staticmethod
    def _validate_question_shape(question_type: str, options: list[str]) -> None:
        if question_type in CHOICE_TYPES and len(options) < 2:
            raise ValueError(f"{question_type} questions require at least two options")
        if question_type in TEXT_TYPES and options:
            raise ValueError(f"{question_type} questions cannot define options")

    async def list_responses(
        self,
        *,
        course_id: Optional[int] = None,
        path_id: Optional[int] = None,
        survey_type: Optional[str] = None,
        month: Optional[str] = None,
        needs_support: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AdminSurveyResponsesPage:
        filters = []
        if course_id is not None:
            filters.append(SurveyResponse.course_id == course_id)
        if path_id is not None:
            filters.append(SurveyResponse.path_id == path_id)
        if survey_type:
            filters.append(Survey.survey_type == survey_type)
        if month:
            start = datetime.strptime(month, "%Y-%m").replace(tzinfo=timezone.utc)
            next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
            filters.extend((SurveyResponse.submitted_at >= start, SurveyResponse.submitted_at < next_month))

        base = (
            select(SurveyResponse, Survey, User, Course, Module)
            .join(Survey, Survey.id == SurveyResponse.survey_id)
            .join(User, User.id == SurveyResponse.user_id)
            .outerjoin(Course, Course.course_id == SurveyResponse.course_id)
            .outerjoin(Module, Module.module_id == SurveyResponse.module_id)
            .where(*filters)
        )
        result = await self.session.execute(base.order_by(SurveyResponse.submitted_at.desc()))
        all_rows = list(result.all())
        items = [self._admin_response_item(*row) for row in all_rows]
        if needs_support is not None:
            items = [item for item in items if item.needs_support is needs_support]
        total = len(items)
        return AdminSurveyResponsesPage(
            responses=items[offset:offset + limit], total=total, limit=limit, offset=offset
        )

    async def analytics(
        self,
        *,
        course_id: Optional[int] = None,
        path_id: Optional[int] = None,
        survey_type: Optional[str] = None,
        month: Optional[str] = None,
    ) -> SurveyAnalyticsResponse:
        page = await self.list_responses(
            course_id=course_id,
            path_id=path_id,
            survey_type=survey_type,
            month=month,
            limit=100,
            offset=0,
        )
        # Analytics must cover the full filtered set, not only the admin page size.
        if page.total > len(page.responses):
            page = await self.list_responses(
                course_id=course_id,
                path_id=path_id,
                survey_type=survey_type,
                month=month,
                limit=min(page.total, 10000),
                offset=0,
            )
        active_result = await self.session.execute(
            select(func.count(Survey.id)).where(Survey.is_active.is_(True))
        )
        satisfaction = Counter()
        difficulty = Counter()
        issue_counts = Counter()
        course_complaints = Counter()
        course_names: dict[str, str] = {}
        module_complaints = Counter()
        module_names: dict[str, str] = {}
        monthly_scores: dict[str, list[int]] = defaultdict(list)
        rating_score = {"excellent": 4, "good": 3, "average": 2, "poor": 1}
        support_requests = 0
        negative_values = {"poor", "no", "difficult", "very difficult", "too fast", "too slow"}
        for item in page.responses:
            answers = item.responses
            learning_rating = str(answers.get("learning_experience", "")).lower()
            if learning_rating:
                satisfaction[learning_rating] += 1
                if learning_rating in rating_score:
                    monthly_scores[item.submitted_at.strftime("%Y-%m")].append(rating_score[learning_rating])
            module_difficulty = str(answers.get("module_difficulty", "")).lower()
            if module_difficulty:
                difficulty[module_difficulty] += 1
            if item.needs_support:
                support_requests += 1
            for key in ("help_needed", "improvement_feedback", "confusing_part", "blocking_details"):
                value = answers.get(key)
                if isinstance(value, str) and value.strip():
                    issue_counts[value.strip()[:160]] += 1
            values = {str(value).lower() for value in answers.values() if isinstance(value, str)}
            if values & negative_values and item.course_id is not None:
                course_key = str(item.course_id)
                course_complaints[course_key] += 1
                course_names[course_key] = item.course_title or f"Course {item.course_id}"
            if values & negative_values and item.module_id is not None:
                module_key = str(item.module_id)
                module_complaints[module_key] += 1
                module_names[module_key] = item.module_title or f"Module {item.module_id}"

        scores = [score for values in monthly_scores.values() for score in values]
        return SurveyAnalyticsResponse(
            total_responses=page.total,
            active_surveys=int(active_result.scalar_one() or 0),
            average_learning_rating=round(sum(scores) / len(scores), 2) if scores else None,
            satisfaction_breakdown=dict(satisfaction),
            difficulty_breakdown=dict(difficulty),
            common_issues=[{"issue": issue, "count": count} for issue, count in issue_counts.most_common(8)],
            support_requests=support_requests,
            courses_with_most_complaints=[
                {"course_id": int(course_id), "course_title": course_names[course_id], "complaints": count}
                for course_id, count in course_complaints.most_common(5)
            ],
            modules_with_most_complaints=[
                {"module_id": int(module_id), "module_title": module_names[module_id], "complaints": count}
                for module_id, count in module_complaints.most_common(5)
            ],
            monthly_satisfaction=[
                {"month": month_key, "average": round(sum(values) / len(values), 2), "responses": len(values)}
                for month_key, values in sorted(monthly_scores.items())
            ],
        )

    @staticmethod
    def _needs_support(responses: dict[str, Any]) -> bool:
        mentor = str(responses.get("mentor_support", "")).lower()
        stuck = str(responses.get("currently_stuck", "")).lower()
        return mentor == "yes" or stuck in {"yes", "a little"}

    def _admin_response_item(
        self,
        response: SurveyResponse,
        survey: Survey,
        user: User,
        course: Optional[Course],
        module: Optional[Module],
    ) -> AdminSurveyResponseItem:
        answers = dict(response.responses_json or {})
        return AdminSurveyResponseItem(
            id=response.id,
            survey_id=survey.id,
            survey_title=survey.title,
            survey_type=survey.survey_type,
            user_id=user.id,
            student_name=user.full_name,
            student_email=user.email,
            course_id=response.course_id,
            course_title=course.title if course else None,
            path_id=response.path_id,
            enrollment_id=response.enrollment_id,
            module_id=response.module_id,
            module_title=module.title if module else None,
            responses=answers,
            needs_support=self._needs_support(answers),
            submitted_at=response.submitted_at,
        )
