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
assert.match(page, /Our Expert Facilitators/)
assert.match(page, /Taught by/)
assert.match(page, /pros, not just/)
assert.match(page, /academics\./)
assert.match(
  page,
  /Get coached by industry experts, from CV optimization to interview prep, we\s+provide the end-to-end support needed to land your dream role\./
)
assert.match(page, /mentors\.map/)
assert.match(page, /translate3d\(-\$\{mentorScrollOffset\}px, 0, 0\)/)
assert.match(page, /window\.addEventListener\("scroll", updateMentorScroll/)
assert.match(page, /image: "\/funded\.jpg"/)
assert.match(page, /mentor\.image \?/)
assert.match(page, /src=\{mentor\.image\}/)
assert.match(page, /alt=\{`\$\{mentor\.name\}, \$\{mentor\.role\}`\}/)
assert.match(page, /h-full w-full object-cover object-top/)

const mentorsSectionStart = page.indexOf("{/* Mentors Section */}")
const aiSectionStart = page.indexOf("{/* AI-Powered Interactive Learning Section */}")
assert.notEqual(mentorsSectionStart, -1)
assert.notEqual(aiSectionStart, -1)
const mentorsSection = page.slice(mentorsSectionStart, aiSectionStart)
assert.match(mentorsSection, /lg:h-\[230vh\]/)
assert.match(mentorsSection, /lg:sticky lg:top-16/)
assert.match(page, /if \(scrolledIntoRunway <= 0\) \{/)
assert.match(mentorsSection, /relative z-20 w-full shrink-0 bg-\[#070b14\]/)
assert.match(mentorsSection, /relative z-10 w-full lg:w-\[58%\]/)
assert.doesNotMatch(mentorsSection, /grid/)
assert.doesNotMatch(mentorsSection, /bg-gradient-/)
assert.doesNotMatch(mentorsSection, /Meet your mentors/)

const abdulrasheedStart = page.indexOf('name: "Mr. Abdulrasheed Aliyu"')
const iniStart = page.indexOf('name: "Mr. Ini Ebong"')
assert.notEqual(abdulrasheedStart, -1)
assert.notEqual(iniStart, -1)
const abdulrasheedBlock = page.slice(abdulrasheedStart, iniStart)
assert.match(abdulrasheedBlock, /image: "\/funded\.jpg"/)

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

// Modern Workforce Section contract
const workforceSectionStart = page.indexOf("{/* Modern Workforce Section */}")
const coursesSectionStart = page.indexOf("{/* Courses Section */}")
assert.notEqual(workforceSectionStart, -1)
assert.notEqual(coursesSectionStart, -1)
const workforceSection = page.slice(workforceSectionStart, coursesSectionStart)

assert.match(page, /const workforcePillars = \[/)
assert.match(page, /icon: LogIn/)
assert.match(page, /icon: UserCheck/)
assert.match(page, /icon: Presentation/)
assert.match(workforceSection, /<IconComponent className="h-6 w-6/)
assert.match(workforceSection, /Skills for the/)
assert.match(workforceSection, /Modern Workforce/)
assert.match(workforceSection, /Start Where You Are\. Build Skills That Actually Pay\./)
assert.match(workforceSection, /Explore Courses/)
assert.match(workforceSection, /href="\/courses"/)
assert.match(workforceSection, /onMouseEnter=\{\(\) => setActiveWorkforceCard\(index\)\}/)
assert.match(workforceSection, /hover:-translate-y-3\.5/)
assert.doesNotMatch(workforceSection, /<svg/)
assert.doesNotMatch(workforceSection, /bg-gradient-/)
assert.doesNotMatch(workforceSection, /[\u{1F300}-\u{1FAFF}]/u)

for (const pillar of [
  "Easy Registration",
  "Start your data journey in seconds. Our seamless registration process gets you into the classroom without the administrative headache.",
  "Expert Facilitator",
  "Learn from the pros. Our facilitators are world-class data experts currently leading teams at top global tech firms.",
  "Online Courses",
  "Master the right tools and gain expertise through hands-on projects designed to mirror real-world business challenges from anywhere in the world.",
]) {
  assert.match(page, new RegExp(pillar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Homepage content contract: PASS")
