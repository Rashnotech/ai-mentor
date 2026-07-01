---
name: enrollment-payment-consistency
description: Verify and change LMS self-paced enrollment, paid course selection, payment activation, and onboarding persistence. Use for enrollment redirects, duplicate or inactive enrollments, selected learning-path pricing, payment callbacks, and post-logout onboarding regressions.
---

# Enrollment and payment consistency

Follow this sequence. Do not treat client state as enrollment authority.

1. Trace the user profile, selected course, selected path, enrollment, and payment records.
2. Confirm the selected path belongs to the selected course before pricing it.
3. Pass `path_id` through every frontend and API boundary.
4. Create paid enrollments as inactive and `pending_payment`.
5. Activate only after server-side gateway verification or a verified webhook.
6. Make activation idempotent and repair an inactive enrollment with an existing successful payment.
7. Complete self-paced onboarding in the same transaction only when the paid course matches `selected_course_id` and required profile fields exist.
8. Refresh durable user state after callbacks before navigating to protected pages.
9. Add regression tests for logout/login, wrong-course payment, path ownership, retry, and callback flows.
10. Run `node .agents/skills/enrollment-payment-consistency/scripts/check-contract.mjs`, the API tests, frontend gate tests, and evals.

Required trace: keep the activation log with enrollment ID, payment reference, and onboarding completion result. Never log tokens, payment credentials, or full gateway payloads.
