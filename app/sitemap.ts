import type { MetadataRoute } from "next"
import { courseUrl, getPublicCourses, SITE_URL } from "@/lib/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getPublicCourses()
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/internship`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.2 },
  ]
  return [
    ...staticPages,
    ...courses.map((course) => ({
      url: courseUrl(course.slug),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
