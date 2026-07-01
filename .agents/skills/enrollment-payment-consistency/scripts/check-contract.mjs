import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  payment: await readFile("api/domains/payments/service.py", "utf8"),
  auth: await readFile("api/domains/users/routes/auth.py", "utf8"),
  course: await readFile("app/courses/[id]/page-client.tsx", "utf8"),
  callback: await readFile("app/payment/callback/page-client.tsx", "utf8"),
  guard: await readFile("lib/auth-context.tsx", "utf8"),
}

assert.match(files.payment, /LearningPath\.course_id == course_id/)
assert.match(files.payment, /await self\._complete_self_paced_onboarding\(/)
assert.match(files.payment, /selected_course_id != course_id/)
assert.match(files.auth, /"onboarding_completed": user\.get\("onboarding_completed", False\)/)
assert.match(files.course, /pathId=\{selectedPath\?\.path_id\}/)
assert.match(files.callback, /await refreshUser\(\)/)
assert.match(files.guard, /"\/payment\/callback"/)

console.log("Enrollment/payment contract: PASS (7/7)")
