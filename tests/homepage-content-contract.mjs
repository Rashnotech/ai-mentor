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
assert.match(page, /Learn from experts at Rashnotech/)
assert.match(page, /mentors\.map/)
assert.match(page, /className="bg-\[#f6f8ff\] py-20 md:py-28"/)
assert.match(page, /flex flex-col items-center justify-between gap-14 lg:flex-row lg:items-start lg:gap-8/)
assert.match(page, /rounded-full bg-gradient-to-br \$\{mentor\.accent\} p-2/)
assert.match(page, /h-44 w-44 .* md:h-52 md:w-52/)

const mentorsSectionStart = page.indexOf("{/* Mentors Section */}")
const aiSectionStart = page.indexOf("{/* AI-Powered Interactive Learning Section */}")
assert.notEqual(mentorsSectionStart, -1)
assert.notEqual(aiSectionStart, -1)
const mentorsSection = page.slice(mentorsSectionStart, aiSectionStart)
assert.doesNotMatch(mentorsSection, /grid/)
assert.doesNotMatch(mentorsSection, /rounded-2xl/)
assert.doesNotMatch(mentorsSection, /Meet your mentors/)

for (const [mentor, role] of [
  ["Mr. Abdulrasheed Aliyu", "CEO/Founder"],
  ["Mr. Ini Ebong", "Software Engineer"],
  ["Dr. Callistus Ikwuazom", "Cybersecurity"],
  ["Mr Badru Aliyu", "Graphic Designer"],
]) {
  assert.match(page, new RegExp(mentor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(page, new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

for (const topic of [
  "Leadership and product strategy",
  "Modern software engineering",
  "Cybersecurity and digital safety",
  "Visual design and branding",
]) {
  assert.match(page, new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Homepage content contract: PASS")
