# Job Readiness Survey - Implementation Guide

## Overview

The **Job Readiness Survey** is a new course-completion survey that triggers automatically when students finish their course enrollment. It collects feedback on:
- Job readiness confidence
- Skill confidence areas
- Next career steps
- Target job roles
- Additional support needed

This helps the platform understand student career readiness and identify where additional mentoring or resources are needed.

## Implementation Details

### Survey Configuration

**Slug:** `job-readiness`  
**Type:** `job_readiness`  
**Trigger:** `course_completion`  
**Priority:** 150 (high priority)  
**Active by default:** Yes

**Questions:**
1. Job readiness rating (scale: Very unprepared → Very prepared)
2. Confidence areas (multi-select: Core concepts, Projects, Problem-solving, etc.)
3. Skill gaps (multi-select: same options as above)
4. Support needed (single-choice: Mock interviews, Portfolio help, Job search tips, Mentorship, Networking)
5. Additional feedback (free text)

### How It Triggers

The survey appears when:
- ✅ Student role is `student`
- ✅ Onboarding is complete (`onboarding_completed = true`)
- ✅ Course enrollment is marked as completed (`completed_at` IS NOT NULL)
- ✅ Completion happened within last **3 days**
- ✅ Survey has not been shown to this student yet (tracked per enrollment)

The survey is **high priority** (priority=150) so it appears before monthly learning feedback.

### Database Schema

The survey uses the existing schema from [api/alembic/versions/e4f5a6b7c8d9_add_learning_surveys.py](../api/alembic/versions/e4f5a6b7c8d9_add_learning_surveys.py):

- **surveys** table: slug, title, survey_type, trigger_type, is_active, priority
- **survey_questions** table: question_key, question_text, question_type, options
- **survey_responses** table: user_id, survey_id, enrollment_id, cycle_key, responses_json
- **user_survey_events** table: user_id, survey_id, status (shown/completed/skipped/dismissed), shown_at, completed_at

No migrations needed - survey is defined in code and auto-seeded.

### Backend Implementation

**Location:** [api/domains/surveys/service.py](../api/domains/surveys/service.py)

**Key method:** `_completion_candidate()` (lines ~280-307)

```python
async def _completion_candidate(
    self,
    user_id: str,
    enrollment: UserCourseEnrollment,
    survey: Optional[Survey],
    now: datetime,
) -> Optional[SurveyCandidate]:
    """Trigger survey when student completes course within 3 days."""
    if survey is None or enrollment.completed_at is None:
        return None
    # Show survey within 3 days of course completion
    days_since_completion = _days_since(enrollment.completed_at, now)
    if days_since_completion > COMPLETION_SURVEY_DAYS:
        return None
    # Only show once per enrollment
    cycle_key = f"completion:{enrollment.enrollment_id}"
    already_shown = await self._cycle_completed(...)
    if already_shown:
        return None
    return SurveyCandidate(
        survey,
        enrollment,
        cycle_key,
        "course_completion",
        urgent=True,  # High priority
    )
```

The method is called in `get_eligible_survey()` before other triggers, ensuring high-priority completion surveys appear first.

### Frontend Implementation

The survey displays via the existing [components/learning-survey-modal.tsx](../components/learning-survey-modal.tsx) component. No changes needed - it handles all survey types generically.

**Survey appears in modal when:**
```typescript
enabled: user?.role === "student" && user.onboarding_completed
```

**Modal submission** updates the survey response and increments next_eligible_at per cooldown rules.

## Verification & Testing

### Quick Manual Check

```bash
# Run diagnostic for a specific student
python api/scripts/survey_diagnostic.py <student_user_id>
```

The diagnostic will show:
- ✅ if `completed_at` is set for their enrollment
- ✅ how many days since completion
- ✅ whether the job survey is eligible

### Seed Survey Data

If surveys aren't appearing, ensure the default templates are seeded:

```python
# In Python shell with app context
from api.domains.surveys.service import SurveyService
from api.db.session import get_session

async def seed():
    async with get_session() as session:
        await SurveyService(session).ensure_default_surveys()
        await session.commit()

asyncio.run(seed())
```

Or check directly:
```sql
SELECT id, slug, title, trigger_type, is_active FROM surveys;
-- Should show job-readiness row with trigger_type='course_completion', is_active=true
```

### End-to-End Test

1. **Enroll a student** in a course via admin panel
2. **Mark course as completed** by setting `enrollment.completed_at = NOW()` (admin API or DB)
3. **Refresh dashboard** → LearningSurveyModal should appear with job readiness survey
4. **Complete survey** → responses saved, survey dismissed
5. **Try to show again** → should not appear (shown status tracked per enrollment)

### Test Coverage

Test files verify:
- Survey only shows for recently completed (< 3 days) courses
- Survey does NOT show for incomplete courses
- Survey does NOT show for old completions (> 3 days)
- Survey appears as high priority when eligible

**Test file:** [tests/job_survey_trigger_test.mjs](../tests/job_survey_trigger_test.mjs)

```bash
python tests/job_survey_trigger_test.mjs
```

## Troubleshooting

### Survey Not Appearing

1. **Check enrollment completion:**
   ```sql
   SELECT enrollment_id, completed_at FROM user_course_enrollments 
   WHERE user_id = '<id>' AND completed_at IS NOT NULL;
   ```
   If NULL, mark course complete in admin panel.

2. **Check if within 3 days:**
   ```sql
   SELECT EXTRACT(DAY FROM NOW() - completed_at) as days_since_completion
   FROM user_course_enrollments WHERE enrollment_id = <id>;
   ```
   If > 3, survey window has closed.

3. **Check if already shown:**
   ```sql
   SELECT * FROM user_survey_events 
   WHERE user_id = '<id>' AND cycle_key LIKE 'completion:%' AND status = 'shown';
   ```
   If found, survey was already displayed and won't appear again.

4. **Check survey is active:**
   ```sql
   SELECT * FROM surveys WHERE slug = 'job-readiness';
   ```
   If `is_active = false`, update: `UPDATE surveys SET is_active = true WHERE slug = 'job-readiness';`

5. **Run diagnostic:**
   ```bash
   python api/scripts/survey_diagnostic.py <student_user_id>
   ```
   Will pinpoint which condition is blocking the survey.

## Integration Points

### Related Systems

- **Enrollment:** [api/domains/courses/models/progress.py](../api/domains/courses/models/progress.py) - `UserCourseEnrollment.completed_at`
- **Survey Display:** [components/learning-survey-modal.tsx](../components/learning-survey-modal.tsx) - handles all survey types
- **Survey API:** [api/domains/surveys/routes.py](../api/domains/surveys/routes.py) - GET `/surveys/eligible`, POST `/surveys/{id}/responses`
- **Analytics:** [app/admin/surveys/page-client.tsx](../app/admin/surveys/page-client.tsx) - view survey responses by type

### Cooldown Rules

After student completes survey:
- **Global cooldown:** 7 days (no survey shown)
- **After close/dismiss:** 5-7 days per dismissal type
- **Per-enrollment:** Shows only once per course completion

## Next Steps

**To activate for all students:**
1. Ensure `ensure_default_surveys()` runs on app startup (already configured)
2. Verify surveys are active in admin panel: `/admin/surveys`
3. Monitor responses in admin analytics: `/admin/surveys` → Responses tab
4. Iterate on questions based on student feedback

**To customize questions:**
1. Go to `/admin/surveys` → Templates
2. Update job-readiness survey questions
3. Changes apply immediately to new surveys

**To track metrics:**
- How many students see the job readiness survey per course
- Which job roles students are targeting
- Which support areas need the most help (mock interviews vs portfolio vs job search)
- Satisfaction trends over time

