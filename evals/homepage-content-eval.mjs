import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")
const globalsCss = await readFile("app/globals.css", "utf8")

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
  ["mentor section scrolls portraits left behind the fixed left text column with equal desktop height and mobile swipe support", mentorsSection.includes("lg:h-[230vh]") && mentorsSection.includes("lg:sticky lg:top-16") && page.includes("if (scrolledIntoRunway <= 0) {") && mentorsSection.includes("lg:items-stretch") && mentorsSection.includes("lg:z-20 lg:h-[420px] lg:w-[42%]") && mentorsSection.includes("lg:before:inset-y-0") && mentorsSection.includes("relative z-30 -mt-3") && mentorsSection.includes("lg:z-10 lg:mt-0 lg:h-[420px] lg:w-[58%]") && mentorsSection.includes("onTouchStart={handleMentorTouchStart}") && mentorsSection.includes("onTouchMove={handleMentorTouchMove}") && page.includes("mentorTouchStartOffsetRef.current - deltaX") && mentorsSection.includes("translate3d(-${mentorScrollOffset}px, 0, 0)") && page.includes('window.addEventListener("scroll", updateMentorScroll') && !mentorsSection.includes("grid") && !mentorsSection.includes("bg-gradient-")],
  ["mentor portraits use vertical portrait cards with scrim overlay", mentorsSection.includes("rounded-[24px]") && mentorsSection.includes("h-[380px] w-[260px]") && mentorsSection.includes("sm:h-[420px] sm:w-[285px]")],
  ["Abdulrasheed mentor uses funded photo", abdulrasheedBlock.includes('image: "/funded.jpg"') && mentorsSection.includes("mentor.image ?") && mentorsSection.includes("src={mentor.image}") && mentorsSection.includes("h-full w-full object-cover object-top")],
  ["mentor roster is represented", ["Mr. Abdulrasheed Aliyu", "CEO/Founder", "Mr. Ini Ebong", "Software Engineer", "Dr. Callistus Ikwuazom", "Cybersecurity", "Mr Badru Aliyu", "Graphic Designer"].every((label) => page.includes(label))],
  ["mentor topics are represented", ["Leadership and product strategy", "Modern software engineering", "Cybersecurity and digital safety", "Visual design and branding"].every((label) => page.includes(label))],
  ["section has a conversion action", page.includes("Start learning with Rashnotech")],
  ["modern workforce section includes heading, copy, and CTA", workforceSection.includes("Skills for the") && workforceSection.includes("Modern Workforce") && workforceSection.includes("Start Where You Are. Build Skills That Actually Pay.") && workforceSection.includes("Explore Courses")],
  ["modern workforce section includes all three feature cards", ["Easy Registration", "Expert Facilitator", "Online Courses"].every((title) => page.includes(title))],
  ["modern workforce section uses real Lucide icons without emojis or gradients", !workforceSection.includes("bg-gradient-") && !workforceSection.includes("<svg") && !/[\u{1F300}-\u{1FAFF}]/u.test(workforceSection) && ["icon: LogIn", "icon: UserCheck", "icon: Presentation"].every((icon) => page.includes(icon)) && workforceSection.includes("<IconComponent")],
  ["modern workforce cards default to first card active in blue with remaining two in white and uncompressed width", page.includes("const [activeWorkforceCard, setActiveWorkforceCard] = useState<number>(0)") && workforceSection.includes("onMouseLeave={() => setActiveWorkforceCard(0)}") && workforceSection.includes('? "z-30 animate-card-float border border-[#1e40af] bg-[#1d4ed8] text-white') && workforceSection.includes(': "z-10 border border-slate-200/90 bg-white text-[#071c2d]') && workforceSection.includes("max-w-[1536px]") && workforceSection.includes("lg:w-[71%]") && !workforceSection.includes("lg:-ml-5")],
  ["modern workforce cards support interactive hover and micro-animation", workforceSection.includes("onMouseEnter={() => setActiveWorkforceCard(index)}") && workforceSection.includes("hover:-translate-y-3.5") && workforceSection.includes("animate-card-float") && workforceSection.includes("animate-ring-pulse") && workforceSection.includes("group-hover:-rotate-6") && workforceSection.includes("group-hover:scale-110") && globalsCss.includes("@keyframes card-float")],
  ["hero secondary CTA displays AI for Business and links to courses", page.includes("AI for Business") && !page.includes("AI-mentor for Business") && page.includes('href="/courses"')],
  ["tech logos scroll across the screen in a continuous marquee", page.includes("animate-marquee") && page.includes("[...techLogos, ...techLogos].map") && globalsCss.includes("@keyframes marquee")],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Homepage content eval must pass every acceptance check")
