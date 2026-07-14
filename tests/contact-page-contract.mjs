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

assert.match(files.contact, /PublicSiteHeader/)
assert.match(files.contact, /PublicSiteFooter/)
assert.match(files.contact, /Contact Rashnotech/)
assert.match(files.contact, /Let us help you choose the right tech path/)
assert.match(files.contact, /bg-\[#071c2d\]/)
assert.match(files.contact, /bg-white p-6 text-\[#071c2d\]/)
assert.match(files.contact, /support@rashnotech\.tech/)
assert.match(files.contact, /mailto:support@rashnotech\.tech/)
assert.match(files.contact, /What do you need help with/)
assert.match(files.contact, /How Rashnotech can help/)

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

console.log("Contact page contract: PASS")
