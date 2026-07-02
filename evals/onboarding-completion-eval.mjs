import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = {
  model: await readFile("api/domains/users/models/onboarding.py", "utf8"),
  service: await readFile("api/domains/users/services/onboarding_service.py", "utf8"),
  auth: await readFile("api/domains/users/routes/auth.py", "utf8"),
  page: await readFile("app/onboarding/page-client.tsx", "utf8"),
  guard: await readFile("lib/auth-context.tsx", "utf8"),
  api: await readFile("lib/api.ts", "utf8"),
  store: await readFile("lib/stores/user-store.ts", "utf8"),
  login: await readFile("app/login/login-client.tsx", "utf8"),
}

const checks = [
  ["canonical database field exists", source.model.includes("onboarding_completed = Column(Boolean")],
  ["completion persists true", source.service.includes("profile.onboarding_completed = True")],
  ["completion transaction commits", source.service.includes("await self.db_session.commit()")],
  ["legacy active enrollment reconciles", source.service.includes("reconcile_completed_profile") && source.service.includes("EnrollmentStatus.ACTIVE")],
  ["auth responses synchronize durable status", (source.auth.match(/_sync_student_onboarding/g) || []).length >= 4],
  ["goal update cannot race completion", source.page.includes("await updateGoalMutation.mutateAsync(selectedGoal)")],
  ["completion updates cached status", source.page.includes("updateUser({ onboarding_completed: result.user.onboarding_completed })")],
  ["completion refreshes current user", source.page.includes("await refreshUser()")],
  ["completion replaces route", source.page.includes('router.replace("/dashboard")')],
  ["refresh synchronizes persisted auth", source.guard.includes("hasSyncedCurrentUser")],
  ["completed users cannot revisit onboarding", source.guard.includes('pathname.startsWith("/onboarding")')],
  ["field name is consistent", source.api.includes("onboarding_completed: boolean") && source.store.includes("onboarding_completed: boolean")],
  ["returning user keeps intended destination", source.login.includes('sessionStorage.getItem("auth_redirect")')],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Onboarding completion eval must pass every acceptance check")
