import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")

const checks = [
  ["footer includes the requested technical programmes", ["Python Programming", "Web Development", "Software Engineering", "AI Engineering"].every((label) => page.includes(label))],
  ["removed old academy labels", !["Content Creation", "Freelancer Academy", "Founder Academy"].some((label) => page.includes(label))],
  ["impact stats headline replaced", page.includes("Why choose Rashnotech") && !page.includes("More Opportunity. More Impact.")],
  ["company logo strip replaced by reviews", page.includes("studentReviews.map") && !page.includes("Explore the Companies Investing in our Talent")],
  ["review section keeps current light blue background", page.includes('className="py-20 bg-[#e8f4f8]"')],
  ["reviews use masonry card layout", page.includes("columns-1 gap-6 space-y-6 md:columns-2 xl:columns-3") && page.includes("break-inside-avoid rounded-xl")],
  ["reviews are labelled as students", page.includes("Rashnotech Student")],
  ["reviews show five-star context", page.includes('aria-label="5 star review"') && page.includes("Star key={star}")],
  ["all supplied reviewers are represented", ["Ndubuisi Mercy", "Molly", "Emmanuel Samuel Oluwayinka", "Callistus Ikwuazom", "Karl Azoms", "Prudent Favour Edwin", "Francisca Ezeaku", "Iyeduala Victoria", "Joseph Mathew Taye", "AbdulKamal W"].every((name) => page.includes(name))],
  ["section has a conversion action", page.includes("Start learning with Rashnotech")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Homepage content eval must pass every acceptance check")
