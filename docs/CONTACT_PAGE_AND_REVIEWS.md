# Contact page and review-card refresh

## Outcome

The public site now has a Rashnotech contact page at `/contact` with:

- the shared public header component
- the shared public footer component
- a dark navy hero inspired by the supplied reference
- a white contact form card
- neutral Rashnotech copy for learning, internships, consulting, services, partnerships, and support
- blue call-to-action buttons and form accents
- no support-channel block below the form
- no `24-48h`, `Courses`, or `Internship` stat chips beside the form
- backend email delivery to `rashnotech@gmail.com` through `POST /api/v1/contact`
- inline success feedback: `Email sent successfully. We will contact you in a few hours.`
- crawler and LLM discovery through `sitemap.ts`, `robots.ts`, and `llms.txt`

The homepage review section now:

- uses light review cards instead of dark cards
- displays the role label as `student`
- shows only the first few reviews
- clamps the visible review text
- provides `Read more` and `See more reviews` links

## Files changed

- `app/contact/page.tsx`
- `app/contact/page-client.tsx`
- `api/domains/contact/routes.py`
- `api/domains/contact/schemas.py`
- `api/core/config.py`
- `api/app.py`
- `lib/api.ts`
- `components/public-site-header.tsx`
- `components/public-site-footer.tsx`
- `app/page-client.tsx`
- `app/courses/page-client.tsx`
- `app/courses/[id]/page-client.tsx`
- `app/internship/_components/internship-header.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/llms.txt/route.ts`
- `tests/contact-page-contract.mjs`
- `evals/contact-page-eval.mjs`

## Verification

Run:

```powershell
npm.cmd run typecheck:gate
npm.cmd run test:gate
npm.cmd run eval
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm.cmd run build
```
