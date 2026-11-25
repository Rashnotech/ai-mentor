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
const apiLib = await readFile("lib/api/courses.ts", "utf8")
const apiBarrel = await readFile("lib/api.ts", "utf8")
const gamificationService = await readFile("api/domains/courses/services/gamification_service.py", "utf8")
const studentRoutes = await readFile("api/domains/courses/routes/student.py", "utf8")
const programmeScheduleService = await readFile("api/domains/courses/services/programme_schedule_service.py", "utf8")
const moduleAvailabilityJob = await readFile("api/domains/courses/jobs/module_availability_job.py", "utf8")
const sessionModels = await readFile("api/domains/sessions/models.py", "utf8")
const bookingService = await readFile("api/domains/sessions/booking_service.py", "utf8")
const sessionRoutes = await readFile("api/domains/sessions/routes.py", "utf8")
const sessionsApiClient = await readFile("lib/api/internships-community-sessions.ts", "utf8")
const sessionsPage = await readFile("app/dashboard/sessions/page-client.tsx", "utf8")
const notificationModel = await readFile("api/domains/users/models/notification.py", "utf8")
const notificationService = await readFile("api/domains/users/services/notification_service.py", "utf8")
const notificationRoutes = await readFile("api/domains/users/routes/notifications.py", "utf8")
const authApiClient = await readFile("lib/api/auth.ts", "utf8")
const homePageClient = await readFile("app/page-client.tsx", "utf8")
const servicesPageClient = await readFile("app/services/page-client.tsx", "utf8")
const studentProgressRoutes = await readFile("api/domains/courses/routes/student_progress.py", "utf8")
const studentReviewRoutes = await readFile("api/domains/courses/routes/student_reviews.py", "utf8")
const milestoneService = await readFile("api/domains/courses/services/project_milestone_service.py", "utf8")
const githubPrecheckService = await readFile("api/domains/courses/services/github_precheck_service.py", "utf8")
const projectInterviewService = await readFile("api/domains/ai/services/project_interview_service.py", "utf8")
const projectInterviewRoutes = await readFile("api/domains/ai/routes/project_interview.py", "utf8")
const projectDefenseComponent = await readFile("app/dashboard/courses/[id]/learn/_components/project-defense-interview.tsx", "utf8")
const apiClient = await readFile("lib/api/client.ts", "utf8")
const authContext = await readFile("lib/auth-context.tsx", "utf8")
const procfile = await readFile("api/Procfile", "utf8")
const herokuRelease = await readFile("api/scripts/heroku_release.py", "utf8")
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
    dashboardLayout.includes("bg-white border-r border-gray-200") &&
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
    "lesson overview uses edge-tts neural voices to read the entire sanitized overview with voice selector",
    aiRoutes.includes("import edge_tts") &&
      aiRoutes.includes('DEFAULT_EDGE_TTS_VOICE = "en-US-AriaNeural"') &&
      aiRoutes.includes("EDGE_TTS_VOICE_MAP") &&
      aiRoutes.includes("See code sample.") &&
      aiRoutes.includes('replace("\\\\n", "\\n")') &&
      aiRoutes.includes("edge_tts.Communicate(text=text, voice=voice)") &&
      aiRoutes.includes('media_type="audio/mpeg"') &&
      aiRoutes.includes("_TTS_AUDIO_CACHE") &&
      aiRoutes.includes('@router.post("/lesson-overview/speech")') &&
      apiLib.includes("synthesizeLessonOverviewSpeech") &&
      dashboardLearnPage.includes("handleToggleOverviewAudio") &&
      dashboardLearnPage.includes("studentCoursesApi.synthesizeLessonOverviewSpeech") &&
      dashboardLearnPage.includes("Listen to Overview") &&
      dashboardLearnPage.includes("en-NG-EzinneNeural"),
  ],
  [
    "lib/api.ts and student.py are split into domain modules with intact barrel exports and sub-routers",
    apiBarrel.includes('export * from "./api/client"') &&
      apiBarrel.includes('export * from "./api/auth"') &&
      apiBarrel.includes('export * from "./api/courses"') &&
      apiBarrel.includes('export * from "./api/admin"') &&
      apiBarrel.includes('export * from "./api/payments-surveys"') &&
      apiBarrel.includes('export * from "./api/internships-community-sessions"') &&
      studentRoutes.includes("include_router(progress_router)") &&
      studentRoutes.includes("include_router(reviews_router)") &&
      studentReviewRoutes.includes("reviews_router"),
  ],
  [
    "student streak and XP update on lesson, quiz, and project completion and render on dashboard",
    gamificationService.includes("def record_learning_activity") &&
      gamificationService.includes("last_activity_date < today - timedelta(days=1)") &&
      studentProgressRoutes.includes("GamificationService(db_session).record_learning_activity") &&
      studentProgressRoutes.includes("GamificationService(db_session).record_quiz_activity") &&
      /gamificationApi\s*\.getMyGamification\(\)/.test(dashboardView) &&
      dashboardView.includes("streakDays") &&
      dashboardView.includes("totalXp"),
  ],
  [
    "projects expose 3 progressive micro-milestones with progress bar on cards and interactive checklist in learn view",
    milestoneService.includes("def build_project_milestones") &&
      milestoneService.includes("async def toggle_project_milestone") &&
      studentProgressRoutes.includes("/projects/{project_id}/milestones/{milestone_id}/toggle") &&
      apiLib.includes("toggleProjectMilestone") &&
      projectsView.includes("milestones checked") &&
      dashboardLearnPage.includes("Project Micro-Milestones") &&
      dashboardLearnPage.includes("handleToggleProjectMilestone"),
  ],
  [
    "students can run an automated 3-bullet GitHub repo pre-check before mentor submission",
    githubPrecheckService.includes("def parse_github_repo_url") &&
      githubPrecheckService.includes("async def run_github_precheck") &&
      githubPrecheckService.includes("api.github.com/repos/") &&
      studentProgressRoutes.includes("/projects/{project_id}/precheck") &&
      apiLib.includes("precheckProjectRepo") &&
      dashboardLearnPage.includes("Pre-Check Repo") &&
      dashboardLearnPage.includes("GitHub Pre-Flight Check"),
  ],
  [
    "end of each project includes Mode 1 Project Defense Interview with Groq llama-4-scout Vision + screen share",
    projectInterviewService.includes("meta-llama/llama-4-scout-17b-16e-instruct") &&
      projectInterviewService.includes("build_multimodal_user_content") &&
      projectInterviewService.includes("build_project_milestones") &&
      projectInterviewService.includes("run_github_precheck") &&
      projectInterviewService.includes("groq_client.generate_text") &&
      projectInterviewRoutes.includes("/ai/project-interview") &&
      apiLib.includes("runProjectDefenseTurn") &&
      projectDefenseComponent.includes("getDisplayMedia") &&
      projectDefenseComponent.includes("Project Interview") &&
      projectDefenseComponent.includes("synthesizeLessonOverviewSpeech") &&
      projectDefenseComponent.includes("autoPlay") &&
      !projectDefenseComponent.includes("Mode 1") &&
      !/bg-gradient|bg-linear|radial-gradient/.test(projectDefenseComponent) &&
      dashboardLearnPage.includes("<ProjectDefenseInterview"),
  ],
  [
    "expired access + refresh tokens automatically clear auth state, notify AuthProvider, and redirect to login",
    apiClient.includes("export function handleSessionExpired") &&
      apiClient.includes("useUserStore.getState().clearUser()") &&
      apiClient.includes("auth:session-expired") &&
      !apiClient.includes("hasOAuthSession") &&
      authContext.includes('addEventListener("auth:session-expired"') &&
      authContext.includes('router.replace("/login")'),
  ],
  [
    "Heroku Procfile runs idempotent release script before web dyno starts",
    /^release:\s*python scripts\/heroku_release\.py/m.test(procfile) &&
      /^web:\s*gunicorn /m.test(procfile) &&
      herokuRelease.includes("choose_baseline_revisions") &&
      herokuRelease.includes("upgrade"),
  ],
  [
    "learn content eliminates N+1 queries and loads active module first with gradual background hydration",
    studentRoutes.includes("Lesson.module_id.in_(module_ids)") &&
      studentRoutes.includes("lite: bool = Query") &&
      studentRoutes.includes('"content_loaded": include_full_body') &&
      apiLib.includes("timeout: 60000") &&
      dashboardLearnPage.includes("hydrateModule") &&
      dashboardLearnPage.includes("lite: true"),
  ],
  [
    "5-business-day programme schedule excludes weekends and notifies students when modules become active",
    programmeScheduleService.includes("DEFAULT_PROGRAMME_BUSINESS_DAYS = 5") &&
      programmeScheduleService.includes("def compute_module_windows") &&
      programmeScheduleService.includes("def compute_pace_status") &&
      moduleAvailabilityJob.includes("create_module_active_notification") &&
      studentRoutes.includes("newly_unlocked_modules") &&
      studentRoutes.includes("programme_schedule") &&
      dashboardLearnPage.includes("5-Day Sprint (weekends excluded)") &&
      dashboardLearnPage.includes("Module Active:"),
  ],
  [
    "student dashboard sessions page displays available mentors and supports 1-on-1 booking",
    sessionModels.includes("class MentorBooking") &&
      bookingService.includes("async def list_available_mentors") &&
      bookingService.includes("async def create_mentor_booking") &&
      sessionRoutes.includes('@router.get("/mentors")') &&
      sessionRoutes.includes('@router.post("/bookings"') &&
      sessionsApiClient.includes("listAvailableMentors") &&
      sessionsApiClient.includes("bookMentorSession") &&
      sessionsPage.includes("Available Mentors") &&
      sessionsPage.includes("Book Mentor") &&
      !/bg-gradient|bg-linear|radial-gradient/.test(sessionsPage),
  ],
  [
    "dashboard notification bell is wired to persisted user_notifications API with mark-read support",
    notificationModel.includes("class UserNotification") &&
      notificationService.includes("async def list_user_notifications") &&
      notificationService.includes('return {"items": [], "unread_count": 0}') &&
      notificationRoutes.includes("/read-all") &&
      authApiClient.includes("export const notificationsApi") &&
      dashboardLayout.includes("notificationsApi.list") &&
      dashboardLayout.includes("isAuthLoading || !isAuthenticated") &&
      !dashboardLayout.includes("const NOTIFICATIONS =") &&
      dashboardView.includes("module_unlocked:") &&
      dashboardView.includes("FEEDBACK_ICONS[latestFeedback.category] ?? Sparkles"),
  ],
  [
    "homepage showcases 1-on-1 mentor training below Skills for the Modern Workforce and dashboard sidebar is white",
    !dashboardLayout.includes("bg-[#F4F5F2]") &&
      homePageClient.includes("Direct Access to 1-on-1 Mentor Training") &&
      homePageClient.includes("Book a 1-on-1 Mentor"),
  ],
  [
    "restructured services page showcases services, delivered projects, company trust, and WhatsApp/Call/Video booking",
    servicesPageClient.includes("E-Commerce") &&
      servicesPageClient.includes("Mobile & Web Applications") &&
      servicesPageClient.includes("Digital Skill Training") &&
      servicesPageClient.includes("Cybersecurity") &&
      servicesPageClient.includes("DELIVERED_PROJECTS") &&
      servicesPageClient.includes("wa.me/2348172992396") &&
      servicesPageClient.includes("tel:+2348172992396") &&
      servicesPageClient.includes("Book Video Appointment"),
  ],
]

const passed = checks.filter(([, ok]) => ok).length
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Dashboard learn eval must pass all checks")
