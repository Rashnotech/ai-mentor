import MentorLayoutClient from "./layout-client"

export const dynamic = "force-dynamic"

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MentorLayoutClient>{children}</MentorLayoutClient>
}
