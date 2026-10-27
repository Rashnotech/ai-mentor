# Course cover image API contract

`cover_image_url` is an optional string on create and update requests and every admin/public course response (including brief lists). The API stores the link; clients render that link as the image source. Existing courses without covers return `null`.

For updates, omitting the field preserves the saved cover. Sending a different string replaces it. Sending `null` or an empty string removes the cover for clients that show a fallback. No database migration is required: the column already exists.

Regression checks:

```
python -m unittest discover -s api/tests -p test_course_cover_images.py -v
python api/evals/course_cover_images_eval.py
```

The tests compile real handler bodies with mocked boundary dependencies and check response schema fields. They exercise create, update, admin list, public list and both public detail routes without a database or installed FastAPI dependencies. The eval requires 100% success over external, relative, signed, empty and missing image values. Database integration and HTTP response validation remain deployment-environment checks.

## Frontend verification

The admin create and edit dialogs submit the cover URL, trim surrounding whitespace, and restore the saved value when reopening edit. Clearing the edit field sends an empty string. Public catalog cards and the course enrollment card render the returned URL through `components/course-cover.tsx`. Native images accept arbitrary image hosts without a Next.js remote image configuration. Missing or failed images retain the existing gradient background; a replacement URL can render after a previous image failed. Dashboard cards already consume the saved cover URL.

```
node tests/course-cover-contract.mjs
node evals/course-cover-eval.mjs
npm.cmd run typecheck:gate
```

The frontend checks execute the actual admin handlers with mocked mutation boundaries and render the cover component. They do not make network requests to external image hosts. Hosts must serve an image accessible to the browser; authentication, expired signed links, hotlink restrictions, and browser mixed-content rules can prevent loading. The database column remains limited to 255 characters.

Restart both the Next.js frontend and FastAPI backend after deployment. For local development, stop the running processes and run `npm.cmd run dev` from the repository root and `python -m uvicorn app:app --reload` from `api/` with the project's Python dependencies installed.
