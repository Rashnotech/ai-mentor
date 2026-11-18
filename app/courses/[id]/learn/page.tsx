import { redirect } from "next/navigation"
export { privateMetadata as metadata } from "@/lib/seo-metadata"

export const dynamic = "force-dynamic"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      query.set(key, value)
    } else if (Array.isArray(value)) {
      for (const v of value) query.append(key, v)
    }
  }

  const queryString = query.toString()
  redirect(`/dashboard/courses/${id}/learn${queryString ? `?${queryString}` : ""}`)
}

