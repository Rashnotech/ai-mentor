# Survey Triggering Troubleshooting Guide

## Overview
If surveys aren't triggering (not appearing in the modal), one or more prerequisites aren't being met. Follow this diagnostic flow to identify the root cause.

## Diagnostic Checklist

### Step 1: Verify Frontend Component is Loaded
**What to check:** Browser console for errors, React Query activity

```bash
# In browser DevTools Console, run:
# Check if the modal is mounted
document.querySelector('[data-testid="learning-survey-modal"]') // should exist if mounted

# Check React Query cache (with React Query DevTools installed)
# Should see "learning-survey" query in the cache
```

**If modal not in DOM:**
- Check if student is on dashboard page
- Verify dashboard/layout-client.tsx includes LearningSurveyModal component
- Check for JavaScript errors in console

---

### Step 2: Verify User Authentication State
**Backend SQL:**
```sql
-- Check user profile
SELECT id, user_id, role, onboarding_completed FROM users 
WHERE id = '<student_user_id>';

SELECT * FROM user_profiles WHERE user_id = '<student_user_id>';
```

**Required conditions:**
- ✅ User must have `role = 'student'`
- ✅ User must have `onboarding_completed = true`

**If failing:**
- Student role not assigned: Check auth system
- Onboarding not completed: Student needs to finish onboarding flow first

---

### Step 3: Verify Active Enrollment Exists
**Backend SQL:**
```sql
-- Check active enrollments for this student
SELECT id, enrollment_id, user_id, course_id, enrollment_status, is_active, enrolled_at 
FROM user_course_enrollments 
WHERE user_id = '<student_user_id>' 
  AND is_active = true 
  AND enrollment_status = 'ACTIVE'
ORDER BY enrolled_at DESC;
```

**Required conditions:**
- ✅ Must have at least one enrollment with `is_active = true` AND `enrollment_status = 'ACTIVE'`

**If failing:**
- No active enrollments: Student needs to enroll in a course
- Enrollment inactive: Reactivate via admin or correct enrollment status

---

### Step 4: Verify Surveys Are Seeded and Active
**Backend SQL:**
```sql
-- Check if default surveys exist and are active
SELECT id, slug, title, survey_type, trigger_type, is_active, priority 
FROM surveys 
ORDER BY priority DESC, id;
```

**Required conditions:**
- ✅ Must have 3 default surveys:
  - `learning_experience` (trigger_type: `learning_timeline`)
  - `course_difficulty` (trigger_type: `module_completion`)
  - `support_progress` (trigger_type: `learning_inactivity`)
- ✅ All must have `is_active = true`

**If failing:**
1. **Surveys don't exist:** Run the seed migration
   ```python
   # In Python, run this in the app context:
   from api.domains.surveys.service import SurveyService
   from api.db.session import get_session
   
   async def seed():
       async with get_session() as session:
           await SurveyService(session).ensure_default_surveys()
           await session.commit()
   
   # Or manually insert:
   INSERT INTO surveys (slug, title, survey_type, trigger_type, is_active, priority, created_at)
   VALUES 
     ('learning_experience', 'How is your learning going?', 'feedback', 'learning_timeline', true, 100, NOW()),
     ('course_difficulty', 'Course Difficulty Assessment', 'assessment', 'module_completion', true, 90, NOW()),
     ('support_progress', 'Support & Progress Check', 'support', 'learning_inactivity', true, 80, NOW());
   ```

2. **Surveys exist but is_active = false:** Update them
   ```sql
   UPDATE surveys SET is_active = true WHERE is_active = false;
   ```

---

### Step 5: Check Recent Survey Events (Cooldown Period)
**Backend SQL:**
```sql
-- Check if user recently saw a survey (7-day global cooldown)
SELECT id, user_id, survey_id, status, shown_at, completed_at, next_eligible_at
FROM user_survey_events 
WHERE user_id = '<student_user_id>' 
  AND shown_at IS NOT NULL
ORDER BY shown_at DESC 
LIMIT 5;
```

**Analysis:**
- If `shown_at` is within last **7 days** and status is not "completed":
  - User is in **global survey cooldown**
  - Must wait until 7 days after `shown_at`

**If in cooldown:**
```sql
-- To reset (admin only):
DELETE FROM user_survey_events 
WHERE user_id = '<student_user_id>' 
  AND shown_at IS NOT NULL 
  AND shown_at > NOW() - INTERVAL '7 days';
```

---

### Step 6: Verify Trigger Conditions Met

#### 6a. Learning Timeline Trigger (LEARNING_TIMELINE)
**Trigger:** Student checks in on learning progress after 7 days OR completes 3 lessons

**Backend SQL:**
```sql
-- Check enrollment age
SELECT 
  id, user_id, enrollment_id, course_id, enrolled_at,
  EXTRACT(DAY FROM NOW() - enrolled_at) as days_enrolled
FROM user_course_enrollments
WHERE user_id = '<student_user_id>' AND is_active = true
ORDER BY enrolled_at ASC;

-- Check lesson progress (need 3+ lessons)
SELECT COUNT(*) as total_lessons
FROM lesson_progress
WHERE user_id = '<student_user_id>' AND enrollment_id = <enrollment_id>;
```

**Condition passes if:**
- ✅ Enrolled **7+ days ago** OR completed **3+ lessons**

**If failing:**
- Enrollment is too new (< 7 days): Wait or manually update test enrollment
- Not enough lessons: Complete 3 lessons first

---

#### 6b. Module Completion Trigger (MODULE_COMPLETION)
**Trigger:** Student completes a module or submits a project in last 30 days

**Backend SQL:**
```sql
-- Check recent module completions
SELECT id, user_id, enrollment_id, module_id, progress, updated_at
FROM module_progress
WHERE user_id = '<student_user_id>' AND enrollment_id = <enrollment_id>
  AND updated_at > NOW() - INTERVAL '30 days'
  AND progress >= 1.0;

-- Check recent project submissions
SELECT id, user_id, enrollment_id, project_id, submitted_at, reviewed_at
FROM project_submissions
WHERE user_id = '<student_user_id>' AND enrollment_id = <enrollment_id>
  AND submitted_at > NOW() - INTERVAL '30 days';
```

**Condition passes if:**
- ✅ Has module completion **in last 30 days** OR
- ✅ Has project submission **in last 30 days**

**If failing:**
- No recent activity: Student needs to complete a module or submit a project first

---

#### 6c. Learning Inactivity Trigger (LEARNING_INACTIVITY)
**Trigger:** Student has been inactive 10+ days OR underperforming after day 14

**Backend SQL:**
```sql
-- Check last activity (lesson or module progress)
SELECT MAX(updated_at) as last_activity
FROM (
  SELECT updated_at FROM lesson_progress WHERE user_id = '<student_user_id>'
  UNION ALL
  SELECT updated_at FROM module_progress WHERE user_id = '<student_user_id>'
) as activity;

-- Calculate inactivity days
SELECT 
  EXTRACT(DAY FROM NOW() - <last_activity>) as inactivity_days;

-- Check enrollment age and completion percentage
SELECT 
  enrolled_at,
  EXTRACT(DAY FROM NOW() - enrolled_at) as days_enrolled,
  ROUND(total_progress::numeric / 100, 2) as completion_percent
FROM user_course_enrollments
WHERE user_id = '<student_user_id>' AND is_active = true;
```

**Condition passes if:**
- ✅ Inactive **10+ days** OR
- ✅ After day 14 of enrollment with **<50% progress**

**If failing:**
- Student still active (< 10 days inactive): Keep learning or wait
- Student under 14 days with poor progress: Either improve or wait until day 14+

---
### Step 6b. Course Completion Trigger (COURSE_COMPLETION) [NEW]
**Trigger:** Student completes a course

**Backend SQL:**
```sql
-- Check if course is marked as completed
SELECT id, enrollment_id, user_id, course_id, enrollment_status, is_active, completed_at
FROM user_course_enrollments
WHERE user_id = '<student_user_id>' 
  AND is_active = true 
  AND completed_at IS NOT NULL;
```

**Condition passes if:**
- ✅ Enrollment has `completed_at` set (not NULL)
- ✅ Completion is within last **3 days** (recent)

**If failing:**
- Course not marked complete: Mark in admin panel or via API
- Completion too old (> 3 days): Survey only shows within 3 days of completion

---
## Step 7: Test API Endpoint Directly

**Use curl or Postman:**
```bash
# Assumes you're authenticated; add Authorization header
curl -X GET http://localhost:3000/api/v1/surveys/eligible \
  -H "Authorization: Bearer <student_token>"

# Expected responses:
# Success: { "survey": { "id": 1, "title": "...", "questions": [...] } }
# No eligible survey: { "survey": null }
```

**Backend logs to check:**
```python
# In api logs, look for:
# ✅ "survey_eligible user_id=... survey_id=... reason=..."
# ❌ No log entry means eligibility check failed early (role/onboarding/enrollment/surveys)
```

---

## Step 8: Debug Frontend Query

**In browser console (with React Query DevTools):**
```javascript
// Manually trigger the query
const queryClient = window.__REACT_QUERY_DEVTOOLS_MOUNT__?.queryClient;
await queryClient.refetchQueries({ queryKey: ["learning-survey", "eligible"] });

// Check the result
const data = queryClient.getQueryData(["learning-survey", "eligible"]);
console.log(data); // Should show survey object or null
```

**If query returns null when API returns survey:**
- React Query cache issue: Clear cache and refresh page
- Query key mismatch: Verify queryKey matches between hook and API response

---

## Common Causes & Solutions

| Cause | Symptom | Solution |
|-------|---------|----------|
| User not student role | API returns null | Check auth/role assignment |
| Onboarding incomplete | API returns null | Complete onboarding first |
| No active enrollment | API returns null | Enroll in a course |
| Surveys not seeded | API returns null | Run `ensure_default_surveys()` |
| Surveys inactive | API returns null | Set `is_active = true` |
| In cooldown period | API returns null | Wait 7 days or manually reset |
| Trigger not satisfied | API returns null | Meet trigger conditions (below) |
| First enrollment too new | Waiting for trigger | Wait 7 days from enrollment |
| No lesson progress | Trigger not met | Complete 3+ lessons |
| No module completion | Trigger not met | Complete a module or submit project |
| Too recently active | Trigger not met | Wait for inactivity |
| Modal not in DOM | Nothing displays | Check dashboard mount, JS errors |
| Query returns null | Modal doesn't show | Check API endpoint, cooldown status |

---

## Quick Debug Script

Run this in a Python shell connected to the database:

```python
# For debugging a specific student
import asyncio
from sqlalchemy import select
from api.db.models import User, UserProfile, UserCourseEnrollment, Survey, UserSurveyEvent
from api.db.session import SessionLocal
from api.domains.surveys.service import SurveyService

async def debug_survey_eligibility(user_id: str):
    async with SessionLocal() as session:
        # Check user
        user = await session.execute(
            select(User).where(User.id == user_id)
        )
        user_obj = user.scalar_one_or_none()
        print(f"User: {user_obj.email if user_obj else 'NOT FOUND'}")
        print(f"  Role: {user_obj.role if user_obj else 'N/A'}")
        
        # Check profile
        profile = await session.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        )
        profile_obj = profile.scalar_one_or_none()
        print(f"  Onboarding completed: {profile_obj.onboarding_completed if profile_obj else 'N/A'}")
        
        # Check enrollments
        enrollments = await session.execute(
            select(UserCourseEnrollment).where(UserCourseEnrollment.user_id == user_id)
        )
        enroll_list = enrollments.scalars().all()
        print(f"  Active enrollments: {len([e for e in enroll_list if e.is_active])}")
        for e in enroll_list[:3]:
            print(f"    - Course {e.course_id}: status={e.enrollment_status}, active={e.is_active}")
        
        # Check surveys
        surveys = await session.execute(select(Survey))
        survey_list = surveys.scalars().all()
        print(f"  Active surveys: {len([s for s in survey_list if s.is_active])}")
        
        # Check events
        events = await session.execute(
            select(UserSurveyEvent).where(UserSurveyEvent.user_id == user_id)
                .order_by(UserSurveyEvent.shown_at.desc()).limit(3)
        )
        event_list = events.scalars().all()
        print(f"  Recent survey events: {len(event_list)}")
        for e in event_list:
            print(f"    - Survey {e.survey_id}: status={e.status}, shown={e.shown_at}")
        
        # Get eligible survey
        eligible = await SurveyService(session).get_eligible_survey(user_id, user_obj.role if user_obj else "")
        print(f"\n✅ ELIGIBLE SURVEY: {eligible}")

# Run it
asyncio.run(debug_survey_eligibility("<student_user_id>"))
```

---

## Next Steps

1. **Identify the failure point** using Steps 1-7 above
2. **Verify the fix** by checking the API endpoint again
3. **Test end-to-end**: Load dashboard, verify modal appears
4. **Repeat for other students** to ensure it's not environment-specific

