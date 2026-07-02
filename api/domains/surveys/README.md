# Learning survey service

This domain owns survey templates, eligibility, response validation, cooldowns, and admin analytics. The frontend never calculates eligibility.

## Contract

- `GET /api/v1/surveys/eligible` returns one due survey or `{"survey": null}`.
- `POST /api/v1/surveys/{id}/responses` accepts the server-issued `cycle_key` and answers.
- `POST /api/v1/surveys/{id}/dismiss` records `dismissed` or `skipped`.
- `/api/v1/admin/surveys/**` provides template/question management, filtered responses, and analytics.

`cycle_key` identifies one enrollment period or milestone. Database uniqueness constraints prevent duplicate completion for the same student, survey, enrollment, and cycle.

## Timing

- First check-in: seven days after enrollment or three completed lessons.
- Monthly: each 30-day enrollment cycle.
- Difficulty: completed module lessons, module progress completion, or project submission.
- Support: ten days without learning progress, or progress materially below the enrollment schedule after 14 days.
- Global cap: seven days between normal surveys.
- Urgent support: 14 days of inactivity can bypass the global cap.
- Close: five-day cooldown. Maybe later: seven-day cooldown.

The `survey_eligible`, `survey_completed`, `survey_dismissed`, and `survey_skipped` log events provide an operational trace.

## Startup

`SurveyService.ensure_default_surveys()` creates the three default templates once. Existing templates and admin edits are never overwritten.

Apply `e4f5a6b7c8d9_add_learning_surveys.py` before starting the API.
