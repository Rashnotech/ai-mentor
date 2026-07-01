import PageClient from "./page-client"
export { privateMetadata as metadata } from "@/lib/seo-metadata"

export const dynamic = "force-dynamic"

export default function Page() {
  return <PageClient />
}
