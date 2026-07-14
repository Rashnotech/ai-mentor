# Homepage content and reviews

## Outcome

The homepage points visitors toward Rashnotech's core technical programmes, shows a tighter four-review social proof section, and introduces the mentor roster.

## Changed content

Footer programme links now include:

- Python Programming
- Web Development
- Software Engineering
- AI Engineering

The former "More Opportunity. More Impact." block is now "Why choose Rashnotech" and uses four dark student review cards:

- Ndubuisi Mercy
- Molly
- Emmanuel Samuel Oluwayinka
- Karl Azoms

Callistus Ikwuazom was removed from the student review cards and appears only in the mentor roster.

The mentor section now follows the reference expert-strip layout instead of card grid layout:

- light section background
- large centered headline
- four horizontal mentor items on desktop
- large circular portrait treatment
- name, role, and blue topic link under each mentor

The mentor section lists:

- Mr. Abdulrasheed Aliyu, CEO/Founder, Leadership and product strategy
- Mr. Ini Ebong, Software Engineer, Modern software engineering
- Dr. Callistus Ikwuazom, Cybersecurity, Cybersecurity and digital safety
- Mr Badru Aliyu, Graphic Designer, Visual design and branding

## Verification

Run:

```bash
npm run test:gate
npm run eval
```

The deterministic contract is `tests/homepage-content-contract.mjs`.
The acceptance eval is `evals/homepage-content-eval.mjs`.
