import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { courseJsonLd, courseListJsonLd } from "../lib/site.ts"

const root = new URL("../", import.meta.url)
const read = (path: string) => readFile(new URL(path, root), "utf8")
const fixture = {
  course_id: 1,
  title: "Full-Stack Engineering",
  slug: "full-stack-engineering",
  description: "Learn frontend, backend, testing, and deployment through practical projects.",
  difficulty_level: "BEGINNER",
  estimated_hours: 80,
  cover_image_url: null,
  min_price: 0,
  learning_paths: [],
} as never

const checks: Array<[string, boolean]> = []
const record = (name: string, condition: boolean) => checks.push([name, condition])

const [layout, manifest, robots, sitemap, llms, coursePage, paymentService] = await Promise.all([
  read("app/layout.tsx"),
  read("app/manifest.ts"),
  read("app/robots.ts"),
  read("app/sitemap.ts"),
  read("app/llms.txt/route.ts"),
  read("app/courses/[id]/page.tsx"),
  read("api/domains/payments/service.py"),
])
const listSchema = courseListJsonLd([fixture])
const detailSchema = courseJsonLd(fixture)

record("canonical metadata", layout.includes("alternates: { canonical:"))
record("open graph metadata", layout.includes("openGraph:"))
record("search favicon metadata", layout.includes('url: "/mylogo.png", sizes: "619x619", type: "image/png"') && layout.includes("shortcut:") && layout.includes("apple:"))
record("manifest exposes square brand icon", manifest.includes('src: "/mylogo.png", sizes: "619x619", type: "image/png", purpose: "any"') && manifest.includes('purpose: "maskable"'))
record("crawler policy", robots.includes("sitemap:") && robots.includes("/dashboard/"))
record("dynamic course sitemap", sitemap.includes("courseUrl(course.slug)"))
record("LLM-readable public index", llms.includes("## Courses") && llms.includes("Public course pages"))
record("dynamic course metadata", coursePage.includes("generateMetadata") && coursePage.includes("courseJsonLd"))
record("course list structured data", listSchema["@type"] === "ItemList" && listSchema.itemListElement.length === 1)
record("course detail structured data", detailSchema["@type"] === "Course" && detailSchema.provider.name === "Rashnotech")
record("durable paid onboarding", paymentService.includes("await self._complete_self_paced_onboarding("))
record("selected course guard", paymentService.includes("selected_course_id != course_id"))

const passed = checks.filter(([, ok]) => ok).length
const score = passed / checks.length
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`)
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.ok(score >= 0.9, "Public discovery and enrollment eval must score at least 90%")
