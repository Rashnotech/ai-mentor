export const SITE_NAME = "Rashnotech"
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rashnotech.tech").replace(/\/$/, "")
export const SITE_DESCRIPTION =
  "Project-based software engineering courses, adaptive learning paths, mentorship, and career-focused technology training."

export type PublicCourseSummary = CourseListResponse

function apiBaseUrl(): string {
  const root = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "")
  return root.endsWith("/api/v1") ? root : `${root}/api/v1`
}

export async function getPublicCourses(limit = 100): Promise<PublicCourseSummary[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/public/courses?limit=${limit}`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return []
    return (await response.json()) as PublicCourseSummary[]
  } catch {
    return []
  }
}

export async function getPublicCourse(slug: string): Promise<PublicCourseSummary | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl()}/public/courses/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    )
    if (!response.ok) return null
    return (await response.json()) as PublicCourseSummary
  } catch {
    return null
  }
}

export function courseUrl(slug: string): string {
  return `${SITE_URL}/courses/${encodeURIComponent(slug)}`
}

export function courseListJsonLd(courses: PublicCourseSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: courseUrl(course.slug),
      item: {
        "@type": "Course",
        name: course.title,
        description: course.description,
        url: courseUrl(course.slug),
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          sameAs: SITE_URL,
        },
      },
    })),
  }
}

export function courseJsonLd(course: PublicCourseSummary) {
  const price = course.learning_paths?.find((path) => path.is_default)?.price ?? course.min_price
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: courseUrl(course.slug),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    educationalLevel: course.difficulty_level,
    timeRequired: course.estimated_hours ? `PT${course.estimated_hours}H` : undefined,
    offers: typeof price === "number" ? {
      "@type": "Offer",
      price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: courseUrl(course.slug),
    } : undefined,
  }
}
import type { CourseListResponse } from "@/lib/api"
