import type { Metadata } from "next"
import ServicesPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Services & Research | App Development, AI Automation, Cloud, Cybersecurity & Training",
  description:
    "Explore Rashnotech services: App Development, Product Design, Project Research, AI Automation, E-Commerce, Site Reliability Engineering, Cloud Architecture, Cybersecurity, and Corporate & School Training.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Rashnotech Services & Research | Empowering Your Success with Digital Expertise",
    description:
      "End-to-end engineering, product design, project research, AI automation, cloud architecture, cybersecurity, and corporate/school training.",
    url: "/services",
    type: "website",
  },
}

export default function ServicesPage() {
  return <ServicesPageClient />
}
