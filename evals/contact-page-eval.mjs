import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const files = {
  contact: await readFile("app/contact/page.tsx", "utf8"),
  contactClient: await readFile("app/contact/page-client.tsx", "utf8"),
  api: await readFile("lib/api.ts", "utf8"),
  backendRoutes: await readFile("api/domains/contact/routes.py", "utf8"),
  backendSchemas: await readFile("api/domains/contact/schemas.py", "utf8"),
  backendConfig: await readFile("api/core/config.py", "utf8"),
  backendApp: await readFile("api/app.py", "utf8"),
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
  ["contact page exists with neutral Rashnotech positioning", files.contact.includes("Contact Rashnotech") && files.contactClient.includes("Tell us what you need help with") && files.contactClient.includes("Consultancy or services")],
  ["contact page uses requested dark hero and white form card", files.contactClient.includes("bg-[#071c2d]") && files.contactClient.includes("bg-white p-4 text-[#071c2d]")],
  ["contact page includes header and footer components", files.contactClient.includes("PublicSiteHeader") && files.contactClient.includes("PublicSiteFooter")],
  ["contact form is responsive and structured around neutral enquiries", files.contactClient.includes("What do you need help with?") && files.contactClient.includes("This enquiry is for*") && files.contactClient.includes("Message*")],
  ["contact page uses blue instead of green", files.contactClient.includes("bg-blue-500") && !files.contactClient.includes("emerald")],
  ["support channels and stat chips are removed", !files.contactClient.includes("Support channels") && !files.contactClient.includes("24-48h") && !files.contactClient.includes("Typical response")],
  ["frontend submits to backend and shows success feedback", files.contactClient.includes("contactApi.submit") && files.contactClient.includes("Email sent successfully. We will contact you in a few hours.")],
  ["backend sends contact email to Rashnotech gmail", files.backendConfig.includes("CONTACT_TO_EMAIL") && files.backendConfig.includes("rashnotech@gmail.com") && files.backendRoutes.includes("settings.CONTACT_TO_EMAIL") && files.backendRoutes.includes("email_service._send_email")],
  ["backend exposes typed public contact endpoint", files.backendRoutes.includes('APIRouter(prefix="/contact"') && files.backendSchemas.includes("ContactSubmissionRequest") && files.backendSchemas.includes("EmailStr") && files.backendApp.includes("contact_router")],
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
