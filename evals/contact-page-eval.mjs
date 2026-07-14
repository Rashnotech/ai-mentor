import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  contact: await readFile("app/contact/page.tsx", "utf8"),
  header: await readFile("components/public-site-header.tsx", "utf8"),
  footer: await readFile("components/public-site-footer.tsx", "utf8"),
  home: await readFile("app/page-client.tsx", "utf8"),
  courses: await readFile("app/courses/page-client.tsx", "utf8"),
  courseDetail: await readFile("app/courses/[id]/page-client.tsx", "utf8"),
  internshipHeader: await readFile("app/internship/_components/internship-header.tsx", "utf8"),
  sitemap: await readFile("app/sitemap.ts", "utf8"),
  robots: await readFile("app/robots.ts", "utf8"),
  llms: await readFile("app/llms.txt/route.ts", "utf8"),
}

const checks = [
  ["contact page exists with Rashnotech positioning", files.contact.includes("Contact Rashnotech") && files.contact.includes("Let us help you choose the right tech path")],
  ["contact page uses requested dark hero and white form card", files.contact.includes("bg-[#071c2d]") && files.contact.includes("bg-white p-6 text-[#071c2d]")],
  ["contact page includes header and footer components", files.contact.includes("PublicSiteHeader") && files.contact.includes("PublicSiteFooter")],
  ["contact form is structured around learner support", files.contact.includes("What do you need help with?") && files.contact.includes("I am a*") && files.contact.includes("Message*")],
  ["contact page exposes support email", files.contact.includes("support@rashnotech.tech") && files.contact.includes("mailto:support@rashnotech.tech")],
  ["shared header links to contact", files.header.includes('href: "/contact"') && files.header.includes("Contact Us")],
  ["shared footer links to contact", files.footer.includes('href: "/contact"') && files.footer.includes("Contact Us")],
  ["existing public headers route contact link", [files.home, files.courses, files.courseDetail, files.internshipHeader].every((source) => source.includes('href="/contact"'))],
  ["contact page is discoverable by crawlers", files.sitemap.includes("/contact") && files.robots.includes("/contact")],
  ["contact page is included in LLM index", files.llms.includes("[Contact]") && files.llms.includes("/contact")],
]

const passed = checks.filter(([, ok]) => ok).length
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Contact page eval must pass every acceptance check")
