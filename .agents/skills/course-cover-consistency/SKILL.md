---
name: course-cover-consistency
description: Verify course cover URL persistence and rendering across admin forms, API responses, and public cards in ai-mentor.
---

Use when a course cover disappears after save, edit, or reload.

1. Identify the surface losing the URL.
2. Inspect admin create and update payload builders.
3. Verify edit initialization restores the URL and exposes an input.
4. Preserve omitted update values; use empty string or null to clear.
5. Trace the existing database column before considering migrations.
6. Check all three course response schemas.
7. Check every admin and public response constructor, including slug and brief routes.
8. Verify cards render the returned URL with missing/broken-image fallback.
9. Run `node tests/course-cover-contract.mjs`, `node evals/course-cover-eval.mjs`, `python -m unittest discover -s api/tests -p test_course_cover_images.py -v`, `python api/evals/course_cover_images_eval.py`, and the gate typecheck.
10. Report verification limits. Mocked handler checks do not prove database or HTTP integration. See `api/domains/courses/COVER_IMAGES.md` for contract details and restart commands.
