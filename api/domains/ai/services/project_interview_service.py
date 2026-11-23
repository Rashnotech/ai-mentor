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
from domains.ai.services import groq_client
from domains.courses.models.course import Lesson, Module, Project
from domains.courses.models.progress import ProjectSubmission
from domains.courses.services.gamification_service import GamificationService
from domains.courses.services.github_precheck_service import parse_github_repo_url, run_github_precheck
from domains.courses.services.project_milestone_service import build_project_milestones

logger = logging.getLogger(__name__)

VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
MAX_INTERVIEW_QUESTIONS = 4
_DATA_IMAGE_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$")
_REPO_CONTEXT_CACHE: Dict[str, str] = {}


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


def _build_rubric_summary(
    project: Project,
    repo_url: Optional[str],
    module_title: Optional[str] = None,
    lesson_titles: Optional[List[str]] = None,
    milestones: Optional[List[Dict[str, Any]]] = None,
    repo_summary: Optional[str] = None,
) -> str:
    skills = ", ".join(project.required_skills or []) or "Core project skills"
    desc = (project.description or "No detailed description provided.").strip()[:2000]
    repo_line = (
        f"Submitted Repository URL: {repo_url}"
        if repo_url
        else "Submitted Repository URL: Not submitted yet (student may share screen instead)"
    )
    parts = [
        f"Project Title: {project.title}",
        f"Module: {module_title}" if module_title else "",
        f"Module Lessons Covered: {', '.join(lesson_titles[:8])}" if lesson_titles else "",
        f"Required Skills / Rubric: {skills}",
        (
            "Project Milestones:\n"
            + "\n".join(f"- {m['title']}: {m.get('description', '')}" for m in (milestones or []))
            if milestones
            else ""
        ),
        repo_line,
        f"Repository Inspection Summary:\n{repo_summary}" if repo_summary else "",
        f"Project Brief & Requirements:\n{desc}",
    ]
    return "\n".join(p for p in parts if p)


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


def _fallback_question(
    project: Project,
    question_number: int,
    has_vision: bool,
    milestones: Optional[List[Dict[str, Any]]] = None,
    lesson_titles: Optional[List[str]] = None,
) -> str:
    skills = project.required_skills or []
    primary_skill = skills[0] if skills else project.title
    m1_title = milestones[0]["title"] if milestones and len(milestones) > 0 else "your initial setup"
    m2_title = milestones[1]["title"] if milestones and len(milestones) > 1 else "your core implementation"
    lesson_ref = lesson_titles[0] if lesson_titles else project.title

    if question_number == 1:
        if has_vision:
            return (
                f"I can see your shared screen for {project.title}. Walk me through how you approached "
                f"{m1_title} and how you applied {primary_skill}."
            )
        return (
            f"Let's discuss your {project.title} project. How did you apply concepts from '{lesson_ref}' "
            f"when completing {m1_title}?"
        )
    if question_number == 2:
        return (
            f"For {m2_title} in {project.title}, walk me through the main logic or deliverable you built "
            f"using {primary_skill} and why you structured it that way."
        )
    if question_number == 3:
        return (
            f"What edge case, validation issue, or error did you run into while building {project.title}, "
            "and how did you verify your fix?"
        )
    return (
        f"Looking at the requirements for {project.title}, what one improvement or test would you add "
        "next before presenting this work to a reviewer?"
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

    # Fetch module title, module lessons, and project milestones for project-grounded questions
    module_title: Optional[str] = None
    lesson_titles: List[str] = []
    if project.module_id:
        mod_obj = (
            await db_session.execute(select(Module).where(Module.module_id == project.module_id))
        ).scalar_one_or_none()
        if mod_obj:
            module_title = mod_obj.title
        lesson_rows = (
            await db_session.execute(
                select(Lesson.title)
                .where(Lesson.module_id == project.module_id)
                .order_by(Lesson.order)
            )
        ).scalars().all()
        lesson_titles = [str(t) for t in lesson_rows if t]

    milestones = build_project_milestones(project)

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

    parsed_repo = parse_github_repo_url(effective_repo_url) if effective_repo_url else None
    repo_summary: Optional[str] = None
    if parsed_repo and effective_repo_url:
        cache_key = f"{project_id}:{effective_repo_url.strip()}"
        if cache_key in _REPO_CONTEXT_CACHE:
            repo_summary = _REPO_CONTEXT_CACHE[cache_key]
        else:
            try:
                precheck = await asyncio.wait_for(
                    run_github_precheck(project, effective_repo_url),
                    timeout=8.0,
                )
                if precheck.get("is_public") and not precheck.get("is_empty"):
                    repo_summary = (
                        f"Repo: {precheck.get('repo_full_name')} | Stack: {', '.join(precheck.get('detected_stack') or [])}\n"
                        f"Key Files: {', '.join((precheck.get('key_files') or [])[:10])}\n"
                        f"Precheck Notes: {' ; '.join(precheck.get('bullets') or [])}"
                    )
                    if len(_REPO_CONTEXT_CACHE) > 200:
                        _REPO_CONTEXT_CACHE.clear()
                    _REPO_CONTEXT_CACHE[cache_key] = repo_summary
            except Exception as repo_err:
                logger.warning(f"Could not fetch repo context for interview: {repo_err}")

    rubric = _build_rubric_summary(
        project=project,
        repo_url=effective_repo_url,
        module_title=module_title,
        lesson_titles=lesson_titles,
        milestones=milestones,
        repo_summary=repo_summary,
    )
    repo_note = f"GitHub repo: {parsed_repo[0]}/{parsed_repo[1]}" if parsed_repo else ""

    if is_final_evaluation:
        system_prompt = (
            "You are a senior technical interviewer concluding a Project Interview. "
            "Evaluate the student's understanding specifically against the project brief, milestones, lessons, "
            "transcript, and any shared screen snapshot or GitHub files. "
            "Return ONLY valid JSON with keys: "
            '{"message": string, "score_percent": integer 0-100, "passed": boolean, '
            '"strengths": [2 short strings], "gaps": [1-2 short strings], "mentor_note": string}.'
        )
        user_text = (
            f"{rubric}\n{repo_note}\n\n"
            f"The student has answered all {MAX_INTERVIEW_QUESTIONS} interview questions. "
            "Provide a fair final evaluation JSON."
        )
    else:
        system_prompt = (
            "You are a technical interviewer conducting a Project Interview at the end of a student's project. "
            "Every question MUST be directly grounded in THIS specific project's brief, milestones, module lessons, "
            "and (when available) the student's actual GitHub files or shared screen snapshot. "
            "Rules:\n"
            "1. Ask ONE sharp, project-specific question per turn (max 2-3 sentences).\n"
            "2. Never ask generic questions detached from the project domain — explicitly reference the project title, "
            "a milestone, a lesson topic, a file from their repo, or what is visible on their screen.\n"
            "3. Probe how they built it, why they made a specific choice, or how they handled an edge case.\n"
            "4. Never give long lectures; keep it conversational and focused."
        )
        vision_hint = (
            "A current screen snapshot from the student is attached — inspect what is visible on their screen and reference it directly."
            if has_vision
            else "No screen snapshot attached this turn; ground your question directly in the project brief, milestones, lessons, and repo files above."
        )
        user_text = (
            f"{rubric}\n{repo_note}\n"
            f"Interview Progress: Asking question {next_question_number} of {MAX_INTERVIEW_QUESTIONS}.\n"
            f"{vision_hint}\n"
            "Respond with your next concise, project-specific interview question."
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

    # Text-LLM fallback if multimodal call failed so questions remain project-grounded
    if not ai_text and settings.GROQ_API_KEY:
        transcript_text = "\n".join(
            f"{m.get('role', 'user').upper()}: {m.get('content', '')}"
            for m in transcript[-8:]
            if m.get("content")
        )
        ai_text = await groq_client.generate_text(
            system_prompt=system_prompt,
            user_prompt=f"{user_text}\n\nConversation so far:\n{transcript_text}",
            max_tokens=420,
            temperature=0.4,
        )

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

    reply_message = ai_text or _fallback_question(
        project=project,
        question_number=next_question_number,
        has_vision=has_vision,
        milestones=milestones,
        lesson_titles=lesson_titles,
    )
    return {
        "message": reply_message,
        "question_number": next_question_number,
        "max_questions": MAX_INTERVIEW_QUESTIONS,
        "is_complete": False,
        "used_vision": has_vision,
        "model": VISION_MODEL,
        "evaluation": None,
    }
