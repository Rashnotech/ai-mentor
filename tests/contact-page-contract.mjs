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

assert.match(files.contactClient, /PublicSiteHeader/)
assert.match(files.contactClient, /PublicSiteFooter/)
assert.match(files.contact, /Contact Rashnotech/)
assert.match(files.contactClient, /Tell us what you need help with/)
assert.match(files.contactClient, /Consultancy or services/)
assert.match(files.contactClient, /bg-\[#071c2d\]/)
assert.match(files.contactClient, /bg-white p-4 text-\[#071c2d\]/)
assert.match(files.contactClient, /contactApi\.submit/)
assert.match(files.contactClient, /Email sent successfully\. We will contact you in a few hours\./)
assert.match(files.contactClient, /rashnotech@gmail\.com/)
assert.match(files.contactClient, /Send an enquiry/)
assert.doesNotMatch(files.contactClient, /bg-emerald/)
assert.doesNotMatch(files.contactClient, /hover:bg-emerald/)
assert.doesNotMatch(files.contactClient, /Support channels/)
assert.doesNotMatch(files.contactClient, /24-48h/)
assert.doesNotMatch(files.contactClient, /Typical response/)

assert.match(files.header, /Contact Us/)
assert.match(files.header, /href: "\/contact"/)
assert.match(files.footer, /Contact Us/)
assert.match(files.footer, /href: "\/contact"/)

for (const source of [files.home, files.courses, files.courseDetail, files.internshipHeader]) {
  assert.match(source, /href="\/contact"/)
}

assert.match(files.sitemap, /\/contact/)
assert.match(files.robots, /\/contact/)
assert.match(files.llms, /\[Contact\]/)

assert.match(files.api, /export const contactApi/)
assert.match(files.api, /apiClient\.post<ContactSubmissionResponse>\("\/contact", data\)/)
assert.match(files.backendConfig, /CONTACT_TO_EMAIL.*rashnotech@gmail\.com/)
assert.match(files.backendApp, /contact_router/)
assert.match(files.backendRoutes, /APIRouter\(prefix="\/contact"/)
assert.match(files.backendRoutes, /settings\.CONTACT_TO_EMAIL/)
assert.match(files.backendRoutes, /email_service\._send_email/)
assert.match(files.backendRoutes, /Email sent successfully\. We will contact you in a few hours\./)
assert.match(files.backendSchemas, /ContactSubmissionRequest/)
assert.match(files.backendSchemas, /EmailStr/)

console.log("Contact page contract: PASS")
