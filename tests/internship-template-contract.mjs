import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  landing: await readFile("app/internship/page.tsx", "utf8"),
  createProfile: await readFile("app/internship/create-profile/page.tsx", "utf8"),
  verification: await readFile("app/internship/verification/page.tsx", "utf8"),
  chooseTrack: await readFile("app/internship/choose-track/page.tsx", "utf8"),
  acceptance: await readFile("app/internship/get-acceptance/page.tsx", "utf8"),
  stepper: await readFile("app/internship/_components/internship-stepper.tsx", "utf8"),
}

const internshipPages = [
  files.landing,
  files.createProfile,
  files.verification,
  files.chooseTrack,
  files.acceptance,
]

for (const source of internshipPages) {
  assert.match(source, /bg-\[#071c2d\]/, "internship page should use the dark navy template background")
  assert.match(source, /bg-\[#24354c\]/, "internship page should use the slate template card")
  assert.match(source, /InternshipStepper/, "internship page should use the shared stepper")
}

assert.doesNotMatch(files.landing, /Who can apply/, "landing page should not render the old who-can-apply card")
assert.doesNotMatch(files.landing, /Verification process/, "landing page should not render the old verification process card")
assert.doesNotMatch(files.landing, /studentTypes/, "old student type side-card data should be removed")
assert.doesNotMatch(files.landing, /verificationDocs/, "old verification side-card data should be removed")

assert.match(files.createProfile, /Account details/, "profile form should use the account-details template heading")
assert.match(files.createProfile, /h-\[72px\]/, "profile inputs should use the taller template input structure")
assert.match(files.createProfile, /bg-\[#7b8794\]/, "profile inputs should use gray template input blocks")
assert.match(files.createProfile, /First Name/, "profile form should keep first-name field")
assert.match(files.createProfile, /Phone Number/, "profile form should keep phone-number field")

assert.match(files.verification, /Student verification/, "verification step should keep student verification heading")
assert.match(files.verification, /bg-\[#7b8794\]/, "verification inputs should use gray template input blocks")
assert.match(files.chooseTrack, /Course search/, "track page should keep course search")
assert.match(files.acceptance, /Application submitted/, "acceptance page should keep final-state messaging")
assert.match(files.stepper, /bg-emerald-400/, "stepper should show completed steps with template green")

console.log("Internship template contract: PASS")
