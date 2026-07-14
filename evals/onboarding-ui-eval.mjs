import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  onboarding: await readFile("app/onboarding/page-client.tsx", "utf8"),
  modeSelection: await readFile("app/onboarding/mode-selection/page-client.tsx", "utf8"),
  cohortSelection: await readFile("app/onboarding/cohort-select/page-client.tsx", "utf8"),
  layout: await readFile("app/layout.tsx", "utf8"),
  globals: await readFile("styles/globals.css", "utf8"),
  internshipHeader: await readFile("app/internship/_components/internship-header.tsx", "utf8"),
}

const checks = [
  ["goal selection uses one visible outline", !/ring-(?:1|2) ring-blue-600/.test(files.onboarding)],
  ["self-paced course selection uses one visible outline", !/ring-(?:1|2) ring-purple-600/.test(files.onboarding)],
  ["mode selection uses one visible outline", !/ring-(?:1|2) ring-blue-600/.test(files.modeSelection)],
  ["bootcamp course selection uses one visible outline", !/ring-(?:1|2) ring-blue-600/.test(files.cohortSelection)],
  ["selected cards keep visible selected feedback", /shadow-md shadow-(?:blue|purple)-100/.test(files.onboarding) && /shadow-md shadow-blue-100/.test(files.modeSelection) && /shadow-md shadow-blue-100/.test(files.cohortSelection)],
  ["self-paced course descriptions clamp to three lines", files.onboarding.includes("line-clamp-3") && files.onboarding.includes("min-h-[3.75rem]")],
  ["bootcamp course descriptions clamp to three lines", files.cohortSelection.includes("line-clamp-3") && files.cohortSelection.includes("min-h-[3.75rem]")],
  ["long course names are constrained", files.onboarding.includes("line-clamp-2 font-semibold") && files.cohortSelection.includes("line-clamp-2 font-semibold")],
  ["long path metadata is constrained", files.onboarding.includes("line-clamp-1 text-xs") && files.cohortSelection.includes("truncate text-sm text-gray-500")],
  ["course grids keep cards equal height per row", files.onboarding.includes("grid grid-cols-1 items-stretch") && files.cohortSelection.includes("grid grid-cols-1 items-stretch")],
  ["app UI font is Urbanist instead of Inter or Work Sans", files.layout.includes("Urbanist") && !files.layout.includes("Inter") && !files.layout.includes("Work_Sans") && files.globals.includes("--font-sans: var(--font-urbanist), system-ui, sans-serif;")],
  ["mode selection skips redundant confirmation step", !/showConfirmation|setShowConfirmation|handleConfirm|Confirm:|You're choosing:/.test(files.modeSelection) && files.modeSelection.includes("updateModeMutation.mutate(selectedMode)")],
  ["mode selection prevents duplicate pending submits", files.modeSelection.includes("disabled={!selectedMode || updateModeMutation.isPending}")],
  ["internship header spans both screen edges", files.internshipHeader.includes("fixed inset-x-0 top-0") && files.internshipHeader.includes("h-16 w-full px-4 sm:px-6 lg:px-8") && !files.internshipHeader.includes("container mx-auto")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Onboarding UI eval must pass every acceptance check")
