#!/usr/bin/python3
"""Mode 1: Project Defense Interview service using Groq Multimodal LLM.

Uses `meta-llama/llama-4-scout-17b-16e-instruct` (Vision + Text on Groq) to
conduct a 3-4 question technical defense interview at the end of each project.
Accepts conversation transcript, optional live screen snapshot (data URL), and
optional submitted GitHub repo context, evaluated against the project rubric.
"""
import asyncio
from datetime import datetime, timezone
import json
import logging
import re
from typing import Any, Dict, List, Optional

from groq import Groq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from domains.courses.models.course import Project
from domains.courses.models.progress import ProjectSubmission
from domains.courses.services.gamification_service import GamificationService
from domains.courses.services.github_precheck_service import parse_github_repo_url

logger = logging.getLogger(__name__)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
MAX_INTERVIEW_QUESTIONS = 4
_DATA_IMAGE_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$")


def is_valid_screenshot_data_url(data_url: Optional[str]) -> bool:
    """Validate that a screenshot is a compact base64 image data URL."""
    if not data_url or not isinstance(data_url, str):
        return False
    stripped = data_url.strip()
    if len(stripped) > 4_000_000:  # ~3MB decoded cap
        return False
    return bool(_DATA_IMAGE_RE.match(stripped))


def count_assistant_questions(transcript: List[Dict[str, str]]) -> int:
    """Count how many interviewer turns have already been asked."""
    return sum(1 for msg in transcript if msg.get("role") == "assistant" and str(msg.get("content", "")).strip())


def build_multimodal_user_content(
    text_prompt: str,
    screenshot_data_url: Optional[str],
) -> Any:
    """Build OpenAI/Groq-compatible text or multimodal (text + image_url) content."""
    if is_valid_screenshot_data_url(screenshot_data_url):
        return [
            {"type": "text", "text": text_prompt},
            {"type": "image_url", "image_url": {"url": screenshot_data_url.strip()}},
        ]
    return text_prompt


def _build_rubric_summary(project: Project, repo_url: Optional[str]) -> str:
    skills = ", ".join(project.required_skills or []) or "Core project skills"
    desc = (project.description or "No detailed description provided.").strip()[:1200]
    repo_line = f"Submitted Repository URL: {repo_url}" if repo_url else "Submitted Repository URL: Not submitted yet (student may share screen instead)"
    return (
        f"Project Title: {project.title}\n"
        f"Required Skills / Rubric: {skills}\n"
        f"{repo_line}\n"
        f"Project Description:\n{desc}"
    )


def _generate_multimodal_sync(
    messages: List[Dict[str, Any]],
    max_tokens: int = 450,
    temperature: float = 0.4,
) -> str:
    client = Groq(api_key=settings.GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return (completion.choices[0].message.content or "").strip()


def _parse_json_object(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                parsed = json.loads(match.group(0))
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                return None
    return None


def _fallback_question(project: Project, question_number: int, has_vision: bool) -> str:
    skills = project.required_skills or ["your main module"]
    primary_skill = skills[0] if skills else "your implementation"
    if question_number == 1:
        if has_vision:
            return (
                f"I can see your shared screen. Walk me through how you structured {project.title} "
                f"and how {primary_skill} fits into your main flow."
            )
        return (
            f"Let's start your defense for {project.title}. Walk me through how you structured "
            f"your project and handled state or data flow using {primary_skill}."
        )
    if question_number == 2:
        return (
            "Show me or point to the trickiest function or component you wrote, and explain why you "
            "chose that design over an alternative."
        )
    if question_number == 3:
        return (
            "What happens in your project when invalid input or a network/API error occurs? "
            "Walk me through your error handling."
        )
    return (
        "If you had to scale or extend this project for production tomorrow, what single refactor "
        "or test would you add first and why?"
    )


def _fallback_evaluation(transcript: List[Dict[str, str]], project: Project) -> Dict[str, Any]:
    user_turns = [m for m in transcript if m.get("role") == "user" and str(m.get("content", "")).strip()]
    avg_len = sum(len(m["content"]) for m in user_turns) / max(len(user_turns), 1)
    score = 82 if avg_len >= 60 else 70 if avg_len >= 25 else 58
    passed = score >= 65
    return {
        "score_percent": score,
        "passed": passed,
        "strengths": [
            f"Completed the full {project.title} defense walkthrough.",
            "Explained architectural choices across core project components.",
        ],
        "gaps": [
            "Add concrete examples of edge-case handling and test verification in future defenses."
            if score < 80
            else "Keep sharpening trade-off explanations with specific file references."
        ],
        "mentor_note": (
            "Solid project defense! You demonstrated clear ownership of your implementation."
            if passed
            else "Good effort. Review your error handling and data flow, then retake the defense to sharpen your explanations."
        ),
    }


async def run_project_defense_turn(
    db_session: AsyncSession,
    user_id: str,
    project_id: int,
    transcript: List[Dict[str, str]],
    screenshot_data_url: Optional[str] = None,
    repo_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Run one turn of Mode 1 (Project Defense Interview) with Groq Vision + Text."""
    project_stmt = select(Project).where(Project.project_id == project_id)
    project = (await db_session.execute(project_stmt)).scalar_one_or_none()
    if not project:
        raise ValueError("Project not found")

    # Fetch latest student submission URL if not explicitly provided
    effective_repo_url = repo_url
    if not effective_repo_url:
        sub_stmt = (
            select(ProjectSubmission)
            .where(
                ProjectSubmission.user_id == user_id,
                ProjectSubmission.project_id == project_id,
            )
            .order_by(ProjectSubmission.submitted_at.desc())
            .limit(1)
        )
        sub = (await db_session.execute(sub_stmt)).scalar_one_or_none()
        if sub:
            effective_repo_url = sub.solution_url

    has_vision = is_valid_screenshot_data_url(screenshot_data_url)
    asked_so_far = count_assistant_questions(transcript)
    user_answers_count = sum(
        1 for msg in transcript if msg.get("role") == "user" and str(msg.get("content", "")).strip()
    )

    # Determine if the interview is now complete (student answered >= MAX_INTERVIEW_QUESTIONS)
    is_final_evaluation = asked_so_far >= MAX_INTERVIEW_QUESTIONS and user_answers_count >= MAX_INTERVIEW_QUESTIONS
    next_question_number = min(asked_so_far + 1, MAX_INTERVIEW_QUESTIONS)

    rubric = _build_rubric_summary(project, effective_repo_url)
    parsed_repo = parse_github_repo_url(effective_repo_url) if effective_repo_url else None
    repo_note = f"GitHub repo: {parsed_repo[0]}/{parsed_repo[1]}" if parsed_repo else ""

    if is_final_evaluation:
        system_prompt = (
            "You are a senior technical interviewer concluding a Mode 1 Project Defense Interview. "
            "Evaluate the student's understanding based on the project rubric, transcript, and any shared screen snapshot. "
            "Return ONLY valid JSON with keys: "
            '{"message": string, "score_percent": integer 0-100, "passed": boolean, '
            '"strengths": [2 short strings], "gaps": [1-2 short strings], "mentor_note": string}.'
        )
        user_text = (
            f"{rubric}\n{repo_note}\n\n"
            f"The student has answered all {MAX_INTERVIEW_QUESTIONS} defense questions. "
            "Provide a fair final evaluation JSON."
        )
    else:
        system_prompt = (
            "You are a technical interviewer running a Mode 1 Project Defense Interview at the end of a student project. "
            "Your job is to verify the student truly understands what they built. "
            "Rules:\n"
            "1. Ask ONE sharp, targeted question per turn (max 2-3 sentences).\n"
            "2. Reference specific details from their shared screen snapshot (code, file tree, terminal, or UI) if attached, "
            "or from the project rubric and repo.\n"
            "3. Probe state/data flow, architecture choices, edge cases, or debugging.\n"
            "4. Never give long lectures; keep it conversational and focused."
        )
        vision_hint = (
            "A current screen snapshot from the student is attached — inspect what is visible on their screen and reference it."
            if has_vision
            else "No screen snapshot attached this turn; reference their project rubric/repo or invite them to share their screen if helpful."
        )
        user_text = (
            f"{rubric}\n{repo_note}\n"
            f"Interview Progress: Asking question {next_question_number} of {MAX_INTERVIEW_QUESTIONS}.\n"
            f"{vision_hint}\n"
            "Respond with your next concise interview question (or brief 1-sentence acknowledgement + next question)."
        )

    groq_messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for msg in transcript[-10:]:
        role = msg.get("role")
        content = str(msg.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            groq_messages.append({"role": role, "content": content})

    groq_messages.append(
        {
            "role": "user",
            "content": build_multimodal_user_content(user_text, screenshot_data_url),
        }
    )

    ai_text: Optional[str] = None
    if settings.GROQ_API_KEY:
        try:
            ai_text = await asyncio.wait_for(
                asyncio.to_thread(_generate_multimodal_sync, groq_messages, 480, 0.4),
                timeout=20.0,
            )
        except Exception as exc:
            logger.error(f"Groq multimodal project interview failed: {exc}")
            ai_text = None

    if is_final_evaluation:
        parsed_eval = _parse_json_object(ai_text) or _fallback_evaluation(transcript, project)
        score_percent = int(max(0, min(100, parsed_eval.get("score_percent", 75))))
        passed = bool(parsed_eval.get("passed", score_percent >= 65))
        strengths = [str(s) for s in (parsed_eval.get("strengths") or [])[:3]] or [
            "Walked through core project architecture."
        ]
        gaps = [str(g) for g in (parsed_eval.get("gaps") or [])[:2]] or [
            "Continue practicing concise trade-off explanations."
        ]
        mentor_note = str(parsed_eval.get("mentor_note") or "Defense completed.")
        closing_message = str(parsed_eval.get("message") or mentor_note)

        xp_awarded = 0
        try:
            await GamificationService(db_session).record_learning_activity(
                user_id=user_id,
                xp_earned=20,
                submitted_at=datetime.now(timezone.utc),
            )
            xp_awarded = 20
        except Exception as gam_err:
            logger.error(f"Gamification update failed on project defense: {gam_err}")

        return {
            "message": closing_message,
            "question_number": MAX_INTERVIEW_QUESTIONS,
            "max_questions": MAX_INTERVIEW_QUESTIONS,
            "is_complete": True,
            "used_vision": has_vision,
            "model": VISION_MODEL,
            "evaluation": {
                "score_percent": score_percent,
                "passed": passed,
                "strengths": strengths,
                "gaps": gaps,
                "mentor_note": mentor_note,
                "xp_awarded": xp_awarded,
            },
        }

    reply_message = ai_text or _fallback_question(project, next_question_number, has_vision)
    return {
        "message": reply_message,
        "question_number": next_question_number,
        "max_questions": MAX_INTERVIEW_QUESTIONS,
        "is_complete": False,
        "used_vision": has_vision,
        "model": VISION_MODEL,
        "evaluation": None,
    }
