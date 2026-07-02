# Enrollment, payment, and public discovery contract

## Outcomes

- Every password and OAuth student login initializes a missing onboarding profile before redirecting.
- `/onboarding/profile`, onboarding updates, and completion self-heal legacy accounts without a `user_profiles` row.
- A verified payment for the self-paced course selected during onboarding persists `onboarding_completed=true` before commit.
- Login and payment callback flows reload that durable value instead of trusting stale browser state.
- Payment initiation prices only a learning path owned by the requested course.
- Public course pages expose server-rendered data, canonical metadata, Course JSON-LD, a sitemap, and crawler rules.

## Evidence

`PaymentService._activate_enrollment` logs `enrollment`, `payment_ref`, and `onboarding_completed`. This lets operations distinguish gateway success, enrollment activation, and onboarding completion without logging sensitive payment data.

`OnboardingService.start_onboarding` logs `user` and `initially_present=true|false`. This exposes profile backfills and repeated initialization without logging personal data.

Public discovery can be checked at `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and `/llms.txt`. `llms.txt` is a convenience index, not a ranking guarantee. Canonical HTML and structured course data remain the source of truth.

## Failure boundaries

- Payment does not complete onboarding when the profile is not self-paced, has no goal, has an invalid selected course, or selected a different course.
- Concurrent profile initialization is resolved through the `user_profiles.user_id` primary key; the losing request rolls back and returns the winning row.
- An explicit path from another course returns `LEARNING_PATH_NOT_FOUND` and is never priced as a fallback.
- If the public API is unavailable during rendering, pages retain client fetching and metadata falls back safely; the sitemap omits unavailable dynamic course URLs until the next revalidation.

## Verification

```powershell
npm run typecheck:gate
npm run test:gate
npm run eval
api\.venv\Scripts\python.exe -m unittest api.tests.test_enrollment_payment_consistency
```
