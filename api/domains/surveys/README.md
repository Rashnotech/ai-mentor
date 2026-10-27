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

`SurveyService.ensure_default_surveys()` creates the four default templates once. Existing templates and admin edits are never overwritten.

Apply `e4f5a6b7c8d9_add_learning_surveys.py` before starting the API.


## Default-template regression checks

The defaults are `learning-experience` (learning timeline), `course-difficulty` (module completion), `support-progress` (inactivity), and `job-readiness` (course completion). The gate reads only the literal `DEFAULT_SURVEYS` declaration using Python's standard-library AST parser, without importing FastAPI or connecting to a database. It checks each slug, survey type, trigger, and nonempty questions, and rejects duplicate or missing templates. Unrelated dictionaries and source formatting do not affect the check.

Run `node tests/learning-survey-contract.mjs` and `node evals/learning-survey-eval.mjs` from the repository root. Python must be on PATH; set the `PYTHON` environment variable to select another executable. The deterministic eval mutates the registry to verify rejected regressions and accepts equivalent formatting, reordered defaults, and unrelated slug dictionaries. Its pass threshold is 100%. These commands also run in `npm run test:gate` and `npm run eval`.

This repairs a stale test contract, not runtime survey behavior. No migration or service restart is required.

The migration gate requires one Alembic head and the survey migration in its ancestry. Later migrations may advance the head without changing this contract. Eval scenarios reject branching heads, a missing survey migration, and disconnected survey history.
