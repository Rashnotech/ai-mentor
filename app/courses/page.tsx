import PageClient from "./page-client"
import type { Metadata } from "next"
import { JsonLd } from "@/components/json-ld"
import { courseListJsonLd, getPublicCourses } from "@/lib/site"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Software Engineering and Technology Courses",
  description: "Browse project-based software engineering and technology courses with flexible learning paths, mentorship, and practical projects.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "Technology Courses | Rashnotech",
    description: "Build practical technology skills through project-based courses and flexible learning paths.",
    url: "/courses",
  },
}

export default async function Page() {
  const courses = await getPublicCourses()
  return (
    <>
      {courses.length > 0 && <JsonLd data={courseListJsonLd(courses)} />}
      <PageClient initialCourses={courses} />
    </>
  )
}
