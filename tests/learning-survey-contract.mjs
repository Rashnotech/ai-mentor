import assert from "node:assert/strict"
import fs from "node:fs"

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

const models = read("api/domains/surveys/models.py")
const service = read("api/domains/surveys/service.py")
const routes = read("api/domains/surveys/routes.py")
const migration = read("api/alembic/versions/e4f5a6b7c8d9_add_learning_surveys.py")
const modal = read("components/learning-survey-modal.tsx")
const dashboard = read("app/dashboard/layout-client.tsx")
const admin = read("app/admin/surveys/page-client.tsx")
const api = read("lib/api.ts")
const migrationDirectory = new URL("../api/alembic/versions/", import.meta.url)
const revisionGraph = fs.readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".py"))
  .map((name) => fs.readFileSync(new URL(name, migrationDirectory), "utf8"))
  .map((source) => {
    const revision = source.match(/^revision(?:\s*:\s*str)?\s*=\s*["']([^"']+)["']/m)?.[1]
    const downBlock = source.match(/^down_revision[^=]*=([\s\S]*?)(?=^branch_labels)/m)?.[1] ?? ""
    const downRevisions = [...downBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1])
    return { revision, downRevisions }
  })
  .filter((entry) => entry.revision)
const referencedRevisions = new Set(revisionGraph.flatMap((entry) => entry.downRevisions))
const migrationHeads = revisionGraph.map((entry) => entry.revision).filter((revision) => !referencedRevisions.has(revision))

const checks = [
  ["four durable survey tables", ["class Survey(", "class SurveyQuestion(", "class SurveyResponse(", "class UserSurveyEvent("].every((value) => models.includes(value))],
  ["response cycle uniqueness", models.includes("uq_survey_response_cycle")],
  ["event cycle uniqueness", models.includes("uq_user_survey_event_cycle")],
  ["onboarding eligibility gate", service.includes("not profile.onboarding_completed")],
  ["active enrollment eligibility gate", service.includes("EnrollmentStatus.ACTIVE") && service.includes("is_active.is_(True)")],
  ["first check-in timing", service.includes("FIRST_CHECKIN_DAYS = 7") && service.includes("FIRST_CHECKIN_LESSONS = 3")],
  ["monthly cycle timing", service.includes("MONTHLY_CYCLE_DAYS = 30") && service.includes('f"monthly:{enrollment.enrollment_id}:{cycle_number}"')],
  ["milestone trigger", service.includes('"module_completion"') && service.includes("ModuleProgress.module_completed.is_(True)")],
  ["project milestone trigger", service.includes("ProjectSubmission.submitted_at >= now - timedelta(days=30)")],
  ["support trigger", service.includes("SUPPORT_CHECKIN_DAYS = 10") && service.includes("URGENT_SUPPORT_DAYS = 14") && service.includes("low_learning_progress")],
  ["global frequency cap", service.includes("GLOBAL_SURVEY_COOLDOWN_DAYS = 7")],
  ["dismiss and skip cooldowns", service.includes("DISMISSED_COOLDOWN_DAYS = 5") && service.includes("SKIPPED_COOLDOWN_DAYS = 7")],
  ["three default templates", (service.match(/"slug":/g) ?? []).length === 3],
  ["eligible endpoint", routes.includes('@router.get("/surveys/eligible"')],
  ["submit endpoint", routes.includes('"/surveys/{survey_id}/responses"')],
  ["dismiss endpoint", routes.includes('@router.post("/surveys/{survey_id}/dismiss"')],
  ["admin CRUD and analytics", routes.includes('"/admin/surveys/analytics"') && routes.includes('"/admin/surveys/responses"') && routes.includes("add_survey_question")],
  ["migration creates all tables", ["surveys", "survey_questions", "survey_responses", "user_survey_events"].every((table) => migration.includes(`"${table}"`))],
  ["survey migration is the only Alembic head", migrationHeads.length === 1 && migrationHeads[0] === "e4f5a6b7c8d9"],
  ["dashboard renders modal", dashboard.includes("<LearningSurveyModal />")],
  ["modal uses backend eligibility and cycle", modal.includes("surveyApi.getEligible") && modal.includes("current.cycle_key") && modal.includes("surveyApi.dismiss")],
  ["non-blocking survey actions", modal.includes("Maybe later") && modal.includes("Close") && modal.includes("Submit feedback")],
  ["admin can manage and filter", admin.includes("Create survey") && admin.includes("Add question") && admin.includes("Needs support") && admin.includes("Monthly satisfaction")],
  ["typed frontend API", api.includes("export const surveyApi") && api.includes("export const surveyAdminApi")],
]

for (const [name, passed] of checks) assert.equal(passed, true, name)
console.log(`Learning survey contract: ${checks.length}/${checks.length} checks passed`)
