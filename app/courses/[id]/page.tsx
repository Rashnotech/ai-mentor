import PageClient from "./page-client"
import type { Metadata } from "next"
import { JsonLd } from "@/components/json-ld"
import { courseJsonLd, courseUrl, getPublicCourse, SITE_NAME } from "@/lib/site"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const course = await getPublicCourse(id)
  if (!course) {
    return { title: id.replace(/-/g, " "), alternates: { canonical: `/courses/${id}` } }
  }
  const url = courseUrl(course.slug)
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${course.title} | ${SITE_NAME}`,
      description: course.description,
      url,
      images: [{ url: "/bg_hero.png", alt: course.title }],
    },
    twitter: { card: "summary_large_image", title: course.title, description: course.description },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const course = await getPublicCourse(id)
  return (
    <>
      {course && <JsonLd data={courseJsonLd(course)} />}
      <PageClient params={Promise.resolve({ id })} initialCourse={course} />
    </>
  )
}
