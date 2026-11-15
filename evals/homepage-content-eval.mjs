import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")

const reviewsStart = page.indexOf("const studentReviews = [")
const mentorsStart = page.indexOf("const mentors = [")
const reviewsBlock = reviewsStart >= 0 && mentorsStart > reviewsStart
  ? page.slice(reviewsStart, mentorsStart)
  : ""
const mentorsSectionStart = page.indexOf("{/* Mentors Section */}")
const aiSectionStart = page.indexOf("{/* AI-Powered Interactive Learning Section */}")
const mentorsSection = mentorsSectionStart >= 0 && aiSectionStart > mentorsSectionStart
  ? page.slice(mentorsSectionStart, aiSectionStart)
  : ""
const abdulrasheedStart = page.indexOf('name: "Mr. Abdulrasheed Aliyu"')
const iniStart = page.indexOf('name: "Mr. Ini Ebong"')
const abdulrasheedBlock = abdulrasheedStart >= 0 && iniStart > abdulrasheedStart
  ? page.slice(abdulrasheedStart, iniStart)
  : ""
const workforceSectionStart = page.indexOf("{/* Modern Workforce Section */}")
const coursesSectionStart = page.indexOf("{/* Courses Section */}")
const workforceSection = workforceSectionStart >= 0 && coursesSectionStart > workforceSectionStart
  ? page.slice(workforceSectionStart, coursesSectionStart)
  : ""

const checks = [
  ["footer includes the requested technical programmes", ["Python Programming", "Web Development", "Software Engineering", "AI Engineering"].every((label) => page.includes(label))],
  ["removed old academy labels", !["Content Creation", "Freelancer Academy", "Founder Academy"].some((label) => page.includes(label))],
  ["impact stats headline replaced", page.includes("Why choose Rashnotech") && !page.includes("More Opportunity. More Impact.")],
  ["company logo strip replaced by four reviews", page.includes("studentReviews.slice(0, 4).map") && !page.includes("Explore the Companies Investing in our Talent")],
  ["review section uses dark background", page.includes('className="py-20 bg-[#071c2d]"')],
  ["reviews use four-card grid layout", page.includes("grid gap-6 md:grid-cols-2 xl:grid-cols-4")],
  ["reviews use dark cards", page.includes("rounded-2xl border border-white/10 bg-[#142235]") && !page.includes("border border-blue-100 bg-white")],
  ["reviews are labelled as students", page.includes(">student<") && !page.includes("Rashnotech Student")],
  ["reviews show short preview plus more link", page.includes("line-clamp-3") && page.includes("Read more") && page.includes("See more reviews")],
  ["reviews show five-star context", page.includes('aria-label="5 star review"') && page.includes("Star key={star}")],
  ["only four requested reviews are represented", ["Ndubuisi Mercy", "Molly", "Emmanuel Samuel Oluwayinka", "Karl Azoms"].every((name) => reviewsBlock.includes(name)) && !["Callistus Ikwuazom", "Prudent Favour Edwin", "Francisca Ezeaku", "Iyeduala Victoria", "Joseph Mathew Taye", "AbdulKamal W"].some((name) => reviewsBlock.includes(name))],
  ["mentor section follows the reference layout", page.includes("const mentors = [") && mentorsSection.includes("Our Expert Facilitators") && mentorsSection.includes("Taught by") && mentorsSection.includes("pros, not just") && mentorsSection.includes("academics.") && mentorsSection.includes("mentors.map") && mentorsSection.includes("bg-[#070b14]")],
  ["mentor section scrolls portraits left behind the fixed left text column", mentorsSection.includes("relative z-20 w-full shrink-0 bg-[#070b14]") && mentorsSection.includes("relative z-10 w-full lg:w-[58%]") && mentorsSection.includes("translate3d(-${mentorScrollOffset}px, 0, 0)") && page.includes('window.addEventListener("scroll", updateMentorScroll') && !mentorsSection.includes("grid") && !mentorsSection.includes("bg-gradient-")],
  ["mentor portraits use vertical portrait cards with scrim overlay", mentorsSection.includes("rounded-[24px]") && mentorsSection.includes("h-[380px] w-[260px]") && mentorsSection.includes("sm:h-[420px] sm:w-[285px]")],
  ["Abdulrasheed mentor uses funded photo", abdulrasheedBlock.includes('image: "/funded.jpg"') && mentorsSection.includes("mentor.image ?") && mentorsSection.includes("src={mentor.image}") && mentorsSection.includes("h-full w-full object-cover object-top")],
  ["mentor roster is represented", ["Mr. Abdulrasheed Aliyu", "CEO/Founder", "Mr. Ini Ebong", "Software Engineer", "Dr. Callistus Ikwuazom", "Cybersecurity", "Mr Badru Aliyu", "Graphic Designer"].every((label) => page.includes(label))],
  ["mentor topics are represented", ["Leadership and product strategy", "Modern software engineering", "Cybersecurity and digital safety", "Visual design and branding"].every((label) => page.includes(label))],
  ["section has a conversion action", page.includes("Start learning with Rashnotech")],
  ["modern workforce section includes heading, copy, and CTA", workforceSection.includes("Skills for the") && workforceSection.includes("Modern Workforce") && workforceSection.includes("Start Where You Are. Build Skills That Actually Pay.") && workforceSection.includes("Explore Courses")],
  ["modern workforce section includes all three feature cards", ["Easy Registration", "Expert Facilitator", "Online Courses"].every((title) => page.includes(title))],
  ["modern workforce section uses SVG icons without emojis or gradients", !workforceSection.includes("bg-gradient-") && !/[\u{1F300}-\u{1FAFF}]/u.test(workforceSection) && page.includes("const renderWorkforceIcon")],
  ["modern workforce cards support interactive hover and micro-animation", workforceSection.includes("onMouseEnter={() => setActiveWorkforceCard(index)}") && workforceSection.includes("hover:-translate-y-3.5") && page.includes("group-hover:scale-110")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Homepage content eval must pass every acceptance check")
