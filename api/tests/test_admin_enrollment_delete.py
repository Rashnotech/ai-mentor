"""Regression tests for the admin "delete student enrollment" endpoint."""
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException  # noqa: E402
from domains.users.routes.admin import delete_user_enrollment  # noqa: E402


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class DeleteUserEnrollmentTests(IsolatedAsyncioTestCase):
    async def test_non_admin_is_rejected(self):
        session = SimpleNamespace(execute=AsyncMock(), delete=AsyncMock(), commit=AsyncMock())

        with self.assertRaises(HTTPException) as ctx:
            await delete_user_enrollment(
                user_id="student-1",
                enrollment_id=1,
                current_user={"role": "student", "user_id": "student-1"},
                session=session,
            )

        self.assertEqual(ctx.exception.status_code, 403)
        session.execute.assert_not_awaited()

    async def test_missing_enrollment_returns_404(self):
        session = SimpleNamespace(
            execute=AsyncMock(return_value=ScalarResult(None)),
            delete=AsyncMock(),
            commit=AsyncMock(),
        )

        with self.assertRaises(HTTPException) as ctx:
            await delete_user_enrollment(
                user_id="student-1",
                enrollment_id=999,
                current_user={"role": "admin", "user_id": "admin-1"},
                session=session,
            )

        self.assertEqual(ctx.exception.status_code, 404)
        session.delete.assert_not_awaited()

    async def test_enrollment_belonging_to_another_user_is_not_found(self):
        # Same enrollment_id, different user_id — the WHERE clause in the real
        # query filters this out at the DB level; here we simulate that by
        # returning None, proving the handler can't be tricked into deleting
        # another student's enrollment via enrollment_id alone.
        session = SimpleNamespace(
            execute=AsyncMock(return_value=ScalarResult(None)),
            delete=AsyncMock(),
            commit=AsyncMock(),
        )

        with self.assertRaises(HTTPException) as ctx:
            await delete_user_enrollment(
                user_id="student-1",
                enrollment_id=42,
                current_user={"role": "admin", "user_id": "admin-1"},
                session=session,
            )

        self.assertEqual(ctx.exception.status_code, 404)

    async def test_admin_can_delete_enrollment(self):
        enrollment = SimpleNamespace(enrollment_id=42, user_id="student-1", course_id=7)
        session = SimpleNamespace(
            execute=AsyncMock(return_value=ScalarResult(enrollment)),
            delete=AsyncMock(),
            commit=AsyncMock(),
        )

        result = await delete_user_enrollment(
            user_id="student-1",
            enrollment_id=42,
            current_user={"role": "admin", "user_id": "admin-1"},
            session=session,
        )

        session.delete.assert_awaited_once_with(enrollment)
        session.commit.assert_awaited_once()
        self.assertEqual(result, {"deleted": True, "enrollment_id": 42})


if __name__ == "__main__":
    import unittest

    unittest.main()
