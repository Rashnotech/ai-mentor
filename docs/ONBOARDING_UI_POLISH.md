# Onboarding UI polish

## Outcome

This pass keeps onboarding selection cards visually clean and consistent:

- selected cards use one visible border, not a border plus a second ring
- self-paced and bootcamp course descriptions are clamped to three lines
- long course/path text is constrained so cards keep a steady rhythm
- learning mode selection saves directly after `Continue`, without the redundant confirmation page
- the app UI font is Urbanist through the app-loaded global `font-sans` token and Google stylesheet link
- internship headers span the full screen width instead of sitting inside a centered container

## Files covered

- `app/layout.tsx`
- `app/globals.css`
- `styles/globals.css`
- `app/onboarding/page-client.tsx`
- `app/onboarding/mode-selection/page-client.tsx`
- `app/onboarding/cohort-select/page-client.tsx`
- `app/internship/_components/internship-header.tsx`

## Verification

Run:

```bash
npm run typecheck:gate
npm run test:gate
npm run eval
```

The deterministic UI contract is `tests/onboarding-ui-contract.mjs`.
The UI acceptance eval is `evals/onboarding-ui-eval.mjs`.
