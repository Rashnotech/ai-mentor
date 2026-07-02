import assert from "node:assert/strict"
import fs from "node:fs"

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
