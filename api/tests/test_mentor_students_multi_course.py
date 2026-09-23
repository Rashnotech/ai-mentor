"""Regression coverage for mentor visibility across multiple courses."""
from pathlib import Path
import unittest


ROUTE_SOURCE = (
    Path(__file__).resolve().parents[1]
    / "domains"
    / "courses"
    / "routes"
    / "admin.py"
).read_text(encoding="utf-8")

STUDENT_PAGE_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "app"
    / "mentor"
    / "my-students"
    / "page-client.tsx"
).read_text(encoding="utf-8")


class MentorStudentsMultiCourseTests(unittest.TestCase):
    def test_deduplication_is_scoped_to_student_and_course(self):
        self.assertIn("seen_student_courses = set()", ROUTE_SOURCE)
        self.assertIn("student_course_key = (user.id, course.course_id)", ROUTE_SOURCE)
        self.assertIn("student_course_key = (user.id, enrollment.course_id)", ROUTE_SOURCE)
        self.assertNotIn("seen_user_ids = set()", ROUTE_SOURCE)

    def test_student_rows_have_unique_course_scoped_react_keys(self):
        self.assertEqual(STUDENT_PAGE_SOURCE.count('key={`${student.id}-${student.course_id}`}'), 2)


if __name__ == "__main__":
    unittest.main()