import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")

for (const programme of [
  "Python Programming",
  "Web Development",
  "Software Engineering",
  "AI Engineering",
]) {
  assert.match(page, new RegExp(programme))
}

for (const removed of [
  "Content Creation",
  "Freelancer Academy",
  "Founder Academy",
  "More Opportunity. More Impact.",
  "Explore the Companies Investing in our Talent",
]) {
  assert.doesNotMatch(page, new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

assert.match(page, /Why choose Rashnotech/)
assert.match(page, /const studentReviews = \[/)
assert.match(page, /studentReviews\.map/)
assert.match(page, /bg-\[#e8f4f8\]/)
assert.match(page, /columns-1 gap-6 space-y-6 md:columns-2 xl:columns-3/)
assert.match(page, /Rashnotech Student/)
assert.match(page, /aria-label="5 star review"/)
assert.match(page, /Verified learner review/)
assert.match(page, /Start learning with Rashnotech/)

for (const reviewer of [
  "Ndubuisi Mercy",
  "Molly",
  "Emmanuel Samuel Oluwayinka",
  "Callistus Ikwuazom",
  "Karl Azoms",
  "Prudent Favour Edwin",
  "Francisca Ezeaku",
  "Iyeduala Victoria",
  "Joseph Mathew Taye",
  "AbdulKamal W",
]) {
  assert.match(page, new RegExp(reviewer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Homepage content contract: PASS (28/28)")
