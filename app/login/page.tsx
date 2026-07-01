import LoginClient from "./login-client"
export { privateMetadata as metadata } from "@/lib/seo-metadata"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <LoginClient />
}
