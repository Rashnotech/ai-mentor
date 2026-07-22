import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const adminCourses = await readFile("app/admin/courses/page-client.tsx", "utf8")
const mentorCourses = await readFile("app/mentor/my-courses/page-client.tsx", "utf8")
const learnPage = await readFile("app/courses/[id]/learn/page-client.tsx", "utf8")
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
      learnPage.includes("truncate text-[13px] font-semibold leading-snug") &&
      learnPage.includes("line-clamp-1 break-words text-[11px] leading-4 text-gray-500") &&
      learnPage.includes("line-clamp-2 break-words px-1 py-2 text-[11px] leading-4 text-gray-600") &&
      learnPage.includes("flex h-full min-w-0 min-h-0 flex-col bg-linear-to-b") &&
      !/w-full min-w-0 max-w-full overflow-hidden rounded-(lg|xl)/.test(learnPage) &&
      !learnPage.includes("flex h-full min-w-0 min-h-0 flex-col overflow-hidden") &&
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
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Course management UI eval must pass every acceptance check")
