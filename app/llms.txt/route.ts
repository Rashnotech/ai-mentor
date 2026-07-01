import { getPublicCourses, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

export async function GET() {
  const courses = await getPublicCourses()
  const courseLinks = courses.map(
    (course) => `- [${course.title}](${SITE_URL}/courses/${course.slug}): ${course.description}`,
  )
  const body = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Rashnotech offers project-based technology education with self-paced and cohort learning options.",
    "",
    "## Primary pages",
    "",
    `- [Course catalog](${SITE_URL}/courses): Public list of available courses and learning paths.`,
    `- [Internships](${SITE_URL}/internship): Internship application and learning opportunities.`,
    "",
    "## Courses",
    "",
    ...(courseLinks.length ? courseLinks : ["- Course data is temporarily unavailable. See the public course catalog."]),
    "",
    "## Notes",
    "",
    "Public course pages are the canonical source for titles, descriptions, prices, duration, and availability.",
  ].join("\n")

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  })
}
