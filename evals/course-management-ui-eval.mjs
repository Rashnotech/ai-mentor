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
    "mentor course list uses admin table layout",
    mentorCourses.includes("Course Catalog") &&
      mentorCourses.includes("Canonical Path") &&
      mentorCourses.includes('<table className="w-full">') &&
      mentorCourses.includes("Manage") &&
      mentorCourses.includes("Preview"),
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
