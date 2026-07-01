import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/client-auth-provider"
import { Analytics } from "@vercel/analytics/next"
import { JsonLd } from "@/components/json-ld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"


const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rashnotech | Project-Based Technology Learning",
    template: "%s | Rashnotech",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["software engineering courses", "AI learning", "project-based learning", "technology mentorship", "coding courses Nigeria"],
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
    images: [{ url: "/bg_hero.png", alt: "Rashnotech project-based technology learning" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rashnotech | Project-Based Technology Learning",
    description: SITE_DESCRIPTION,
    images: ["/bg_hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: '/mylogo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-gray-50`}>
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
