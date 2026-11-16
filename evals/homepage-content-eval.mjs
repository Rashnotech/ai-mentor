import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const page = await readFile("app/page-client.tsx", "utf8")
const globalsCss = await readFile("app/globals.css", "utf8")
const publicHeader = await readFile("components/public-site-header.tsx", "utf8")
const servicesPage = await readFile("app/services/page-client.tsx", "utf8")
const rootLayout = await readFile("app/layout.tsx", "utf8")

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
const reviewsSectionStart = page.indexOf("{/* Student Reviews Section */}")
const faqSectionStart = page.indexOf("{/* Frequently Asked Questions Section */}")
const footerStart = page.indexOf("{/* Footer */}")
const workforceSection = workforceSectionStart >= 0 && coursesSectionStart > workforceSectionStart
  ? page.slice(workforceSectionStart, coursesSectionStart)
  : ""
const coursesSection = coursesSectionStart >= 0 && reviewsSectionStart > coursesSectionStart
  ? page.slice(coursesSectionStart, reviewsSectionStart)
  : ""
const faqSection = faqSectionStart >= 0 && footerStart > faqSectionStart
  ? page.slice(faqSectionStart, footerStart)
  : ""

const checks = [
  ["footer includes the requested technical programmes", ["Python Programming", "Web Development", "Software Engineering", "AI Engineering"].every((label) => page.includes(label))],
  ["removed old academy labels", !["Content Creation", "Freelancer Academy", "Founder Academy"].some((label) => page.includes(label))],
  ["reviews section displays What people say and fans out from a grouped deck on scroll", page.includes("What people say") && page.includes("Thousands of career pivots, one common factor") && !page.includes("Why choose Rashnotech") && !page.includes("More Opportunity. More Impact.") && page.includes("const [reviewsSpreadProgress, setReviewsSpreadProgress] = useState<number>(0)") && page.includes("const startTrigger = vpHeight * 0.28") && page.includes("const stackedRotateDeg = Number(([-7, -2.5, 3, 8][index] * collapseFactor).toFixed(2))") && page.includes("translate3d(${stackedTranslateXPercent}%, ${stackedTranslateYPx}px, 0) rotate(${stackedRotateDeg}deg) scale(${stackedScale})")],
  ["company logo strip replaced by four reviews", page.includes("studentReviews.slice(0, 4).map") && !page.includes("Explore the Companies Investing in our Talent")],
  ["review section uses dark background", page.includes('className="py-20 bg-[#071c2d]"')],
  ["reviews use four-card grid layout", page.includes("grid gap-6 md:grid-cols-4")],
  ["reviews use dark cards", page.includes("rounded-2xl border border-white/15 ${deckBgTone}") && !page.includes("border border-blue-100 bg-white")],
  ["reviews are labelled as students", page.includes(">student<") && !page.includes("Rashnotech Student")],
  ["reviews show short preview plus more link", page.includes("line-clamp-3") && page.includes("Read more") && page.includes("See more reviews")],
  ["reviews show five-star context", page.includes('aria-label="5 star review"') && page.includes("Star key={star}")],
  ["only four requested reviews are represented", ["Ndubuisi Mercy", "Molly", "Emmanuel Samuel Oluwayinka", "Karl Azoms"].every((name) => reviewsBlock.includes(name)) && !["Callistus Ikwuazom", "Prudent Favour Edwin", "Francisca Ezeaku", "Iyeduala Victoria", "Joseph Mathew Taye", "AbdulKamal W"].some((name) => reviewsBlock.includes(name))],
  ["mentor section follows the reference layout", page.includes("const mentors = [") && mentorsSection.includes("Our Expert Facilitators") && mentorsSection.includes("Taught by") && mentorsSection.includes("pros, not just") && mentorsSection.includes("academics.") && mentorsSection.includes("mentors.map") && mentorsSection.includes("bg-[#070b14]")],
  ["mentor section scrolls portraits left behind the fixed left text column with equal desktop height and mobile swipe support", mentorsSection.includes("lg:h-[230vh]") && mentorsSection.includes("lg:sticky lg:top-16") && page.includes("if (scrolledIntoRunway <= 0) {") && mentorsSection.includes("lg:items-stretch") && mentorsSection.includes("lg:z-20 lg:h-[420px] lg:w-[42%]") && mentorsSection.includes("lg:before:inset-y-0") && mentorsSection.includes("relative z-30 -mt-3") && mentorsSection.includes("lg:z-10 lg:mt-0 lg:h-[420px] lg:w-[58%]") && mentorsSection.includes("onTouchStart={handleMentorTouchStart}") && mentorsSection.includes("onTouchMove={handleMentorTouchMove}") && page.includes("mentorTouchStartOffsetRef.current - deltaX") && mentorsSection.includes("translate3d(-${mentorScrollOffset}px, 0, 0)") && page.includes('window.addEventListener("scroll", updateMentorScroll') && !mentorsSection.includes("grid") && !mentorsSection.includes("bg-gradient-")],
  ["mentor portraits use vertical portrait cards with scrim overlay", mentorsSection.includes("rounded-[24px]") && mentorsSection.includes("h-[380px] w-[260px]") && mentorsSection.includes("sm:h-[420px] sm:w-[285px]")],
  ["Abdulrasheed mentor uses configured portrait photo", abdulrasheedBlock.includes('image: "https://i.postimg.cc/TPNQgrwF/Gemini-Generated-Image-kvomw3kvomw3kvom.jpg"') && mentorsSection.includes("mentor.image ?") && mentorsSection.includes("src={mentor.image}") && mentorsSection.includes("h-full w-full object-cover object-top")],
  ["mentor roster is represented", ["Mr. Abdulrasheed Aliyu", "CEO/Founder", "Mr. Ini Ebong", "Software Engineer", "Dr. Callistus Ikwuazom", "Cybersecurity", "Mr Badru Aliyu", "Graphic Designer"].every((label) => page.includes(label))],
  ["mentor topics are represented", ["Leadership and product strategy", "Modern software engineering", "Cybersecurity and digital safety", "Visual design and branding"].every((label) => page.includes(label))],
  ["reviews section keeps See more reviews CTA only without Start learning with Rashnotech", page.includes("See more reviews") && !page.includes("Start learning with Rashnotech")],
  ["modern workforce section includes heading, copy, and CTA", workforceSection.includes("Skills for the") && workforceSection.includes("Modern Workforce") && workforceSection.includes("Start Where You Are. Build Skills That Actually Pay.") && workforceSection.includes("Explore Courses")],
  ["modern workforce section includes all three feature cards", ["Easy Registration", "Expert Facilitator", "Online Courses"].every((title) => page.includes(title))],
  ["modern workforce section uses real Lucide icons without emojis or gradients", !workforceSection.includes("bg-gradient-") && !workforceSection.includes("<svg") && !/[\u{1F300}-\u{1FAFF}]/u.test(workforceSection) && ["icon: LogIn", "icon: UserCheck", "icon: Presentation"].every((icon) => page.includes(icon)) && workforceSection.includes("<IconComponent")],
  ["modern workforce cards default to first card active in blue with remaining two in white and uncompressed width", page.includes("const [activeWorkforceCard, setActiveWorkforceCard] = useState<number>(0)") && workforceSection.includes("onMouseLeave={() => setActiveWorkforceCard(0)}") && workforceSection.includes('? "z-30 animate-card-float border border-[#1e40af] bg-[#1d4ed8] text-white') && workforceSection.includes(': "z-10 border border-slate-200/90 bg-white text-[#071c2d]') && workforceSection.includes("max-w-[1536px]") && workforceSection.includes("lg:w-[71%]") && !workforceSection.includes("lg:-ml-5")],
  ["modern workforce cards support interactive hover and micro-animation", workforceSection.includes("onMouseEnter={() => setActiveWorkforceCard(index)}") && workforceSection.includes("hover:-translate-y-3.5") && workforceSection.includes("animate-card-float") && workforceSection.includes("animate-ring-pulse") && workforceSection.includes("group-hover:-rotate-6") && workforceSection.includes("group-hover:scale-110") && globalsCss.includes("@keyframes card-float")],
  ["hero secondary CTA displays AI for Business and links to courses", page.includes("AI for Business") && !page.includes("AI-mentor for Business") && page.includes('href="/courses"')],
  ["tech logos scroll across the screen in a continuous marquee", page.includes("animate-marquee") && page.includes("[...techLogos, ...techLogos].map") && globalsCss.includes("@keyframes marquee")],
  ["courses section replaces A path for every goal and filter tabs with horizontal cover-image cards on white background", coursesSection.includes('id="courses" className="py-24 bg-white text-gray-900"') && coursesSection.includes("Our Popular Courses") && coursesSection.includes("Expert-led course. Global Skills") && coursesSection.includes("<CourseCover src={course.cover_image_url} title={course.title} />") && coursesSection.includes("Enroll now") && coursesSection.includes("Find your perfect fit") && !coursesSection.includes("A path for every goal") && !coursesSection.includes("Top Courses") && !coursesSection.includes("Explore Catalog")],
  ["FAQ section is placed before footer with support cards and five interactive questions", faqSectionStart > 0 && footerStart > faqSectionStart && faqSection.includes("FAQs") && faqSection.includes("Frequently Asked Questions") && faqSection.includes("Do you have more questions?") && faqSection.includes("Contact us") && faqSection.includes("For enquiries contact") && ["What is the minimum age or qualification required?", "Is there a community for students?", "How long are the programs to run for?", "Can I take more than one course at a time?", "Which of your programs is the highest paid tech job?"].every((q) => page.includes(q))],
  ["navigation replaces AI Features with Research and links Services to /services", !page.includes("AI Features") && !publicHeader.includes("AI Features") && page.includes("Research") && page.includes('href="/services"') && publicHeader.includes('label: "Research"') && publicHeader.includes('label: "Services", href: "/services"')],
  ["custom cookie banner removed from root layout", !rootLayout.includes("CookieConsentBanner") && rootLayout.includes("<Analytics />")],
  ["services page uses +234 8172992396, removes Add Service and dual-circle icon, and displays all requested services", servicesPage.includes("+234 8172992396") && !servicesPage.includes("+1 (646) 212-1626") && !servicesPage.includes("Add Service") && !servicesPage.includes("BrandDualDot") && servicesPage.includes("Elevate Your Brand With Us") && servicesPage.includes("Empowering Your Success with Digital Expertise") && servicesPage.includes("Boost Your Brand with Our Expertise") && ["App Development", "Product Design", "Project Research", "AI Automation", "E-Commerce", "Site Reliability Engineer", "Cloud Architecture", "Cybersecurity", "Corporate & School Training"].every((s) => servicesPage.includes(s))],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Homepage content eval must pass every acceptance check")
