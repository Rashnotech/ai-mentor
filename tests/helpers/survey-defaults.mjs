import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const expected = [
  ["learning-experience", "learning_experience", "learning_timeline"],
  ["course-difficulty", "course_difficulty", "module_completion"],
  ["support-progress", "support_progress", "learning_inactivity"],
  ["job-readiness", "job_readiness", "course_completion"],
]

export function readSurveyDefaults(source) {
  const result = spawnSync(process.env.PYTHON || "python", [fileURLToPath(new URL("./read-survey-defaults.py", import.meta.url))], {
    input: source, encoding: "utf8", windowsHide: true,
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `Cannot read DEFAULT_SURVEYS: ${result.stderr}`)
  return JSON.parse(result.stdout)
}

export function assertSurveyDefaults(defaults) {
  assert.ok(Array.isArray(defaults), "DEFAULT_SURVEYS must be a sequence")
  assert.equal(defaults.length, expected.length, "four default templates are required")
  const slugs = defaults.map(template => template.slug)
  assert.equal(new Set(slugs).size, slugs.length, "default survey slugs must be unique")
  for (const [slug, surveyType, triggerType] of expected) {
    const template = defaults.find(template => template.slug === slug)
    assert.ok(template, `Missing default survey: ${slug}`)
    assert.equal(template.survey_type, surveyType, `${slug} survey type`)
    assert.equal(template.trigger_type, triggerType, `${slug} trigger type`)
    assert.ok(Array.isArray(template.questions) && template.questions.length > 0, `${slug} needs questions`)
  }
}
export function assertSurveyMigrationHistory(graph) {
  const surveyRevision = "e4f5a6b7c8d9"
  const revisions = new Map(graph.map(entry => [entry.revision, entry.downRevisions]))
  const referenced = new Set(graph.flatMap(entry => entry.downRevisions))
  const heads = graph.filter(entry => !referenced.has(entry.revision))
  assert.equal(heads.length, 1, "survey migration history must have one Alembic head")
  const visited = new Set()
  const pending = [heads[0].revision]
  while (pending.length) {
    const revision = pending.pop()
    if (visited.has(revision)) continue
    visited.add(revision)
    pending.push(...(revisions.get(revision) || []))
  }
  assert.ok(revisions.has(surveyRevision) && visited.has(surveyRevision), "survey migration must be in the current head history")
}
