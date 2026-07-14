import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono, Urbanist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/client-auth-provider"
import { Analytics } from "@vercel/analytics/next"
import { JsonLd } from "@/components/json-ld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"


const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", display: "swap" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rashnotech | Project-Based Technology Learning",
    template: "%s | Rashnotech",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Digital Skill Development", "AI/ML", "ICT Training", "AI learning", "project-based learning", "technology mentorship", "coding courses Nigeria"],
  authors: [{ name: "Rashnotech", url: "https://www.rashnotech.tech" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    siteName: SITE_NAME,
    title: "Rashnotech | Project-Based Technology Learning",
    description: SITE_DESCRIPTION,
    images: [{ url: "/mylogo.png", alt: "Rashnotech project-based technology learning" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rashnotech | Project-Based Technology Learning",
    description: SITE_DESCRIPTION,
    images: ["/mylogo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: [
      { url: "/mylogo.png", sizes: "619x619", type: "image/png" },
    ],
    shortcut: [
      { url: "/mylogo.png", sizes: "619x619", type: "image/png" },
    ],
    apple: [
      { url: "/mylogo.png", sizes: "619x619", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${urbanist.variable} ${jetbrainsMono.variable} font-sans antialiased bg-gray-50`}>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/mylogo.png` },
            { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, publisher: { "@id": `${SITE_URL}/#organization` } },
          ],
        }} />
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
