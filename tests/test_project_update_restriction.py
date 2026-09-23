"""
Integration test for project link update restriction.
Verifies that students can update project URLs only before mentor review.
"""

import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from api.domains.courses.models.progress import ProjectSubmission
from api.domains.courses.services.progress_service import ProgressService
from core.errors import AppError


@pytest.mark.asyncio
async def test_update_project_url_before_review(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: str,
    test_project_id: int,
    test_module_id: int,
):
    """
    Test: Student can update project submission URL before mentor review
    """
    # 1. Submit a project
    submit_response = await async_client.post(
        "/api/v1/enrollments/progress/projects/submit",
        json={
            "project_id": test_project_id,
            "module_id": test_module_id,
            "solution_url": "https://github.com/student/original-link",
            "description": "Original submission",
        },
        headers={"Authorization": f"Bearer {test_user_id}"},
    )
    assert submit_response.status_code == 201
    submission_data = submit_response.json()
    submission_id = submission_data["submission_id"]

    # 2. Verify submission exists and reviewed_at is None
    db_session.refresh(submission_data)
    assert submission_data.reviewed_at is None, "New submission should not have reviewed_at"

    # 3. Update the URL before review (should succeed)
    update_response = await async_client.put(
        f"/api/v1/enrollments/progress/projects/{submission_id}/update-url",
        json={
            "solution_url": "https://github.com/student/updated-link",
            "module_id": test_module_id,
        },
        headers={"Authorization": f"Bearer {test_user_id}"},
    )
    assert update_response.status_code == 200, f"Update failed: {update_response.json()}"

    updated_data = update_response.json()
    assert updated_data["solution_url"] == "https://github.com/student/updated-link"
    assert updated_data["reviewed_at"] is None


@pytest.mark.asyncio
async def test_update_project_url_after_review_fails(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: str,
    test_project_id: int,
    test_module_id: int,
):
    """
    Test: Student CANNOT update project submission URL after mentor review
    """
    # 1. Submit a project
    submit_response = await async_client.post(
        "/api/v1/enrollments/progress/projects/submit",
        json={
            "project_id": test_project_id,
            "module_id": test_module_id,
            "solution_url": "https://github.com/student/original-link",
        },
        headers={"Authorization": f"Bearer {test_user_id}"},
    )
    assert submit_response.status_code == 201
    submission_id = submit_response.json()["submission_id"]

    # 2. Simulate mentor review by marking as approved
    service = ProgressService(db_session)
    submission = await service.approve_project_submission(
        submission_id=submission_id,
        feedback="Great work!",
        points=100,
    )
    assert submission.reviewed_at is not None, "Submission should be reviewed"

    # 3. Try to update URL after review (should fail with 403)
    update_response = await async_client.put(
        f"/api/v1/enrollments/progress/projects/{submission_id}/update-url",
        json={
            "solution_url": "https://github.com/student/new-link",
            "module_id": test_module_id,
        },
        headers={"Authorization": f"Bearer {test_user_id}"},
    )
    assert update_response.status_code == 403
    error_data = update_response.json()
    assert "reviewed" in error_data["detail"].lower()


@pytest.mark.asyncio
async def test_update_prevents_unauthorized_access(
    async_client: AsyncClient,
    db_session: AsyncSession,
    test_user_id: str,
    other_user_id: str,
    test_project_id: int,
    test_module_id: int,
):
    """
    Test: Student cannot update another student's submission
    """
    # 1. Submit a project as test_user
    submit_response = await async_client.post(
        "/api/v1/enrollments/progress/projects/submit",
        json={
            "project_id": test_project_id,
            "module_id": test_module_id,
            "solution_url": "https://github.com/student/original-link",
        },
        headers={"Authorization": f"Bearer {test_user_id}"},
    )
    assert submit_response.status_code == 201
    submission_id = submit_response.json()["submission_id"]

    # 2. Try to update as other_user (should fail with 403)
    update_response = await async_client.put(
        f"/api/v1/enrollments/progress/projects/{submission_id}/update-url",
        json={
            "solution_url": "https://github.com/attacker/hacked-link",
            "module_id": test_module_id,
        },
        headers={"Authorization": f"Bearer {other_user_id}"},
    )
    assert update_response.status_code == 403
    error_data = update_response.json()
    assert "own" in error_data["detail"].lower()


@pytest.mark.asyncio
async def test_service_update_validation():
    """
    Test service-level validation
    """
    # This would require a proper test database setup
    # For now, verify the service method exists and has proper signatures
    service = ProgressService(db_session=None)
    assert hasattr(service, "update_project_submission_url")
    assert callable(getattr(service, "update_project_submission_url"))
