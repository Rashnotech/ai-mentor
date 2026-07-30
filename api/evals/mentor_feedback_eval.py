#!/usr/bin/python3
"""Paid quality eval for the smart-trigger AI mentor's generated messages.

Unlike tests/test_mentor_feedback.py (free, mocked Groq, run on every commit),
this makes real calls to Groq for representative scenarios across all three
triggers and checks the *quality* of the output — not just that a string came
back. Run before ship and nightly, not on every commit.

Usage: python evals/mentor_feedback_eval.py
Requires GROQ_API_KEY to be set (reads from .env like the rest of the app).
"""
import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domains.ai.services import mentor_feedback_service  # noqa: E402

CODE_BLOCK_RE = re.compile(r"```")
HARSH_WORDS = ["stupid", "failure", "bad at this", "you failed", "pathetic", "worthless"]


def check_message(name: str, message: str, min_words: int, max_words: int) -> list[str]:
    """Return a list of failure reasons for this message (empty = all checks passed)."""
    failures = []
    word_count = len(message.split())

    if not message.strip():
        failures.append("empty message")
        return failures
    if word_count < min_words:
        failures.append(f"too short ({word_count} words, expected >= {min_words})")
    if word_count > max_words:
        failures.append(f"too long ({word_count} words, expected <= {max_words})")
    if CODE_BLOCK_RE.search(message):
        failures.append("contains a code block (mentor messages must be plain prose)")
    lowered = message.lower()
    for word in HARSH_WORDS:
        if word in lowered:
            failures.append(f"contains harsh language: '{word}'")
    return failures


async def run_eval() -> bool:
    scenarios = []

    # 1. Quiz correction (score < 50%)
    msg = await mentor_feedback_service.quiz_feedback_text(
        module_title="Python Basics", score_percent=30.0, correct_count=3, total_count=10
    )
    scenarios.append(("quiz_correction (30%)", msg, 15, 130))

    # 2. Quiz encouragement (score >= 50%)
    msg = await mentor_feedback_service.quiz_feedback_text(
        module_title="Async Programming", score_percent=90.0, correct_count=9, total_count=10
    )
    scenarios.append(("quiz_encouragement (90%)", msg, 10, 110))

    # 3. Quiz boundary case (exactly 50% — must be encouragement, not correction)
    msg = await mentor_feedback_service.quiz_feedback_text(
        module_title="SQL Fundamentals", score_percent=50.0, correct_count=5, total_count=10
    )
    scenarios.append(("quiz_boundary (50%)", msg, 10, 110))

    # 4. Project guidance
    msg = await mentor_feedback_service.project_guidance_text(
        project_title="Build a CLI Todo App",
        project_description="A command-line todo list manager with add, complete, and list commands.",
        required_skills=["Python", "argparse", "file I/O"],
    )
    scenarios.append(("project_guidance", msg, 15, 150))

    # 5. Inactivity check-in
    msg = await mentor_feedback_service.checkin_text(user_name="Ada Lovelace")
    scenarios.append(("inactivity_checkin", msg, 10, 100))

    passed = 0
    for name, message, min_words, max_words in scenarios:
        failures = check_message(name, message, min_words, max_words)
        status = "PASS" if not failures else "FAIL"
        if not failures:
            passed += 1
        print(f"{status} {name}")
        print(f"     -> {message!r}")
        for f in failures:
            print(f"     x {f}")

    score = passed / len(scenarios)
    print(f"\nSCORE {score * 100:.0f}% ({passed}/{len(scenarios)})")

    # Pass threshold: allow one scenario to be borderline (e.g. Groq drifts on word
    # count) without failing the whole eval, but quality must hold for the rest.
    return score >= 0.8


if __name__ == "__main__":
    ok = asyncio.run(run_eval())
    sys.exit(0 if ok else 1)
