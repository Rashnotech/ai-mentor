import PageClient from "./page-client"
import { JsonLd } from "@/components/json-ld"
import { courseListJsonLd, getPublicCourses } from "@/lib/site"

export const revalidate = 300

export default async function Page() {
  const courses = await getPublicCourses(6)
  return (
    <>
      {courses.length > 0 && <JsonLd data={courseListJsonLd(courses)} />}
      <PageClient initialCourses={courses} />
    </>
  )
}
