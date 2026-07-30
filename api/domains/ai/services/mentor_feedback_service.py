#!/usr/bin/python3
"""Smart-trigger AI mentor: generates and persists AIMentorFeedback messages.

Three triggers feed into this service:
  1. Quiz score reviewed  -> generate_quiz_feedback   (encourage or correct)
  2. Project started      -> generate_project_guidance
  3. 3 days inactive       -> generate_checkin_message (used by the cron job)

Message generation is latent-space work (tailored natural language), so it
goes through Groq. Trigger detection, dedup, and scoring are all deterministic
and live outside this service (routes/jobs), so they stay unit-testable
without touching the network.

Every generator degrades to a deterministic template if Groq is unavailable
or fails, so a flaky LLM call never blocks a student-facing action.
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domains.ai.models.feedback import AIMentorFeedback
from domains.ai.services import groq_client

logger = logging.getLogger(__name__)

QUIZ_CORRECTION_THRESHOLD = 50.0


def quiz_category(score_percent: float) -> str:
    """Deterministic bucket: below 50% needs correction, otherwise encouragement."""
    return "quiz_correction" if score_percent < QUIZ_CORRECTION_THRESHOLD else "quiz_encouragement"


def _quiz_title(category: str, module_title: str, score_percent: float) -> str:
    if category == "quiz_correction":
        return f"Let's revisit {module_title}"
    return f"Nice work on {module_title}!"


def _quiz_fallback_message(category: str, module_title: str, score_percent: float) -> str:
    score_display = round(score_percent)
    if category == "quiz_correction":
        return (
            f"You scored {score_display}% on the {module_title} quiz. That's a signal to slow down and "
            f"revisit this module, not a setback — every expert has been exactly here. Go back over the "
            f"lessons you missed, retry the questions that tripped you up, and ask your mentor if anything "
            f"still feels unclear. We're building you into someone exceptionally good at this, and that "
            f"means getting the fundamentals solid before moving on."
        )
    return (
        f"You scored {score_display}% on the {module_title} quiz — great work. That's real proof the "
        f"fundamentals are sticking. Keep this momentum going into the next module; you're on track to "
        f"become genuinely excellent at this."
    )


def _project_fallback_message(project_title: str, required_skills: Optional[List[str]]) -> str:
    skills_line = f" This project leans on {', '.join(required_skills)}." if required_skills else ""
    return (
        f"You're starting {project_title}.{skills_line} Read through the brief fully before writing any "
        f"code, break it into the smallest pieces you can ship and test one at a time, and don't aim for "
        f"perfect on the first pass — aim for working, then improve it. If you get stuck, that's the point "
        f"where you're actually learning something new. You've got this."
    )


def _checkin_fallback_message(user_name: str) -> str:
    first_name = (user_name or "there").split(" ")[0]
    return (
        f"Hey {first_name}, we noticed you've been away from your course for a few days. No pressure — "
        f"just a nudge, because consistency is what turns effort into mastery. Come back and pick up right "
        f"where you left off; even 20 minutes today keeps the momentum alive. We're rooting for you."
    )


async def quiz_feedback_text(
    module_title: str,
    score_percent: float,
    correct_count: int,
    total_count: int,
) -> str:
    """Generate (or fall back to a template for) the quiz feedback message text.

    Pure text generation — no DB access — so it can be called directly from
    the eval suite without touching the database.
    """
    category = quiz_category(score_percent)

    if category == "quiz_correction":
        system_prompt = (
            "You are an encouraging, expert coding mentor. A student scored below 50% on a module quiz. "
            "Write a short, warm but honest message (max 90 words) that: (1) names the score plainly without "
            "being harsh, (2) reframes it as a normal part of learning, not failure, (3) gives one concrete "
            "next step (revisit the module, retry missed questions), (4) ends on a genuinely motivating note. "
            "No emojis, no bullet points, plain prose only."
        )
    else:
        system_prompt = (
            "You are an encouraging, expert coding mentor. A student did well on a module quiz. Write a "
            "short, genuine congratulations (max 70 words) that names the score, is specific (not generic "
            "praise), and motivates them to keep the momentum into the next module. No emojis, no bullet "
            "points, plain prose only."
        )

    user_prompt = (
        f"Module: {module_title}\nScore: {round(score_percent)}% ({correct_count}/{total_count} correct)"
    )

    message = await groq_client.generate_text(system_prompt, user_prompt, max_tokens=180)
    if not message:
        message = _quiz_fallback_message(category, module_title, score_percent)
    return message


async def generate_quiz_feedback(
    db_session: AsyncSession,
    user_id: str,
    module_id: int,
    module_title: str,
    score_percent: float,
    correct_count: int,
    total_count: int,
) -> AIMentorFeedback:
    """Generate (or fall back to a template for) quiz-completion feedback and persist it."""
    category = quiz_category(score_percent)
    title = _quiz_title(category, module_title, score_percent)
    message = await quiz_feedback_text(module_title, score_percent, correct_count, total_count)

    feedback = AIMentorFeedback(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        module_id=module_id,
        context_title=module_title,
        score_percent=score_percent,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)
    return feedback


async def project_guidance_text(
    project_title: str,
    project_description: Optional[str],
    required_skills: Optional[List[str]],
) -> str:
    """Generate (or fall back to a template for) the project guidance message text."""
    system_prompt = (
        "You are an encouraging, expert coding mentor. A student is about to start a project. Write short, "
        "practical starting guidance (max 100 words): how to approach it, one concrete first step, and an "
        "encouraging close. Do not write any code or solve the project for them. No emojis, no bullet points, "
        "plain prose only."
    )
    skills_line = f"Required skills: {', '.join(required_skills)}\n" if required_skills else ""
    user_prompt = (
        f"Project: {project_title}\n"
        f"{skills_line}"
        f"Description: {(project_description or '')[:600]}"
    )

    message = await groq_client.generate_text(system_prompt, user_prompt, max_tokens=200)
    if not message:
        message = _project_fallback_message(project_title, required_skills)
    return message


async def generate_project_guidance(
    db_session: AsyncSession,
    user_id: str,
    project_id: int,
    project_title: str,
    project_description: Optional[str],
    required_skills: Optional[List[str]],
) -> AIMentorFeedback:
    """Generate (or fall back to a template for) project-start guidance and persist it."""
    message = await project_guidance_text(project_title, project_description, required_skills)

    feedback = AIMentorFeedback(
        user_id=user_id,
        category="project_guidance",
        title=f"Getting started: {project_title}",
        message=message,
        project_id=project_id,
        context_title=project_title,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)
    return feedback


async def checkin_text(user_name: str) -> str:
    """Generate (or fall back to a template for) the inactivity check-in message text."""
    system_prompt = (
        "You are an encouraging, expert coding mentor. A student has been inactive for 3 days. Write a "
        "short, warm check-in message (max 80 words) that re-engages them without guilt-tripping — no "
        "pressure, just a genuine nudge that their progress matters and consistency compounds. No emojis, "
        "no bullet points, plain prose only."
    )
    user_prompt = f"Student first name: {(user_name or 'there').split(' ')[0]}"

    message = await groq_client.generate_text(system_prompt, user_prompt, max_tokens=160)
    if not message:
        message = _checkin_fallback_message(user_name)
    return message


async def generate_checkin_message(
    db_session: AsyncSession,
    user_id: str,
    user_name: str,
) -> AIMentorFeedback:
    """Generate (or fall back to a template for) a 3-day inactivity check-in and persist it."""
    message = await checkin_text(user_name)

    feedback = AIMentorFeedback(
        user_id=user_id,
        category="inactivity_checkin",
        title="We miss you!",
        message=message,
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)
    return feedback


async def has_quiz_feedback(db_session: AsyncSession, user_id: str, module_id: int) -> bool:
    """True if quiz feedback was already generated for this user+module (avoid re-generating on retries)."""
    stmt = select(AIMentorFeedback.feedback_id).where(
        AIMentorFeedback.user_id == user_id,
        AIMentorFeedback.module_id == module_id,
        AIMentorFeedback.category.in_(["quiz_encouragement", "quiz_correction"]),
    )
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def get_existing_project_guidance(
    db_session: AsyncSession, user_id: str, project_id: int
) -> Optional[AIMentorFeedback]:
    """Return previously generated project guidance for this user+project, if any (idempotency)."""
    stmt = select(AIMentorFeedback).where(
        AIMentorFeedback.user_id == user_id,
        AIMentorFeedback.project_id == project_id,
        AIMentorFeedback.category == "project_guidance",
    )
    result = await db_session.execute(stmt)
    return result.scalar_one_or_none()


async def get_feed(db_session: AsyncSession, user_id: str, limit: int = 20) -> List[AIMentorFeedback]:
    """The student's AI Mentor Feedback dashboard feed, newest first."""
    stmt = (
        select(AIMentorFeedback)
        .where(AIMentorFeedback.user_id == user_id)
        .order_by(AIMentorFeedback.created_at.desc())
        .limit(limit)
    )
    result = await db_session.execute(stmt)
    return list(result.scalars().all())
