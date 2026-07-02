import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  service: await readFile("api/domains/users/services/onboarding_service.py", "utf8"),
  route: await readFile("api/domains/users/routes/onboarding.py", "utf8"),
  login: await readFile("app/login/login-client.tsx", "utf8"),
  oauthProvider: await readFile("app/auth/[provider]/callback/callback-client.tsx", "utf8"),
  oauthCallback: await readFile("app/auth/callback/callback-client.tsx", "utf8"),
}

assert.match(files.service, /except IntegrityError:/)
assert.ok((files.service.match(/profile = await self\.start_onboarding\(user_id\)/g) || []).length >= 2)
assert.match(files.route, /profile = await service\.start_onboarding\(current_user\.get\("user_id"\)\)/)
assert.doesNotMatch(files.route + files.service, /User profile not found/)
assert.match(files.login, /const profile = await onboardingApi\.start\(\)/)
assert.doesNotMatch(files.login, /onboarding_completed !== undefined/)
for (const source of [files.oauthProvider, files.oauthCallback]) {
  assert.match(source, /const profile = await onboardingApi\.start\(\)/)
  assert.ok(source.indexOf("storeAuthData(authData)") < source.indexOf("onboardingApi.start()"))
}

console.log("Profile lifecycle contract: PASS (10/10)")
