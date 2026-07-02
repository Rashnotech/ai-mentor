import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  authRoute: await readFile("api/domains/users/routes/auth.py", "utf8"),
  onboardingService: await readFile("api/domains/users/services/onboarding_service.py", "utf8"),
  onboardingPage: await readFile("app/onboarding/page-client.tsx", "utf8"),
  loginPage: await readFile("app/login/login-client.tsx", "utf8"),
  authContext: await readFile("lib/auth-context.tsx", "utf8"),
  api: await readFile("lib/api.ts", "utf8"),
  store: await readFile("lib/stores/user-store.ts", "utf8"),
}

assert.match(files.onboardingService, /profile\.onboarding_completed = True/)
assert.match(files.onboardingService, /await self\.db_session\.commit\(\)/)
assert.match(files.onboardingService, /reconcile_completed_profile/)
assert.match(files.authRoute, /user = await _sync_student_onboarding\(user, user_service\)/)
assert.ok((files.authRoute.match(/_sync_student_onboarding/g) || []).length >= 4)
assert.match(files.onboardingPage, /await updateGoalMutation\.mutateAsync\(selectedGoal\)/)
assert.match(files.onboardingPage, /updateUser\(\{ onboarding_completed: result\.user\.onboarding_completed \}\)/)
assert.match(files.onboardingPage, /await refreshUser\(\)/)
assert.match(files.onboardingPage, /router\.replace\("\/dashboard"\)/)
assert.match(files.authContext, /hasSyncedCurrentUser/)
assert.match(files.authContext, /pathname\.startsWith\("\/onboarding"\)/)
assert.match(files.api, /onboarding_completed: boolean/)
assert.match(files.store, /onboarding_completed: boolean/)
assert.match(files.loginPage, /sessionStorage\.getItem\("auth_redirect"\)/)

console.log("Onboarding completion contract: PASS (14/14)")
