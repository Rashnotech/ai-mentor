# Automatic learning surveys

## Measurable outcome

Eligible, onboarded students receive at most one normal check-in in seven days. Every display decision, dismissal, skip, and completion is persisted. Admins can measure response volume, learning satisfaction, difficulty, common issues, complaint concentration, and mentor-support demand.

## Data flow

1. The student dashboard requests `GET /api/v1/surveys/eligible` once per authenticated session view.
2. The backend verifies the student role, completed onboarding, active enrollment, timing/progress signals, prior cycles, and cooldowns.
3. If eligible, the backend records a `shown` event before returning one survey.
4. The modal submits the returned `cycle_key` with its answers, or records Close/Maybe later.
5. Submission stores `survey_responses` and marks the matching event completed in one transaction.
6. Refresh, logout/login, and new browser sessions re-evaluate the persisted database state.

## Tables

- `surveys`: editable templates and trigger configuration.
- `survey_questions`: ordered questions with validated type and options.
- `survey_responses`: answers linked to user, course, path, enrollment, module, and cycle.
- `user_survey_events`: shown/completed/skipped/dismissed history and the next eligible time.

Both responses and events have a unique `(user_id, survey_id, enrollment_id, cycle_key)` contract.

## Eligibility rules

| Trigger | Rule | Cycle |
| --- | --- | --- |
| First learning check-in | Enrollment is at least 7 days old or 3 lessons are complete | Once per enrollment before day 30 |
| Monthly feedback | Every 30 days from enrollment | Enrollment plus cycle number |
| Course difficulty | Module completion evidence or a project submission within 30 days | Enrollment plus module |
| Support/progress | No progress for 10 days, or actual progress trails expected progress after day 14 | Enrollment plus 14-day period |

Normal surveys respect a seven-day global frequency cap. Fourteen days of inactivity is treated as urgent support and may bypass that cap. A Close action waits five days; Maybe later waits seven days. A passive shown event waits three days, covering refreshes or closed browser tabs.

## Default templates

The API seeds three templates on startup when their slugs do not exist:

- Learning experience
- Course difficulty
- Support/progress

Each popup contains three or four questions. Admin edits are retained across restarts.

## Admin workflow

Open `/admin/surveys` to:

- activate or deactivate templates;
- create a survey with its first question;
- edit template timing category and priority;
- add, edit, reorder, or remove questions, up to five;
- filter responses by course ID, path ID, month, survey type, and support need;
- view ratings, common issues, monthly satisfaction, support requests, and courses/modules with complaints.

## Deployment

From `api/`:

```powershell
alembic upgrade head
uvicorn app:app --host 0.0.0.0 --port 8000
```

From the repository root:

```powershell
npm.cmd run build
npm.cmd run start
```

## Verification

```powershell
npm.cmd run typecheck:gate
npm.cmd run test:gate
npm.cmd run eval
npm.cmd run build
```

When Python is available:

```powershell
cd api
python -m unittest tests.test_learning_surveys
alembic heads
alembic upgrade head
```

Manual acceptance test:

1. Use an onboarded student with an active enrollment less than seven days old. `/surveys/eligible` returns null.
2. Move the enrollment timestamp past seven days in a non-production database. The endpoint returns one survey and creates a shown event.
3. Close it. Confirm `status=dismissed` and `next_eligible_at` is five days later.
4. Make it eligible again, submit valid answers with its `cycle_key`, and confirm one response plus a completed event.
5. Refresh and log out/in. The completed cycle stays hidden.
6. Open `/admin/surveys`, find the response, filter it, and confirm support answers receive the Needs support label.

## Failure boundaries

- Without an active enrollment, eligibility returns null.
- Without completed onboarding, eligibility returns null.
- Invalid, unknown, missing required, or out-of-option answers return HTTP 400.
- A response without a currently shown matching cycle returns HTTP 404.
- Concurrent duplicate submissions are rejected by the database uniqueness constraint.
- If dismissal fails over the network, the already-recorded shown event still suppresses the modal for three days.
