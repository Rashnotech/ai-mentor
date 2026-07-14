import type { Metadata } from "next"
import ContactPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Contact Rashnotech | Tech Training, Internships, Consulting, and Support",
  description:
    "Contact Rashnotech for course guidance, internship questions, consulting, business services, partnerships, and learner support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Rashnotech",
    description: "Talk to Rashnotech about courses, internships, consulting, business services, and learning support.",
    url: "/contact",
    type: "website",
  },
}

export default function ContactPage() {
  return <ContactPageClient />
}
