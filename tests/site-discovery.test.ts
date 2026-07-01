import assert from "node:assert/strict"
import test from "node:test"
import { courseJsonLd, courseListJsonLd, courseUrl } from "../lib/site.ts"

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
