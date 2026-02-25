import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/client-auth-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Rashnotech - AI Powered Learning",
  description: "Hands-on project based learning platform",
  keywords: "Best Software Engineering company in Nigeria, AI learning, project-based learning, mentorship, coding projects, personalized learning paths, skill development",
  authors: [{ name: "Rashnotech", url: "https://www.rashnotech.tech" }],
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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
