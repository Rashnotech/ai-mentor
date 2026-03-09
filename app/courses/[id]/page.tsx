import PageClient from "./page-client"

export const dynamic = "force-dynamic"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PageClient params={params} />
}