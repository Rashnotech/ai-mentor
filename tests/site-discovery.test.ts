import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { courseJsonLd, courseListJsonLd, courseShareImageUrl, courseUrl, SITE_URL } from "../lib/site.ts"
import {
  createConsentState,
  extractCookieValue,
  parseCookieConsent,
  parseUserExperienceProfile,
  serializeCookieConsent,
} from "../lib/cookie-consent.ts"

const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
const manifestSource = readFileSync(new URL("../app/manifest.ts", import.meta.url), "utf8")
const coursePageSource = readFileSync(new URL("../app/courses/[id]/page.tsx", import.meta.url), "utf8")

const course = {
  course_id: 7,
  title: "Backend Engineering",
  slug: "backend-engineering",
  description: "Build production APIs and databases.",
  difficulty_level: "INTERMEDIATE",
  estimated_hours: 40,
  cover_image_url: "https://cdn.example.com/covers/backend-engineering.png",
  min_price: 25000,
  learning_paths: [],
} as never

test("course list schema exposes unique crawlable course URLs", () => {
  const schema = courseListJsonLd([course])
  assert.equal(schema["@type"], "ItemList")
  assert.equal(schema.itemListElement[0].url, courseUrl(course.slug))
  assert.equal(schema.itemListElement[0].item["@type"], "Course")
  assert.equal(schema.itemListElement[0].item.image, "https://cdn.example.com/covers/backend-engineering.png")
  assert.equal(schema.itemListElement[0].item.provider.name, "Rashnotech")
})

test("course schema includes provider, duration, level, offer, and cover image", () => {
  const schema = courseJsonLd(course)
  assert.equal(schema["@type"], "Course")
  assert.equal(schema.provider.name, "Rashnotech")
  assert.equal(schema.image, "https://cdn.example.com/covers/backend-engineering.png")
  assert.equal(schema.timeRequired, "PT40H")
  assert.equal(schema.educationalLevel, "INTERMEDIATE")
  assert.equal(schema.offers?.price, 25000)
  assert.equal(schema.offers?.priceCurrency, "NGN")
})

test("course share image uses cover_image_url for OpenGraph and WhatsApp previews with fallback", () => {
  assert.equal(
    courseShareImageUrl("  https://cdn.example.com/covers/data-analytics.jpg  "),
    "https://cdn.example.com/covers/data-analytics.jpg"
  )
  assert.equal(courseShareImageUrl("/covers/local-cover.png"), `${SITE_URL}/covers/local-cover.png`)
  assert.equal(courseShareImageUrl(null), `${SITE_URL}/bg_hero.png`)
  assert.equal(courseShareImageUrl("   "), `${SITE_URL}/bg_hero.png`)
  assert.match(coursePageSource, /const shareImage = courseShareImageUrl\(course\.cover_image_url\)/)
  assert.match(coursePageSource, /images: \[\{ url: shareImage, width: 1200, height: 630, alt: `\$\{course\.title\} cover` \}\]/)
  assert.match(coursePageSource, /images: \[shareImage\]/)
  assert.doesNotMatch(coursePageSource, /images: \[\{ url: "\/bg_hero\.png"/)
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

test("cookie consent state serializes, parses, and supports accept, reject, and custom UX preferences", () => {
  const accepted = createConsentState("accepted", new Date("2026-11-16T00:00:00.000Z"))
  assert.equal(accepted.status, "accepted")
  assert.equal(accepted.essential, true)
  assert.equal(accepted.analytics, true)
  assert.equal(accepted.preferences, true)

  const serialized = serializeCookieConsent(accepted)
  const rawCookie = `other=1; rashnotech_cookie_consent=${serialized}; theme=dark`
  const extracted = extractCookieValue(rawCookie, "rashnotech_cookie_consent")
  const roundTrip = parseCookieConsent(extracted)
  assert.deepEqual(roundTrip, accepted)

  const rejected = createConsentState("rejected")
  assert.equal(rejected.status, "rejected")
  assert.equal(rejected.analytics, false)
  assert.equal(rejected.preferences, false)

  const custom = createConsentState({ analytics: false, preferences: true })
  assert.equal(custom.status, "customized")
  assert.equal(custom.analytics, false)
  assert.equal(custom.preferences, true)

  const uxProfile = parseUserExperienceProfile(
    encodeURIComponent(
      JSON.stringify({
        lastVisitedPath: "/services",
        lastVisitedLabel: "Rashnotech Services",
        preferredServiceCategory: "Engineering & AI",
        visitCount: 3,
        updatedAt: "2026-11-16T00:00:00.000Z",
      })
    )
  )
  assert.equal(uxProfile?.lastVisitedPath, "/services")
  assert.equal(uxProfile?.preferredServiceCategory, "Engineering & AI")
  assert.equal(uxProfile?.visitCount, 3)
})
