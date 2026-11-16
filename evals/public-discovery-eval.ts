import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { courseJsonLd, courseListJsonLd, courseShareImageUrl, SITE_URL } from "../lib/site.ts"
import { createConsentState, parseCookieConsent, serializeCookieConsent } from "../lib/cookie-consent.ts"

const root = new URL("../", import.meta.url)
const read = (path: string) => readFile(new URL(path, root), "utf8")
const fixture = {
  course_id: 1,
  title: "Full-Stack Engineering",
  slug: "full-stack-engineering",
  description: "Learn frontend, backend, testing, and deployment through practical projects.",
  difficulty_level: "BEGINNER",
  estimated_hours: 80,
  cover_image_url: "https://cdn.example.com/covers/full-stack.jpg",
  min_price: 0,
  learning_paths: [],
} as never

const checks: Array<[string, boolean]> = []
const record = (name: string, condition: boolean) => checks.push([name, condition])

const [
  layout,
  manifest,
  robots,
  sitemap,
  llms,
  coursePage,
  paymentService,
  enrollmentService,
  studentRoutes,
  paymentModal,
  apiTypes,
] = await Promise.all([
  read("app/layout.tsx"),
  read("app/manifest.ts"),
  read("app/robots.ts"),
  read("app/sitemap.ts"),
  read("app/llms.txt/route.ts"),
  read("app/courses/[id]/page.tsx"),
  read("api/domains/payments/service.py"),
  read("api/domains/courses/services/enrollment_service.py"),
  read("api/domains/courses/routes/student.py"),
  read("components/payment-modal.tsx"),
  read("lib/api.ts"),
])
const listSchema = courseListJsonLd([fixture])
const detailSchema = courseJsonLd(fixture)

record("canonical metadata", layout.includes("alternates: { canonical:"))
record("open graph metadata", layout.includes("openGraph:"))
record("search favicon metadata", layout.includes('url: "/mylogo.png", sizes: "619x619", type: "image/png"') && layout.includes("shortcut:") && layout.includes("apple:"))
record("manifest exposes square brand icon", manifest.includes('src: "/mylogo.png", sizes: "619x619", type: "image/png", purpose: "any"') && manifest.includes('purpose: "maskable"'))
record("crawler policy", robots.includes("sitemap:") && robots.includes("/dashboard/"))
record("dynamic course sitemap", sitemap.includes("courseUrl(course.slug)") && sitemap.includes("`${SITE_URL}/services`"))
record("cookie consent serialization and round-trip", parseCookieConsent(serializeCookieConsent(createConsentState("accepted")))?.status === "accepted" && createConsentState("rejected").analytics === false)
record("LLM-readable public index", llms.includes("## Courses") && llms.includes("Public course pages"))
record("dynamic course metadata", coursePage.includes("generateMetadata") && coursePage.includes("courseJsonLd") && coursePage.includes("courseShareImageUrl(course.cover_image_url)") && coursePage.includes("images: [shareImage]") && !coursePage.includes('images: [{ url: "/bg_hero.png"'))
record("course share preview resolves cover image for WhatsApp and OpenGraph", courseShareImageUrl(fixture.cover_image_url) === "https://cdn.example.com/covers/full-stack.jpg" && courseShareImageUrl("/covers/rel.png") === `${SITE_URL}/covers/rel.png` && courseShareImageUrl(null) === `${SITE_URL}/bg_hero.png`)
record("course list structured data", listSchema["@type"] === "ItemList" && listSchema.itemListElement.length === 1 && listSchema.itemListElement[0].item.image === "https://cdn.example.com/covers/full-stack.jpg")
record("course detail structured data", detailSchema["@type"] === "Course" && detailSchema.provider.name === "Rashnotech" && detailSchema.image === "https://cdn.example.com/covers/full-stack.jpg")
record("durable paid onboarding", paymentService.includes("await self._complete_self_paced_onboarding("))
record("selected course guard", paymentService.includes("selected_course_id != course_id"))
record("existing paid payment grants access", paymentService.includes("_build_existing_access_response") && paymentService.includes("Existing successful payment found. Course access granted.") && paymentService.includes('"checkout_link": None'))
record("payment initiation does not throw already enrolled", !paymentService.includes('error_code="ALREADY_ENROLLED"'))
record("frontend accepts active payment initiation", paymentModal.includes('data.status === "active" || !data.checkout_link') && apiTypes.includes("checkout_link?: string | null"))
record("student course list uses durable enrollments", enrollmentService.includes("select(UserCourseEnrollment)") && enrollmentService.includes("active_enrollments") && enrollmentService.includes("enrolled_course_ids.add(course.course_id)"))
record("student course access uses durable enrollments", studentRoutes.includes("UserCourseEnrollment.course_id == course.course_id") && studentRoutes.includes("UserCourseEnrollment.course_id == course_id") && studentRoutes.includes("EnrollmentStatus.ACTIVE"))

const passed = checks.filter(([, ok]) => ok).length
const score = passed / checks.length
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.ok(score >= 0.9, "Public discovery and enrollment eval must score at least 90%")
