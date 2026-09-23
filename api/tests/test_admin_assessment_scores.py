"""Regression tests for admin module assessment score aggregation."""
import sys
from pathlib import Path
from types import SimpleNamespace
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domains.users.routes.admin import _serialize_module_assessment_score  # noqa: E402


class AdminAssessmentScoreTests(unittest.TestCase):
    def test_score_is_weighted_and_only_complete_quizzes_receive_percent(self):
        module = SimpleNamespace(module_id=4, title="Functions", order=2)
        questions = [
            SimpleNamespace(question_id=1, points=10),
            SimpleNamespace(question_id=2, points=30),
        ]
        responses = {
            1: SimpleNamespace(is_correct=True),
            2: SimpleNamespace(is_correct=False),
        }

        result = _serialize_module_assessment_score(module, questions, responses)

        self.assertEqual(result["answered_questions"], 2)
        self.assertEqual(result["correct_questions"], 1)
        self.assertEqual(result["score_percent"], 25.0)

    def test_incomplete_quiz_has_no_final_score(self):
        module = SimpleNamespace(module_id=4, title="Functions", order=2)
        questions = [
            SimpleNamespace(question_id=1, points=10),
            SimpleNamespace(question_id=2, points=10),
        ]

        result = _serialize_module_assessment_score(
            module,
            questions,
            {1: SimpleNamespace(is_correct=True)},
        )

        self.assertEqual(result["answered_questions"], 1)
        self.assertIsNone(result["score_percent"])


if __name__ == "__main__":
    unittest.main()
