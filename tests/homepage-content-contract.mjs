import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")
const globalsCss = await readFile("app/globals.css", "utf8")

assert.match(page, /AI for Business/)
assert.doesNotMatch(page, /AI-mentor for Business/)
assert.match(page, /animate-marquee/)
assert.match(page, /\[\.\.\.techLogos, \.\.\.techLogos\]\.map/)
assert.match(globalsCss, /@keyframes marquee/)
assert.match(globalsCss, /@keyframes card-float/)
assert.match(globalsCss, /@keyframes ring-pulse/)

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

assert.match(page, /What people say/)
assert.match(page, /Thousands of career pivots, one common factor/)
assert.doesNotMatch(page, /Why choose Rashnotech/)
assert.match(page, /const \[reviewsSpreadProgress, setReviewsSpreadProgress\] = useState<number>\(0\)/)
assert.match(page, /const startTrigger = vpHeight \* 0\.28/)
assert.match(page, /const endTrigger = -vpHeight \* 0\.08/)
assert.match(page, /const stackedTranslateXPercent = Number\(\(\(1\.5 - index\) \* 103\.5 \* collapseFactor\)\.toFixed\(2\)\)/)
assert.match(page, /const stackedTranslateYPx = Number\(\(\[18, 6, -8, -22\]\[index\] \* collapseFactor\)\.toFixed\(2\)\)/)
assert.match(page, /const stackedRotateDeg = Number\(\(\[-7, -2\.5, 3, 8\]\[index\] \* collapseFactor\)\.toFixed\(2\)\)/)
assert.match(
  page,
  /translate3d\(\$\{stackedTranslateXPercent\}%, \$\{stackedTranslateYPx\}px, 0\) rotate\(\$\{stackedRotateDeg\}deg\) scale\(\$\{stackedScale\}\)/
)
assert.match(page, /const studentReviews = \[/)
assert.match(page, /studentReviews\.slice\(0, 4\)\.map/)
assert.match(page, /className="py-20 bg-\[#071c2d\]"/)
assert.match(page, /grid gap-6 md:grid-cols-4/)
assert.match(page, /rounded-2xl border border-white\/15 \$\{deckBgTone\}/)
assert.doesNotMatch(page, /border border-blue-100 bg-white/)
assert.match(page, />student</)
assert.doesNotMatch(page, /Rashnotech Student/)
assert.match(page, /line-clamp-3/)
assert.match(page, /Read more/)
assert.match(page, /See more reviews/)
assert.match(page, /aria-label="5 star review"/)
assert.match(page, /Verified student review/)
assert.doesNotMatch(page, /Start learning with Rashnotech/)

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
assert.match(page, /image: "https:\/\/i\.postimg\.cc\/TPNQgrwF\/Gemini-Generated-Image-kvomw3kvomw3kvom\.jpg"/)
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
assert.match(mentorsSection, /lg:items-stretch/)
assert.match(mentorsSection, /lg:z-20 lg:h-\[420px\] lg:w-\[42%\]/)
assert.match(mentorsSection, /lg:before:inset-y-0/)
assert.match(mentorsSection, /relative z-30 -mt-3 .* lg:z-10 lg:mt-0 lg:h-\[420px\] lg:w-\[58%\]/)
assert.match(mentorsSection, /onTouchStart=\{handleMentorTouchStart\}/)
assert.match(mentorsSection, /onTouchMove=\{handleMentorTouchMove\}/)
assert.match(page, /mentorTouchStartOffsetRef\.current - deltaX/)
assert.doesNotMatch(mentorsSection, /grid/)
assert.doesNotMatch(mentorsSection, /bg-gradient-/)
assert.doesNotMatch(mentorsSection, /Meet your mentors/)

const abdulrasheedStart = page.indexOf('name: "Mr. Abdulrasheed Aliyu"')
const iniStart = page.indexOf('name: "Mr. Ini Ebong"')
assert.notEqual(abdulrasheedStart, -1)
assert.notEqual(iniStart, -1)
const abdulrasheedBlock = page.slice(abdulrasheedStart, iniStart)
assert.match(abdulrasheedBlock, /image: "https:\/\/i\.postimg\.cc\/TPNQgrwF\/Gemini-Generated-Image-kvomw3kvomw3kvom\.jpg"/)

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
assert.match(page, /const \[activeWorkforceCard, setActiveWorkforceCard\] = useState<number>\(0\)/)
assert.match(workforceSection, /onMouseLeave=\{\(\) => setActiveWorkforceCard\(0\)\}/)
assert.match(workforceSection, /max-w-\[1536px\]/)
assert.match(workforceSection, /grid w-full flex-1 grid-cols-1 gap-6 md:grid-cols-3 lg:w-\[71%\]/)
assert.doesNotMatch(workforceSection, /lg:-ml-5/)
assert.match(
  workforceSection,
  /\? "z-30 animate-card-float border border-\[#1e40af\] bg-\[#1d4ed8\] text-white/
)
assert.match(
  workforceSection,
  /: "z-10 border border-slate-200\/90 bg-white text-\[#071c2d\]/
)
assert.match(workforceSection, /onMouseEnter=\{\(\) => setActiveWorkforceCard\(index\)\}/)
assert.match(workforceSection, /hover:-translate-y-3\.5/)
assert.match(workforceSection, /animate-card-float/)
assert.match(workforceSection, /animate-ring-pulse/)
assert.match(workforceSection, /group-hover:-rotate-6/)
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

// Courses Section contract
const reviewsSectionStart = page.indexOf("{/* Student Reviews Section */}")
assert.notEqual(reviewsSectionStart, -1)
const coursesSection = page.slice(coursesSectionStart, reviewsSectionStart)
assert.match(coursesSection, /id="courses" className="py-24 bg-white text-gray-900"/)
assert.match(coursesSection, /Our Popular Courses/)
assert.match(coursesSection, /Expert-led course\. Global Skills/)
assert.match(coursesSection, /<CourseCover src=\{course\.cover_image_url\} title=\{course\.title\} \/>/)
assert.match(coursesSection, /Enroll now/)
assert.match(coursesSection, /Find your perfect fit/)
assert.doesNotMatch(coursesSection, /A path for every goal/)
assert.doesNotMatch(coursesSection, /Top Courses/)
assert.doesNotMatch(coursesSection, /Explore Catalog/)

// Frequently Asked Questions Section contract
const faqSectionStart = page.indexOf("{/* Frequently Asked Questions Section */}")
const footerStart = page.indexOf("{/* Footer */}")
assert.notEqual(faqSectionStart, -1)
assert.notEqual(footerStart, -1)
assert.ok(faqSectionStart < footerStart, "FAQ section must appear before Footer")
const faqSection = page.slice(faqSectionStart, footerStart)
assert.match(faqSection, /FAQs/)
assert.match(faqSection, /Frequently Asked Questions/)
assert.match(faqSection, /Do you have more questions\?/)
assert.match(faqSection, /Contact us/)
assert.match(faqSection, /For enquiries contact/)

for (const question of [
  "What is the minimum age or qualification required?",
  "Is there a community for students?",
  "How long are the programs to run for?",
  "Can I take more than one course at a time?",
  "Which of your programs is the highest paid tech job?",
]) {
  assert.match(page, new RegExp(question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

// Navigation & Services Page contract
const publicHeader = await readFile("components/public-site-header.tsx", "utf8")
const servicesPage = await readFile("app/services/page-client.tsx", "utf8")
const rootLayout = await readFile("app/layout.tsx", "utf8")

assert.doesNotMatch(page, /AI Features/)
assert.doesNotMatch(publicHeader, /AI Features/)
assert.match(page, />[\s\r\n]*Research[\s\r\n]*</)
assert.match(page, /href="\/services"/)
assert.match(publicHeader, /label: "Research"/)
assert.match(publicHeader, /label: "Services", href: "\/services"/)

// Custom cookie banner removed in favor of external CMP provider
assert.doesNotMatch(rootLayout, /CookieConsentBanner/)

// Services page frame & catalog contract
assert.match(servicesPage, /\+234 8172992396/)
assert.match(servicesPage, /tel:\+2348172992396/)
assert.doesNotMatch(servicesPage, /\+1 \(646\) 212-1626/)
assert.doesNotMatch(servicesPage, /Add Service/)
assert.doesNotMatch(servicesPage, /BrandDualDot/)
assert.match(servicesPage, /Elevate Your Brand With Us/)
assert.match(servicesPage, /Empowering Your Success with Digital Expertise/)
assert.match(servicesPage, /Boost Your Brand with Our Expertise/)
for (const serviceName of [
  "App Development",
  "Product Design",
  "Project Research",
  "AI Automation",
  "E-Commerce",
  "Site Reliability Engineer",
  "Cloud Architecture",
  "Cybersecurity",
  "Corporate & School Training",
]) {
  assert.match(servicesPage, new RegExp(serviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

console.log("Homepage content contract: PASS")
