import { readFile } from "node:fs/promises"

const files = {
  landing: await readFile("app/internship/page.tsx", "utf8"),
  createProfile: await readFile("app/internship/create-profile/page.tsx", "utf8"),
  verification: await readFile("app/internship/verification/page.tsx", "utf8"),
  chooseTrack: await readFile("app/internship/choose-track/page.tsx", "utf8"),
  acceptance: await readFile("app/internship/get-acceptance/page.tsx", "utf8"),
  stepper: await readFile("app/internship/_components/internship-stepper.tsx", "utf8"),
}

const allPages = [
  files.landing,
  files.createProfile,
  files.verification,
  files.chooseTrack,
  files.acceptance,
]

const checks = [
  ["all internship pages use the same navy background", allPages.every((source) => source.includes("bg-[#071c2d]"))],
  ["all internship pages use the same slate card color", allPages.every((source) => source.includes("bg-[#24354c]"))],
  ["all internship pages use the shared stepper", allPages.every((source) => source.includes("InternshipStepper"))],
  ["old who-can-apply card removed", !files.landing.includes("Who can apply") && !files.landing.includes("studentTypes")],
  ["old verification-process side card removed", !files.landing.includes("Verification process") && !files.landing.includes("verificationDocs")],
  ["profile form follows compact account-details template", files.createProfile.includes("Account details") && files.createProfile.includes("h-[58px]")],
  ["form controls use gray template blocks", [files.createProfile, files.verification, files.chooseTrack].every((source) => source.includes("bg-[#7b8794]"))],
  ["internship progression remains intact", files.landing.includes("/internship/create-profile") && files.createProfile.includes("/internship/verification") && files.verification.includes("/internship/choose-track") && files.chooseTrack.includes("/internship/get-acceptance")],
  ["final acceptance messaging remains intact", files.acceptance.includes("Application submitted") && files.acceptance.includes("Go to Dashboard")],
  ["step tracker fits mobile without horizontal scrolling", files.stepper.includes("grid grid-cols-4") && !files.stepper.includes("overflow-x-auto") && !files.stepper.includes("min-w-max")],
  ["internship accents use blue instead of green", files.stepper.includes("bg-blue-500") && !files.stepper.includes("emerald") && allPages.every((source) => !source.includes("emerald"))],
]

const passed = checks.filter(([, ok]) => ok).length
const total = checks.length

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
}

const score = Math.round((passed / total) * 100)
console.log(`SCORE ${score}% (${passed}/${total})`)

if (score < 100) {
  process.exitCode = 1
}
