# Homepage content and reviews

## Outcome

The homepage now points visitors toward Rashnotech's core technical programmes and replaces the old impact-stat section with student reviews.

## Changed content

Footer programme links now include:

- Python Programming
- Web Development
- Software Engineering
- AI Engineering

The former "More Opportunity. More Impact." block is now "Why choose Rashnotech" and uses student review cards while keeping the existing light-blue section background.

## Verification

Run:

```bash
npm run test:gate
npm run eval
```

The deterministic contract is `tests/homepage-content-contract.mjs`.
The acceptance eval is `evals/homepage-content-eval.mjs`.
