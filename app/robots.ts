import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/courses/", "/internship", "/contact", "/privacy", "/privacy-policy"],
      disallow: ["/admin/", "/auth/", "/courses/*/learn", "/dashboard/", "/forgot-password", "/login", "/mentor/", "/onboarding/", "/payment/", "/signup", "/verify-email", "/workspace/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
