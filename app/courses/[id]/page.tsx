import PageClient from "./page-client"
import type { Metadata } from "next"
import { JsonLd } from "@/components/json-ld"
import { courseJsonLd, courseShareImageUrl, courseUrl, getPublicCourse, SITE_NAME } from "@/lib/site"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const course = await getPublicCourse(id)
  if (!course) {
    return { title: id.replace(/-/g, " "), alternates: { canonical: `/courses/${id}` } }
  }
  const url = courseUrl(course.slug)
  const shareImage = courseShareImageUrl(course.cover_image_url)
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${course.title} | ${SITE_NAME}`,
      description: course.description,
      url,
      images: [{ url: shareImage, width: 1200, height: 630, alt: `${course.title} cover` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${course.title} | ${SITE_NAME}`,
      description: course.description,
      images: [shareImage],
    },
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
