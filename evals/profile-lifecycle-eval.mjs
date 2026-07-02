import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const sources = {
  service: await readFile("api/domains/users/services/onboarding_service.py", "utf8"),
  route: await readFile("api/domains/users/routes/onboarding.py", "utf8"),
  login: await readFile("app/login/login-client.tsx", "utf8"),
  oauthProvider: await readFile("app/auth/[provider]/callback/callback-client.tsx", "utf8"),
  oauthCallback: await readFile("app/auth/callback/callback-client.tsx", "utf8"),
}

const checks = [
  ["missing profile is initialized", sources.service.includes("profile = await self.create_user_profile(user_id)")],
  ["concurrent initialization is idempotent", sources.service.includes("except IntegrityError:")],
  ["profile GET self-heals", sources.route.includes("profile = await service.start_onboarding")],
  ["update and completion self-heal", (sources.service.match(/profile = await self\.start_onboarding\(user_id\)/g) || []).length >= 2],
  ["password login initializes profile", sources.login.includes("const profile = await onboardingApi.start()")],
  ["provider OAuth initializes profile", sources.oauthProvider.includes("const profile = await onboardingApi.start()")],
  ["generic OAuth initializes profile", sources.oauthCallback.includes("const profile = await onboardingApi.start()")],
  ["OAuth tokens precede profile request", [sources.oauthProvider, sources.oauthCallback].every((source) => source.indexOf("storeAuthData(authData)") < source.indexOf("onboardingApi.start()"))],
  ["missing profile is not treated as completed", [sources.oauthProvider, sources.oauthCallback].every((source) => source.includes("onboardingCompleted = false"))],
  ["profile initialization is traceable", sources.service.includes("Onboarding profile ensured user=%s initially_present=%s")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.ok(score >= 0.9, "Profile lifecycle eval must score at least 90%")
