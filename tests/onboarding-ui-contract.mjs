import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const source = {
  onboarding: await readFile("app/onboarding/page-client.tsx", "utf8"),
  modeSelection: await readFile("app/onboarding/mode-selection/page-client.tsx", "utf8"),
  cohortSelection: await readFile("app/onboarding/cohort-select/page-client.tsx", "utf8"),
  layout: await readFile("app/layout.tsx", "utf8"),
  appGlobals: await readFile("app/globals.css", "utf8"),
  legacyGlobals: await readFile("styles/globals.css", "utf8"),
  internshipHeader: await readFile("app/internship/_components/internship-header.tsx", "utf8"),
  tsconfigGate: await readFile("tsconfig.gate.json", "utf8"),
}

assert.doesNotMatch(source.onboarding, /ring-(?:1|2) ring-(?:blue|purple)-600/)
assert.doesNotMatch(source.modeSelection, /ring-(?:1|2) ring-blue-600/)
assert.doesNotMatch(source.cohortSelection, /ring-(?:1|2) ring-blue-600/)

assert.match(source.onboarding, /shadow-md shadow-blue-100/)
assert.match(source.onboarding, /shadow-md shadow-purple-100/)
assert.match(source.modeSelection, /shadow-md shadow-blue-100/)
assert.match(source.cohortSelection, /shadow-md shadow-blue-100/)

assert.match(source.onboarding, /line-clamp-3/)
assert.match(source.onboarding, /min-h-\[3\.75rem\]/)
assert.match(source.cohortSelection, /line-clamp-3/)
assert.match(source.cohortSelection, /min-h-\[3\.75rem\]/)

assert.match(source.onboarding, /line-clamp-2 font-semibold/)
assert.match(source.onboarding, /line-clamp-1 text-xs/)
assert.match(source.cohortSelection, /line-clamp-2 font-semibold/)
assert.match(source.cohortSelection, /truncate text-sm text-gray-500/)

assert.match(source.onboarding, /grid grid-cols-1 items-stretch/)
assert.match(source.cohortSelection, /grid grid-cols-1 items-stretch/)

assert.match(source.layout, /family=Urbanist:ital,wght@0,100\.\.900;1,100\.\.900&display=swap/)
assert.doesNotMatch(source.layout, /Inter/)
assert.doesNotMatch(source.layout, /Work_Sans/)
assert.doesNotMatch(source.layout, /next\/font\/google/)
assert.match(source.layout, /import "\.\/globals\.css"/)
assert.match(source.layout, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/)
assert.match(source.layout, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossOrigin=""/)
assert.match(source.appGlobals, /--font-sans: "Urbanist", system-ui, sans-serif;/)
assert.match(source.appGlobals, /--font-mono: ui-monospace/)
assert.doesNotMatch(source.appGlobals, /--font-sans: var\(--font-sans\);/)
assert.match(source.legacyGlobals, /--font-sans: "Urbanist", system-ui, sans-serif;/)

assert.doesNotMatch(source.modeSelection, /showConfirmation|setShowConfirmation|handleConfirm|Confirm:|You're choosing:/)
assert.match(source.modeSelection, /updateModeMutation\.mutate\(selectedMode\)/)
assert.match(source.modeSelection, /disabled=\{!selectedMode \|\| updateModeMutation\.isPending\}/)

assert.doesNotMatch(source.internshipHeader, /container mx-auto/)
assert.match(source.internshipHeader, /fixed inset-x-0 top-0/)
assert.match(source.internshipHeader, /h-16 w-full px-4 sm:px-6 lg:px-8/)

for (const path of [
  "app/onboarding/page-client.tsx",
  "app/onboarding/mode-selection/page-client.tsx",
  "app/onboarding/cohort-select/page-client.tsx",
  "app/internship/_components/internship-header.tsx",
]) {
  assert.match(source.tsconfigGate, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Onboarding UI contract: PASS (35/35)")
