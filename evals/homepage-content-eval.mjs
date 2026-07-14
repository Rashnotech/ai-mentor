import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")

const reviewsStart = page.indexOf("const studentReviews = [")
const mentorsStart = page.indexOf("const mentors = [")
const reviewsBlock = reviewsStart >= 0 && mentorsStart > reviewsStart
  ? page.slice(reviewsStart, mentorsStart)
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
  ["mentor section is present", page.includes("const mentors = [") && page.includes("Meet your mentors") && page.includes("mentors.map")],
  ["mentor roster is represented", ["Mr. Abdulrasheed Aliyu", "CEO/Founder", "Mr. Ini Ebong", "Software Engineer", "Dr. Callistus Ikwuazom", "Cybersecurity", "Mr Badru Aliyu", "Graphic Designer"].every((label) => page.includes(label))],
  ["section has a conversion action", page.includes("Start learning with Rashnotech")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Homepage content eval must pass every acceptance check")
