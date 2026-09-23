# Project Link Update Restriction - Implementation Summary

## Overview
Implemented feature that restricts students from updating project submission links after the project has been reviewed by a mentor/admin. This ensures the integrity of submissions and prevents post-review link modifications for corrections.

## Business Logic
- **Before Review**: Students can update project submission links freely while `reviewed_at` is NULL
- **After Review**: Once `reviewed_at` is set (mentor/admin has reviewed), the link becomes locked and cannot be updated
- **Error Response**: 403 Forbidden with message "Cannot update submission after it has been reviewed"

## Backend Changes

### 1. Service Layer (`api/domains/courses/services/progress_service.py`)

**New Method**: `update_project_submission_url()`
```python
async def update_project_submission_url(
    self,
    submission_id: int,
    new_solution_url: str,
    user_id: str,
) -> ProjectSubmission:
```

**Validation**:
- Checks if submission exists (404 if not found)
- Verifies user owns the submission (403 if not)
- Checks if `reviewed_at` is set (403 if already reviewed)
- Updates `solution_url` on the submission

**Error Codes**:
- `SUBMISSION_NOT_FOUND` (404)
- `UNAUTHORIZED_UPDATE` (403) - user doesn't own submission
- `SUBMISSION_ALREADY_REVIEWED` (403) - already reviewed

### 2. API Route (`api/domains/courses/routes/student.py`)

**New Endpoint**: `PUT /enrollments/progress/projects/{submission_id}/update-url`

```python
@progress_router.put(
    "/projects/{submission_id}/update-url",
    response_model=ProjectSubmissionResponse,
    status_code=status.HTTP_200_OK,
)
async def update_project_submission_url(
    submission_id: int,
    request: ProjectSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db_session),
):
```

**Response**: Returns `ProjectSubmissionResponse` with updated submission data

### 3. API Response Enhancement

**Modified**: `GET /enrollments/courses/by-slug/{slug}/learning-content`

Added new fields to project objects in response:
- `submission_id: int | null` - Needed to identify submission for updates
- `module_id: int` - Module context for update requests

## Frontend Changes

### 1. Type Updates (`lib/api.ts`)

**Enhanced ProjectContent Interface**:
```typescript
export interface ProjectContent {
  submission_id: number | null  // NEW: for updating
  module_id: number             // NEW: for update context
  // ... existing fields
}
```

### 2. API Client (`lib/api.ts`)

**New Method in studentCoursesApi**:
```typescript
updateProjectSubmissionUrl: async (
  submissionId: number,
  solutionUrl: string,
  moduleId: number
): Promise<any>
```

Calls: `PUT /enrollments/progress/projects/{submissionId}/update-url`

### 3. Student Project View (`app/courses/[id]/learn/page-client.tsx`)

**New State**:
- `isEditing: boolean` - Controls edit form visibility
- `editValue: string` - Holds edited URL value
- `isUpdating: boolean` - Loading state during update

**New Handler**:
- `handleUpdateUrl()` - Calls API and handles success/error

**New UI Elements**:
1. **Lock Message** - Shows when `reviewed_at` is set:
   > "This submission has been reviewed and cannot be updated."

2. **Edit Section** - Only shown if `!reviewed_at && is_submitted`:
   - Display mode: "Need to fix something?" + "Edit Link" button
   - Edit mode: URL input field + "Update Link" + "Cancel" buttons

3. **Status Card Update** - Enhanced to show review lock status

## Database
No database schema changes needed - uses existing `reviewed_at` field on `ProjectSubmission` table.

The `reviewed_at` field is set when mentor/admin calls:
- `approve_project_submission()` 
- `reject_project_submission()`

## Error Handling

### API Response (403)
```json
{
  "detail": "Cannot update submission after it has been reviewed. Please wait for feedback or contact your mentor.",
  "error_code": "SUBMISSION_ALREADY_REVIEWED"
}
```

### UI Toast Notifications
- **Success**: "Project link updated successfully!"
- **Error**: Shows backend error detail message

## Security Considerations
1. **Ownership Validation**: User must own the submission to update it
2. **Review Lock**: Once reviewed_at is set, link is immutable
3. **Authorization**: Requires authenticated student user

## Testing

### Test Files Created
1. `tests/test_project_update_restriction.py` - Unit/integration tests
2. `tests/project-update-restriction.mjs` - JavaScript test harness

### Test Scenarios
1. ✓ Update before review (should succeed)
2. ✓ Update after approval (should fail with 403)
3. ✓ Update after rejection (should fail with 403)
4. ✓ Ownership validation (should fail for different user)
5. ✓ Non-existent submission (should fail with 404)

## Deployment Notes
- No database migrations needed
- New endpoint is backward compatible
- No breaking changes to existing APIs
- Can be rolled out independently

## Usage Example

```typescript
// Student wants to update their submission URL
try {
  const response = await studentCoursesApi.updateProjectSubmissionUrl(
    submissionId: 123,
    solutionUrl: "https://github.com/newuser/updated-project",
    moduleId: 5
  )
  // Success - URL updated
} catch (error) {
  if (error.status === 403) {
    // Project already reviewed - cannot update
  }
}
```

## Files Modified
1. ✓ `api/domains/courses/services/progress_service.py` - Service method
2. ✓ `api/domains/courses/routes/student.py` - API endpoint + response data
3. ✓ `lib/api.ts` - Types and API client methods
4. ✓ `app/courses/[id]/learn/page-client.tsx` - UI components and handlers
5. ✓ `tests/test_project_update_restriction.py` - Integration tests
6. ✓ `tests/project-update-restriction.mjs` - JavaScript tests
