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
assert.match(page, /studentReviews\.slice\(0, 4\)\.map/)
assert.match(page, /className="py-20 bg-\[#071c2d\]"/)
assert.match(page, /grid gap-6 md:grid-cols-2 xl:grid-cols-4/)
assert.match(page, /rounded-2xl border border-white\/10 bg-\[#142235\]/)
assert.doesNotMatch(page, /border border-blue-100 bg-white/)
assert.match(page, />student</)
assert.doesNotMatch(page, /Rashnotech Student/)
assert.match(page, /line-clamp-3/)
assert.match(page, /Read more/)
assert.match(page, /See more reviews/)
assert.match(page, /aria-label="5 star review"/)
assert.match(page, /Verified student review/)
assert.match(page, /Start learning with Rashnotech/)

const reviewsStart = page.indexOf("const studentReviews = [")
const mentorsStart = page.indexOf("const mentors = [")
assert.notEqual(reviewsStart, -1)
assert.notEqual(mentorsStart, -1)
const reviewsBlock = page.slice(reviewsStart, mentorsStart)

for (const reviewer of [
  "Ndubuisi Mercy",
  "Molly",
  "Emmanuel Samuel Oluwayinka",
  "Karl Azoms",
]) {
  assert.match(reviewsBlock, new RegExp(reviewer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

for (const removedReviewer of [
  "Callistus Ikwuazom",
  "Prudent Favour Edwin",
  "Francisca Ezeaku",
  "Iyeduala Victoria",
  "Joseph Mathew Taye",
  "AbdulKamal W",
]) {
  assert.doesNotMatch(reviewsBlock, new RegExp(removedReviewer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

assert.match(page, /const mentors = \[/)
assert.match(page, /Meet your mentors/)
assert.match(page, /mentors\.map/)

for (const [mentor, role] of [
  ["Mr. Abdulrasheed Aliyu", "CEO/Founder"],
  ["Mr. Ini Ebong", "Software Engineer"],
  ["Dr. Callistus Ikwuazom", "Cybersecurity"],
  ["Mr Badru Aliyu", "Graphic Designer"],
]) {
  assert.match(page, new RegExp(mentor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(page, new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Homepage content contract: PASS")
