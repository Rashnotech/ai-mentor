import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const dashboardLayout = await readFile("app/dashboard/layout-client.tsx", "utf8")
const dashboardView = await readFile("app/dashboard/_components/dashboard-view.tsx", "utf8")
const myCoursesView = await readFile("app/dashboard/_components/my-courses-view.tsx", "utf8")
const projectsView = await readFile("app/dashboard/_components/projects-view.tsx", "utf8")
const profileView = await readFile("app/dashboard/_components/profile-view.tsx", "utf8")
const courseDetails = await readFile("app/courses/[id]/page-client.tsx", "utf8")
const legacyLearnPage = await readFile("app/courses/[id]/learn/page.tsx", "utf8")
const dashboardLearnPage = await readFile("app/dashboard/courses/[id]/learn/page-client.tsx", "utf8")
const aiRoutes = await readFile("api/domains/ai/routes/rubber_duck.py", "utf8")
const apiLib = await readFile("lib/api.ts", "utf8")
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
  [
    "README.md documents full-stack architecture, personalization spec, setup, and test lanes",
    await readFile("README.md", "utf8").then(
      (readme) =>
        readme.includes("## Core Capabilities") &&
        readme.includes("## System Architecture") &&
        readme.includes("## Personalization Engine Specification") &&
        readme.includes("npm run test:gate") &&
        readme.includes("npm run eval")
    ),
  ],
  [
    "left sidebar supports collapsing to icon-only width (lg:w-20) with accessible toggle button",
    dashboardLayout.includes("isSidebarCollapsed") &&
      dashboardLayout.includes("PanelLeftClose") &&
      dashboardLayout.includes("PanelLeftOpen") &&
      dashboardLayout.includes('isSidebarCollapsed ? "w-64 lg:w-20" : "w-64"') &&
      dashboardLayout.includes('aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}'),
  ],
  [
    "right chapter rail is a fixed full-height panel that does not scroll away with the main lesson stage",
    dashboardLayout.includes("const isLearnRoute = /^\\/dashboard\\/courses\\/[^/]+\\/learn/.test(pathname)") &&
      dashboardLayout.includes('<div className="flex-1 min-h-0 overflow-hidden">{children}</div>') &&
      dashboardLearnPage.includes('<div className="h-full flex flex-col lg:flex-row overflow-hidden">') &&
      dashboardLearnPage.includes('className="min-w-0 flex-1 h-full overflow-y-auto p-6 lg:px-10 lg:py-8"') &&
      dashboardLearnPage.includes('<aside className="hidden lg:flex lg:flex-col w-[330px] xl:w-[360px] shrink-0 h-full border-l border-gray-100 bg-white overflow-y-auto p-6">'),
  ],
  [
    "dashboard welcome stat cards use solid colors (#2563EB, #EA580C, #16A34A) and no opacity washes",
    dashboardView.includes("bg-[#2563EB] text-white") &&
      dashboardView.includes("bg-[#EA580C] text-white") &&
      dashboardView.includes("bg-[#16A34A] text-white") &&
      !dashboardView.includes("bg-opacity-50"),
  ],
  [
    "AI Mentor Feedback displays only the single latest message instead of a list",
    dashboardView.includes("const latestFeedback = mentorFeedback[0] || null") &&
      !dashboardView.includes("showAllFeedback") &&
      !dashboardView.includes("mentorFeedback.slice(0, 3)"),
  ],
  [
    "AI Guidance is removed from the in-dashboard project view",
    !dashboardLearnPage.includes("AI Guidance") &&
      !dashboardLearnPage.includes("startProject") &&
      !dashboardLearnPage.includes("showGuidance"),
  ],
  [
    "courses and projects views use revamped solid-color cards and status badges",
    myCoursesView.includes("Enrolled Classes") &&
      myCoursesView.includes("bg-[#16A34A] text-white") &&
      projectsView.includes("bg-[#2563EB] text-white") &&
      projectsView.includes("bg-[#EA580C] text-white") &&
      projectsView.includes("bg-[#16A34A] text-white"),
  ],
  [
    "student profile view is revamped with solid stat cards, two-column layout, and zero gradients",
    !/bg-gradient|bg-linear|radial-gradient/.test(profileView) &&
      profileView.includes("bg-[#2563EB] text-white") &&
      profileView.includes("bg-[#EA580C] text-white") &&
      profileView.includes("bg-[#16A34A] text-white") &&
      profileView.includes("Personal Information") &&
      profileView.includes("Connected Accounts") &&
      gateConfig.includes("app/dashboard/_components/profile-view.tsx"),
  ],
  [
    "lesson overview includes Groq TTS audio endpoint, LLM condensation, 429 backoff, and player controls",
    aiRoutes.includes('TTS_MODEL = "canopylabs/orpheus-v1-english"') &&
      aiRoutes.includes("MAX_TTS_CHUNKS = 2") &&
      aiRoutes.includes("OVERVIEW_NARRATION_SYSTEM_PROMPT") &&
      aiRoutes.includes("client.audio.speech.create") &&
      aiRoutes.includes("response.read()") &&
      aiRoutes.includes("RateLimitError") &&
      aiRoutes.includes("_TTS_AUDIO_CACHE") &&
      aiRoutes.includes('@router.post("/lesson-overview/speech")') &&
      apiLib.includes("synthesizeLessonOverviewSpeech") &&
      dashboardLearnPage.includes("handleToggleOverviewAudio") &&
      dashboardLearnPage.includes("studentCoursesApi.synthesizeLessonOverviewSpeech") &&
      dashboardLearnPage.includes("Listen to Overview"),
  ],
]

const passed = checks.filter(([, ok]) => ok).length
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Dashboard learn eval must pass all checks")
