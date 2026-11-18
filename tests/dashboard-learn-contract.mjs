import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const dashboardLayout = await readFile("app/dashboard/layout-client.tsx", "utf8")
const dashboardView = await readFile("app/dashboard/_components/dashboard-view.tsx", "utf8")
const myCoursesView = await readFile("app/dashboard/_components/my-courses-view.tsx", "utf8")
const projectsView = await readFile("app/dashboard/_components/projects-view.tsx", "utf8")
const courseDetails = await readFile("app/courses/[id]/page-client.tsx", "utf8")
const legacyLearnPage = await readFile("app/courses/[id]/learn/page.tsx", "utf8")
const dashboardLearnPage = await readFile("app/dashboard/courses/[id]/learn/page-client.tsx", "utf8")
const gateConfig = await readFile("tsconfig.gate.json", "utf8")

// 1. No gradients in student dashboard shell, dashboard view, or in-dashboard learn page
assert.doesNotMatch(dashboardLayout, /bg-gradient|bg-linear|radial-gradient/)
assert.doesNotMatch(dashboardView, /bg-gradient|bg-linear|radial-gradient/)
assert.doesNotMatch(dashboardLearnPage, /bg-gradient|bg-linear|radial-gradient/)

// 2. Dashboard navigation & courses route inside /dashboard/courses/[slug]/learn
assert.match(dashboardView, /\/dashboard\/courses\/\$\{course\.slug\}\/learn/)
assert.match(dashboardView, /\/dashboard\/courses\/\$\{activeCourse\.slug\}\/learn/)
assert.match(myCoursesView, /\/dashboard\/courses\/\$\{course\.slug\}\/learn/)
assert.match(projectsView, /\/dashboard\/courses\/\$\{project\.course_slug\}\/learn/)
assert.match(courseDetails, /\/dashboard\/courses\/\$\{slug\}\/learn/)

// 3. Legacy /courses/[id]/learn redirects cleanly to /dashboard/courses/[id]/learn
assert.match(legacyLearnPage, /redirect\(`\/dashboard\/courses\/\$\{id\}\/learn/)

// 4. Right-hand module rail displays ONLY active module lessons + bottom collapsible module switcher
assert.match(dashboardLearnPage, /function FocusedModuleRail/)
assert.match(dashboardLearnPage, /Class Chapter/)
assert.match(dashboardLearnPage, /currentModule\.lessons\.map/)
assert.match(dashboardLearnPage, /aria-expanded=\{isOtherModulesOpen\}/)
assert.match(dashboardLearnPage, /aria-controls="collapsible-course-modules"/)
assert.match(dashboardLearnPage, /id="collapsible-course-modules"/)
assert.match(dashboardLearnPage, /Other class/)
assert.match(dashboardLearnPage, /Your other class progress/)

// 5. Typecheck gate includes new dashboard learn files
assert.match(gateConfig, /app\/dashboard\/courses\/\[id\]\/learn\/page-client\.tsx/)
assert.match(gateConfig, /app\/dashboard\/courses\/\[id\]\/learn\/page\.tsx/)

// 6. README.md documents architecture, setup, env vars, and verification commands
const readme = await readFile("README.md", "utf8")
assert.match(readme, /## System Architecture/)
assert.match(readme, /## Personalization Engine Specification/)
assert.match(readme, /## Getting Started/)
assert.match(readme, /## Testing, Gate Checks & Evals/)
assert.match(readme, /\/dashboard\/courses\/\[id\]\/learn/)

console.log("Dashboard learn contract: PASS")
