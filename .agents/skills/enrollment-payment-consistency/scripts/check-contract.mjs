import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  payment: await readFile("api/domains/payments/service.py", "utf8"),
  auth: await readFile("api/domains/users/routes/auth.py", "utf8"),
  course: await readFile("app/courses/[id]/page-client.tsx", "utf8"),
  callback: await readFile("app/payment/callback/page-client.tsx", "utf8"),
  guard: await readFile("lib/auth-context.tsx", "utf8"),
  enrollment: await readFile("api/domains/courses/services/enrollment_service.py", "utf8"),
  studentRoutes: await readFile("api/domains/courses/routes/student.py", "utf8"),
  paymentSchema: await readFile("api/domains/payments/schemas.py", "utf8"),
  apiTypes: await readFile("lib/api.ts", "utf8"),
  paymentModal: await readFile("components/payment-modal.tsx", "utf8"),
}

assert.match(files.payment, /LearningPath\.course_id == course_id/)
assert.match(files.payment, /await self\._complete_self_paced_onboarding\(/)
assert.match(files.payment, /selected_course_id != course_id/)
assert.match(files.auth, /"onboarding_completed": user\.get\("onboarding_completed", False\)/)
assert.match(files.course, /pathId=\{selectedPath\?\.path_id\}/)
assert.match(files.callback, /await refreshUser\(\)/)
assert.match(files.guard, /"\/payment\/callback"/)
assert.match(files.payment, /_build_existing_access_response/)
assert.match(files.payment, /Existing successful payment found\. Course access granted\./)
assert.match(files.payment, /"checkout_link": None/)
assert.doesNotMatch(files.payment, /error_code="ALREADY_ENROLLED"/)
assert.match(files.paymentSchema, /checkout_link: Optional\[str\] = None/)
assert.match(files.apiTypes, /checkout_link\?: string \| null/)
assert.match(files.paymentModal, /data\.status === "active" \|\| !data\.checkout_link/)
assert.match(files.enrollment, /select\(UserCourseEnrollment\)/)
assert.match(files.enrollment, /active_enrollments/)
assert.match(files.enrollment, /enrollment: Optional\[UserCourseEnrollment\] = None/)
assert.match(files.studentRoutes, /UserCourseEnrollment\.course_id == course_id/)
assert.match(files.studentRoutes, /UserCourseEnrollment\.course_id == course\.course_id/)

console.log("Enrollment/payment contract: PASS (19/19)")
