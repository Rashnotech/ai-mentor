#!/usr/bin/python3
"""Project micro-milestones service.

Provides progressive 3-step checkpoints for every project (using explicit
`project.milestones` when configured or deterministic defaults derived from the
project's title and required skills) and persists per-user completion state on
`UserProgress.completed_milestones`.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.constant import ProgressStatus
from core.errors import AppError
from domains.courses.models.course import Project
from domains.courses.services.gamification_service import GamificationService
from domains.progress.models.progress import UserProgress

logger = logging.getLogger(__name__)


def build_project_milestones(project: Any) -> List[Dict[str, Any]]:
    """Return normalized 3-4 progressive checkpoints for a project."""
    raw = getattr(project, "milestones", None)
    if isinstance(raw, list) and len(raw) > 0:
        normalized: List[Dict[str, Any]] = []
        for idx, item in enumerate(raw, start=1):
            if not isinstance(item, dict):
                continue
            milestone_id = str(item.get("id") or f"m{idx}")
            title = str(item.get("title") or f"Milestone {idx}").strip()
            description = str(item.get("description") or "").strip()
            order = int(item.get("order") or idx)
            normalized.append(
                {
                    "id": milestone_id,
                    "title": title,
                    "description": description,
                    "order": order,
                }
            )
        if normalized:
            normalized.sort(key=lambda m: m["order"])
            return normalized

    skills = [str(s).strip() for s in (getattr(project, "required_skills", None) or []) if str(s).strip()]
    primary_skills = ", ".join(skills[:3]) if skills else "project stack"
    title = str(getattr(project, "title", None) or "this project").strip()

    return [
        {
            "id": "m1",
            "title": "Milestone 1: Setup & Data Model",
            "description": f"Initialize your repository, configure {primary_skills}, and create the core folder structure or schema stubs.",
            "order": 1,
        },
        {
            "id": "m2",
            "title": "Milestone 2: Core Logic",
            "description": f"Implement the main {title} features, wire up validation or state flow, and verify happy-path behavior.",
            "order": 2,
        },
        {
            "id": "m3",
            "title": "Milestone 3: Edge Cases & GitHub Readiness",
            "description": "Handle error cases, add a clear README with setup steps, and push clean commits to a public GitHub repo.",
            "order": 3,
        },
    ]


async def get_completed_milestones_map(
    db_session: AsyncSession,
    user_id: str,
    project_ids: List[int],
) -> Dict[int, List[str]]:
    """Batch-fetch completed milestone IDs for a user across projects."""
    if not project_ids:
        return {}

    stmt = select(UserProgress.project_id, UserProgress.completed_milestones).where(
        UserProgress.user_id == user_id,
        UserProgress.project_id.in_(project_ids),
    )
    result = await db_session.execute(stmt)
    mapping: Dict[int, List[str]] = {}
    for proj_id, completed in result.all():
        if proj_id is None:
            continue
        if isinstance(completed, list):
            mapping[proj_id] = [str(m) for m in completed]
        else:
            mapping[proj_id] = []
    return mapping


async def toggle_project_milestone(
    db_session: AsyncSession,
    user_id: str,
    project_id: int,
    milestone_id: str,
    completed: bool,
) -> Dict[str, Any]:
    """Toggle a project micro-milestone for the student and award +5 XP on new check."""
    project_stmt = select(Project).where(Project.project_id == project_id)
    project = (await db_session.execute(project_stmt)).scalar_one_or_none()
    if not project:
        raise AppError(status_code=404, detail="Project not found", error_code="PROJECT_NOT_FOUND")

    milestones = build_project_milestones(project)
    valid_ids = [m["id"] for m in milestones]
    if milestone_id not in valid_ids:
        raise AppError(status_code=400, detail="Invalid milestone ID for this project", error_code="INVALID_MILESTONE")

    progress_stmt = select(UserProgress).where(
        UserProgress.user_id == user_id,
        UserProgress.project_id == project_id,
    )
    progress = (await db_session.execute(progress_stmt)).scalar_one_or_none()
    now = datetime.now(timezone.utc)

    existing_ids: List[str] = []
    if progress and isinstance(progress.completed_milestones, list):
        existing_ids = [str(m) for m in progress.completed_milestones if str(m) in valid_ids]

    was_checked = milestone_id in existing_ids
    if completed and not was_checked:
        updated_ids = [*existing_ids, milestone_id]
    elif not completed and was_checked:
        updated_ids = [m for m in existing_ids if m != milestone_id]
    else:
        updated_ids = existing_ids

    # Preserve milestone order
    order_index = {m_id: idx for idx, m_id in enumerate(valid_ids)}
    updated_ids.sort(key=lambda m_id: order_index.get(m_id, 999))

    if not progress:
        progress = UserProgress(
            user_id=user_id,
            project_id=project_id,
            status=ProgressStatus.IN_PROGRESS,
            started_at=now,
            completed_milestones=updated_ids,
        )
        db_session.add(progress)
    else:
        if progress.status == ProgressStatus.NOT_STARTED:
            progress.status = ProgressStatus.IN_PROGRESS
            progress.started_at = progress.started_at or now
        progress.completed_milestones = updated_ids
        db_session.add(progress)

    await db_session.commit()

    xp_awarded = 0
    if completed and not was_checked:
        try:
            await GamificationService(db_session).record_learning_activity(
                user_id=user_id,
                xp_earned=5,
                submitted_at=now,
            )
            xp_awarded = 5
        except Exception as gam_err:
            logger.error(f"Gamification update failed on milestone check: {gam_err}")

    return {
        "project_id": project_id,
        "milestone_id": milestone_id,
        "completed": completed,
        "completed_milestones": updated_ids,
        "total_milestones": len(milestones),
        "xp_awarded": xp_awarded,
    }
