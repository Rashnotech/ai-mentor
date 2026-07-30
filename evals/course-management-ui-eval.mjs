import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const adminCourses = await readFile("app/admin/courses/page-client.tsx", "utf8")
const mentorCourses = await readFile("app/mentor/my-courses/page-client.tsx", "utf8")
const learnPage = await readFile("app/courses/[id]/learn/page-client.tsx", "utf8")
const mentorStudents = await readFile("app/mentor/my-students/page-client.tsx", "utf8")
const dashboardView = await readFile("app/dashboard/_components/dashboard-view.tsx", "utf8")
const apiLib = await readFile("lib/api.ts", "utf8")
const gateConfig = await readFile("tsconfig.gate.json", "utf8")

const checks = [
  [
    "admin course manager supports JSON upload like mentor courses",
    [
      "jsonImportFile",
      "jsonImportInputRef",
      "importCourseJsonMutation",
      "courseAdminApi.importCourseFromJson",
      "Import Course JSON",
      "Upload JSON",
      "validateCourseJsonFile",
    ].every((label) => adminCourses.includes(label)),
  ],
  [
    "admin JSON import refreshes and opens imported hierarchy",
    adminCourses.includes("setSelectedCourse(result.course_id)") &&
      adminCourses.includes("setSelectedPathId(result.learning_path_id)") &&
      adminCourses.includes('queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })'),
  ],
  [
    "admin selected-course module cards are scrollable",
    adminCourses.includes("max-h-[560px] space-y-2 overflow-y-auto pr-2"),
  ],
  [
    "student quiz text renders markdown",
    learnPage.includes("function QuizMarkdown") &&
      learnPage.includes("remarkPlugins={[remarkGfm]}") &&
      learnPage.includes("content={currentQuestion.question_text}") &&
      learnPage.includes("content={option}") &&
      learnPage.includes("content={currentQuestion.explanation}") &&
      learnPage.includes("content={lastAnswerResult.explanation}"),
  ],
  [
    "student quiz no longer prints raw question markdown in the heading",
    !/<h3 className="mb-6 text-base font-semibold text-gray-900 sm:text-lg">\s*\{currentQuestion\.question_text\}\s*<\/h3>/.test(learnPage),
  ],
  [
    "student learn sidebar is desktop-visible and mobile-toggleable",
    learnPage.includes('className="border-gray-200 bg-white/90 shadow-none lg:hidden"') &&
      learnPage.includes('<aside className="hidden w-[360px] shrink-0 lg:block xl:w-[390px]">') &&
      learnPage.includes("sticky top-24 h-[calc(100vh-7rem)] rounded-3xl") &&
      !learnPage.includes("sticky top-24 h-[calc(100vh-7rem)] overflow-hidden") &&
      !/SheetHeader|SheetTitle|SheetDescription/.test(learnPage),
  ],
  [
    "student learn sidebar text is width-safe",
    learnPage.includes("w-full min-w-0 max-w-full rounded-lg border px-2.5 py-2 text-left") &&
      learnPage.includes("w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white") &&
      learnPage.includes("break-words text-sm font-semibold leading-snug text-gray-900") &&
      learnPage.includes("break-words text-[13px] font-semibold leading-snug") &&
      learnPage.includes("mt-0.5 break-words text-[11px] leading-4 text-gray-500") &&
      learnPage.includes("mt-0.5 line-clamp-2 break-words text-[11px] leading-4 text-gray-500") &&
      learnPage.includes("break-words px-1 py-2 text-[11px] leading-4 text-gray-600") &&
      learnPage.includes("flex h-full min-w-0 min-h-0 flex-col bg-linear-to-b") &&
      !/w-full min-w-0 max-w-full overflow-hidden rounded-(lg|xl)/.test(learnPage) &&
      !learnPage.includes("flex h-full min-w-0 min-h-0 flex-col overflow-hidden") &&
      !learnPage.includes("truncate text-[13px] font-semibold leading-snug") &&
      !/line-clamp-1 .*text-\[11px\] leading-4 text-gray-500/.test(learnPage) &&
      !/line-clamp-2 .*text-\[11px\] leading-4 text-gray-600/.test(learnPage) &&
      learnPage.includes('ScrollArea className="min-h-0 flex-1 px-4 pb-5 pt-4"') &&
      learnPage.includes('className="min-w-0 space-y-2 pr-1"') &&
      !learnPage.includes("wrap-break-word"),
  ],
  [
    "mentor course list uses responsive admin-style layout without horizontal scroll",
    mentorCourses.includes("Course Catalog") &&
      mentorCourses.includes("Canonical Path") &&
      mentorCourses.includes("grid gap-3 xl:hidden") &&
      mentorCourses.includes("hidden overflow-hidden xl:block") &&
      mentorCourses.includes('<table className="w-full table-fixed">') &&
      mentorCourses.includes("Manage") &&
      mentorCourses.includes("Preview") &&
      !mentorCourses.includes("overflow-x-auto"),
  ],
  [
    "mentor selected-course view follows admin detail flow",
    mentorCourses.includes("{!selectedCourse && (") &&
      /Courses\s*<\/button>/.test(mentorCourses) &&
      mentorCourses.includes("grid grid-cols-1 lg:grid-cols-3 gap-6") &&
      mentorCourses.includes("Edit Course") &&
      mentorCourses.includes("Add Learning Path") &&
      !mentorCourses.includes("Click to manage content"),
  ],
  [
    "mentor edit-project modal stays within viewport and scrolls internally",
    mentorCourses.includes("Dialog open={showEditProjectModal}") &&
      mentorCourses.includes("max-w-lg max-h-[90vh] overflow-hidden flex flex-col") &&
      mentorCourses.includes("space-y-4 overflow-y-auto pr-2 flex-1") &&
      mentorCourses.includes("DialogFooter className=\"shrink-0\""),
  ],
  [
    "gate typecheck includes touched pages",
    [
      "app/admin/courses/page-client.tsx",
      "app/mentor/my-courses/page-client.tsx",
      "app/courses/[id]/learn/page-client.tsx",
    ].every((file) => gateConfig.includes(file)),
  ],
  [
    "mentor project review only allows Approve (no Needs Revision / Reject)",
    !/<option value="needs_revision">/.test(mentorStudents) &&
      !/<option value="rejected">/.test(mentorStudents) &&
      !mentorStudents.includes("rejectProjectSubmission") &&
      !mentorStudents.includes("Review Status") &&
      mentorStudents.includes("Approve Project") &&
      mentorStudents.includes("courseAdminApi.approveProjectSubmission(Number(project.submission_id), fb, score)"),
  ],
  [
    "mentor review form is always editable (approved projects are not locked read-only)",
    mentorStudents.includes("reviewApproved[project.submission_id] ?? true") &&
      mentorStudents.includes('type="checkbox"') &&
      mentorStudents.includes('project.status === "approved" ? "Update Review" : "Approve Project"') &&
      !mentorStudents.includes("Project Approved</p>"),
  ],
  [
    "mentor score input only shows while the Approved checkbox is checked",
    /\(reviewApproved\[project\.submission_id\] \?\? true\) && \(\s*<div>\s*<label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">Score \(out of 100\)<\/label>/.test(
      mentorStudents
    ) &&
      mentorStudents.includes('disabled={submittingReviewId === project.submission_id || !(reviewApproved[project.submission_id] ?? true)}'),
  ],
  [
    "learning page scrolls to top when the active lesson/module changes",
    /useEffect\(\(\) => \{\s*if \(!activeItemId\) return\s*window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)\s*\}, \[activeItemId\]\)/.test(
      learnPage
    ),
  ],
  [
    "AI mentor: lib/api.ts exposes typed feed + project-start calls",
    apiLib.includes("export interface AIMentorFeedbackItem") &&
      apiLib.includes("startProject: async (projectId: number)") &&
      apiLib.includes("getMentorFeedback: async (limit: number = 20)") &&
      apiLib.includes("/enrollments/progress/projects/${projectId}/start") &&
      apiLib.includes("/enrollments/progress/ai-feedback"),
  ],
  [
    "AI mentor: student dashboard AI Mentor Feedback section is wired to real data, not a static placeholder",
    dashboardView.includes("studentCoursesApi.getMentorFeedback(10)") &&
      dashboardView.includes("FEEDBACK_ICONS") &&
      dashboardView.includes("mentorFeedback.length === 0") &&
      !dashboardView.includes("Complete your current lesson to unlock personalized feedback"),
  ],
  [
    "AI mentor: project-start guidance is a collapsible panel, not always-on",
    learnPage.includes("studentCoursesApi.startProject(project.project_id)") &&
      learnPage.includes("setShowGuidance((prev) => !prev)") &&
      /showGuidance &&\s*\(\s*<div className="px-4 pb-4">/.test(learnPage) &&
      learnPage.includes("!previewMode && (isLoadingGuidance || guidance)"),
  ],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Course management UI eval must pass every acceptance check")
