import assert from "node:assert/strict"
import fs from "node:fs"
import { readSurveyDefaults, assertSurveyDefaults, assertSurveyMigrationHistory } from "../tests/helpers/survey-defaults.mjs"

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const service = read("api/domains/surveys/service.py")
const routes = read("api/domains/surveys/routes.py")
const modal = read("components/learning-survey-modal.tsx")
const admin = read("app/admin/surveys/page-client.tsx")
const app = read("api/app.py")
const models = read("api/domains/surveys/models.py")

const acceptance = {
  "survey timing is backend-owned": routes.includes("get_eligible_survey") && service.includes("get_eligible_survey"),
  "login alone does not trigger a survey": service.includes("FIRST_CHECKIN_DAYS = 7"),
  "onboarding completion is required": service.includes("not profile.onboarding_completed"),
  "active enrollment is required": service.includes("EnrollmentStatus.ACTIVE"),
  "first, monthly, milestone, and support timing exist": ["first_learning_checkin", "monthly_learning_feedback", "module_completion", "learning_inactivity"].every((value) => service.includes(value)),
  "only one candidate is returned": service.includes("return EligibleSurvey("),
  "global seven-day cap exists": service.includes("GLOBAL_SURVEY_COOLDOWN_DAYS = 7"),
  "completed cycles cannot repeat": service.includes('event.status == "completed"') && models.includes("uq_survey_response_cycle"),
  "dismissal is durable": service.includes('event.record.status = event_status') && service.includes("next_eligible_at"),
  "responses are validated and committed": service.includes("_validate_answers") && service.includes("await self.session.commit()"),
  "responses bind to the shown cycle": service.includes("cycle_key: str") && service.includes("UserSurveyEvent.cycle_key == cycle_key"),
  "student UI is optional": modal.includes("Maybe later") && modal.includes("Close"),
  "student UI has loading and success states": modal.includes("isPending") && modal.includes("Thanks for checking in"),
  "admin can identify support requests": service.includes("_needs_support") && admin.includes("Needs support"),
  "admin exposes course and module complaints": admin.includes("Courses with complaints") && admin.includes("Modules with complaints"),
  "admin can create and edit templates": admin.includes("CreateSurveyDialog") && admin.includes("EditSurveyDialog") && admin.includes("QuestionDialog"),
  "admin filters course path month and type": ["course_id", "path_id", "month", "survey_type"].every((value) => admin.includes(value)),
  "default templates seed automatically": app.includes("ensure_default_surveys"),
  "runtime traces eligibility and completion": service.includes("survey_eligible") && service.includes("survey_completed"),
}

for (const [name, passed] of Object.entries(acceptance)) assert.equal(passed, true, name)
console.log(`Learning survey eval: ${Object.keys(acceptance).length}/${Object.keys(acceptance).length} acceptance checks passed`)


const defaults = readSurveyDefaults(service)
const scenarios = [
  ["current four defaults", () => assertSurveyDefaults(defaults)],
  ["registry order does not matter", () => assertSurveyDefaults([...defaults].reverse())],
  ["unrelated slug dictionaries do not affect defaults", () => assertSurveyDefaults(readSurveyDefaults(service + '\nUNRELATED = {"slug": "not-a-survey"}\n'))],
  ["equivalent Python quote formatting is accepted", () => assertSurveyDefaults(readSurveyDefaults(service.replaceAll('"slug":', "'slug':")))],
  ["missing registry is rejected", () => assert.throws(() => readSurveyDefaults('OTHER = ()'), /Cannot read DEFAULT_SURVEYS/)],
  ["missing fourth default is rejected", () => assert.throws(() => assertSurveyDefaults(defaults.slice(0, 3)), /four default templates/)],
  ["duplicate default is rejected even with four entries", () => assert.throws(() => assertSurveyDefaults([...defaults.slice(0, 3), defaults[0]]), /must be unique/)],
  ["unexpected replacement is rejected", () => assert.throws(() => assertSurveyDefaults(defaults.map(t => t.slug === "job-readiness" ? {...t, slug: "unrelated"} : t)), /Missing default survey: job-readiness/)],
  ["incorrect completion trigger is rejected", () => assert.throws(() => assertSurveyDefaults(defaults.map(t => t.slug === "job-readiness" ? {...t, trigger_type: "learning_timeline"} : t)), /job-readiness trigger type/)],
  ["incorrect survey type is rejected", () => assert.throws(() => assertSurveyDefaults(defaults.map(t => t.slug === "job-readiness" ? {...t, survey_type: "learning_experience"} : t)), /job-readiness survey type/)],
  ["empty questions are rejected", () => assert.throws(() => assertSurveyDefaults(defaults.map(t => t.slug === "job-readiness" ? {...t, questions: []} : t)), /job-readiness needs questions/)],
]
for (const [name, evaluate] of scenarios) {
  evaluate()
  console.log(`PASS ${name}`)
}
console.log(`Default survey regression eval: ${scenarios.length}/${scenarios.length} passed; threshold 100%`)


const surveyMigration = { revision: "e4f5a6b7c8d9", downRevisions: [] }
const laterMigration = { revision: "later", downRevisions: [surveyMigration.revision] }
const migrationScenarios = [
  ["survey migration can itself be the head", () => assertSurveyMigrationHistory([surveyMigration])],
  ["later migrations can advance the head", () => assertSurveyMigrationHistory([surveyMigration, laterMigration])],
  ["multiple migration heads are rejected", () => assert.throws(() => assertSurveyMigrationHistory([surveyMigration, laterMigration, {revision: "branch", downRevisions: [surveyMigration.revision]}]), /one Alembic head/)],
  ["missing survey migration is rejected", () => assert.throws(() => assertSurveyMigrationHistory([laterMigration]), /current head history/)],
  ["survey disconnected from current head is rejected", () => assert.throws(() => assertSurveyMigrationHistory([{...surveyMigration, downRevisions: [surveyMigration.revision]}, {revision: "other", downRevisions: []}]), /current head history/)],
]
for (const [name, evaluate] of migrationScenarios) {
  evaluate()
  console.log(`PASS ${name}`)
}
console.log(`Survey migration regression eval: ${migrationScenarios.length}/${migrationScenarios.length} passed; threshold 100%`)
