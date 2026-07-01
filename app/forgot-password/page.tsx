import ForgotPasswordClient from "./forgot-password-client"
export { privateMetadata as metadata } from "@/lib/seo-metadata"

export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}

