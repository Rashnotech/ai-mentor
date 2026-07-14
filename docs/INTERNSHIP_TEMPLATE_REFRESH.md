# Internship template refresh

## Outcome

The internship application flow now follows the dark account/payment template style requested for the UI:

- deep navy page background: `bg-[#071c2d]`
- slate form/card panels: `bg-[#24354c]`
- gray input blocks: `bg-[#7b8794]`
- shared horizontal internship stepper across all public internship steps
- no right-side landing information cards for `Who can apply` or `Verification process`

## Pages changed

- `app/internship/page.tsx`
- `app/internship/create-profile/page.tsx`
- `app/internship/verification/page.tsx`
- `app/internship/choose-track/page.tsx`
- `app/internship/get-acceptance/page.tsx`
- `app/internship/_components/internship-stepper.tsx`

## Verification

Run:

```powershell
npm.cmd run typecheck:gate
npm.cmd run test:gate
npm.cmd run eval
npm.cmd run build
```
