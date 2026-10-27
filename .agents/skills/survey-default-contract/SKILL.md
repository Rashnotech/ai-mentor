---
name: survey-default-contract
description: Maintain ai-mentor default learning survey gate and eval when templates are added, removed, or reconfigured.
---

1. Inspect `DEFAULT_SURVEYS` in `api/domains/surveys/service.py` before changing expectations.
2. Confirm the intended slug, survey type, trigger, and question set.
3. Preserve live templates and admin-edit seeding behavior when repairing a stale test.
4. Parse the literal registry with `tests/helpers/read-survey-defaults.py`; do not count text matches across the source file.
5. Update explicit identities in `tests/helpers/survey-defaults.mjs` only when product requirements change.
6. Keep uniqueness, required identities, trigger types, survey types, and nonempty questions checked.
7. Add negative eval scenarios for omitted, duplicate, replaced, and misconfigured defaults.
8. Accept equivalent Python formatting and ignore unrelated dictionaries.
9. Run `node tests/learning-survey-contract.mjs`, `node evals/learning-survey-eval.mjs`, `npm.cmd run test:gate`, and `npm.cmd run eval`.
10. Update the survey README and report verification limits. These checks require Python but no FastAPI/database. Test-only fixes need no service restart.
The migration check must allow later migrations to advance the head. Require a single head with the survey migration in its ancestry; eval branching, missing, and disconnected histories.
