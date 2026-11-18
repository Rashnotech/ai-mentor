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

const checks = [
  [
    "learn section is hosted inside dashboard route (/dashboard/courses/[id]/learn)",
    dashboardLearnPage.includes("export default function DashboardLearningPage") &&
      legacyLearnPage.includes("redirect(`/dashboard/courses/${id}/learn"),
  ],
  [
    "all student course entry points link into the in-dashboard learn view",
    dashboardView.includes("/dashboard/courses/${course.slug}/learn") &&
      dashboardView.includes("/dashboard/courses/${activeCourse.slug}/learn") &&
      myCoursesView.includes("/dashboard/courses/${course.slug}/learn") &&
      projectsView.includes("/dashboard/courses/${project.course_slug}/learn") &&
      courseDetails.includes("/dashboard/courses/${slug}/learn"),
  ],
  [
    "solid colors only (zero gradients in dashboard layout, dashboard view, and learn view)",
    !/bg-gradient|bg-linear|radial-gradient/.test(dashboardLayout) &&
      !/bg-gradient|bg-linear|radial-gradient/.test(dashboardView) &&
      !/bg-gradient|bg-linear|radial-gradient/.test(dashboardLearnPage),
  ],
  [
    "right-hand rail shows only active module lessons at top",
    dashboardLearnPage.includes("function FocusedModuleRail") &&
      dashboardLearnPage.includes("Class Chapter") &&
      dashboardLearnPage.includes("currentModule.lessons.map") &&
      dashboardLearnPage.includes("bg-[#4E89FF]"),
  ],
  [
    "bottom collapsible module switcher provides accessible navigation to other modules",
    dashboardLearnPage.includes("aria-expanded={isOtherModulesOpen}") &&
      dashboardLearnPage.includes('aria-controls="collapsible-course-modules"') &&
      dashboardLearnPage.includes('id="collapsible-course-modules"') &&
      dashboardLearnPage.includes("Collapse other modules") &&
      dashboardLearnPage.includes("Browse all modules"),
  ],
  [
    "other class progress widget renders in right-hand rail",
    dashboardLearnPage.includes("Other class") &&
      dashboardLearnPage.includes("Your other class progress") &&
      dashboardLearnPage.includes("otherCourses.slice(0, 2).map"),
  ],
  [
    "dashboard sidebar and header match reference layout with solid colors and active indicator dot",
    dashboardLayout.includes("bg-[#F4F5F2]") &&
      dashboardLayout.includes("bg-[#EBF2FF]") &&
      dashboardLayout.includes("Search Class...") &&
      dashboardLayout.includes("w-2 h-2 rounded-full bg-blue-600"),
  ],
  [
    "gate tsconfig tracks the new dashboard learn pages",
    gateConfig.includes("app/dashboard/courses/[id]/learn/page.tsx") &&
      gateConfig.includes("app/dashboard/courses/[id]/learn/page-client.tsx"),
  ],
]

const passed = checks.filter(([, ok]) => ok).length
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Dashboard learn eval must pass all checks")
