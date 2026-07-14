import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { courseJsonLd, courseListJsonLd, courseUrl } from "../lib/site.ts"

const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
const manifestSource = readFileSync(new URL("../app/manifest.ts", import.meta.url), "utf8")

const course = {
  course_id: 7,
  title: "Backend Engineering",
  slug: "backend-engineering",
  description: "Build production APIs and databases.",
  difficulty_level: "INTERMEDIATE",
  estimated_hours: 40,
  cover_image_url: null,
  min_price: 25000,
  learning_paths: [],
} as never

test("course list schema exposes unique crawlable course URLs", () => {
  const schema = courseListJsonLd([course])
  assert.equal(schema["@type"], "ItemList")
  assert.equal(schema.itemListElement[0].url, courseUrl(course.slug))
  assert.equal(schema.itemListElement[0].item["@type"], "Course")
  assert.equal(schema.itemListElement[0].item.provider.name, "Rashnotech")
})

test("course schema includes provider, duration, level, and offer", () => {
  const schema = courseJsonLd(course)
  assert.equal(schema["@type"], "Course")
  assert.equal(schema.provider.name, "Rashnotech")
  assert.equal(schema.timeRequired, "PT40H")
  assert.equal(schema.educationalLevel, "INTERMEDIATE")
  assert.equal(schema.offers?.price, 25000)
  assert.equal(schema.offers?.priceCurrency, "NGN")
})

test("site exposes a crawlable square favicon for search results", () => {
  assert.match(layoutSource, /icon:\s*\[/)
  assert.match(layoutSource, /url: "\/mylogo\.png", sizes: "619x619", type: "image\/png"/)
  assert.match(layoutSource, /shortcut:\s*\[/)
  assert.match(layoutSource, /apple:\s*\[/)
  assert.match(layoutSource, /logo: `\$\{SITE_URL\}\/mylogo\.png`/)
  assert.match(manifestSource, /src: "\/mylogo\.png", sizes: "619x619", type: "image\/png", purpose: "any"/)
  assert.match(manifestSource, /purpose: "maskable"/)
})
