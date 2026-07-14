"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Courses", href: "/courses" },
  { label: "AI Features", href: "/#ai-features" },
  { label: "Internship", href: "/internship" },
  { label: "Services", href: "/contact" },
  { label: "Contact Us", href: "/contact" },
]

export default function PublicSiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed inset-x-0 top-0 z-50 w-full border-b border-white/5 bg-[#1a1f2e]/95 backdrop-blur-md">
      <div className="h-16 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-1">
              <img src="/mylogo.png" className="h-6 w-6" alt="Rashnotech" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Rashnotech</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-gray-300 md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden text-sm font-medium text-gray-300 transition-colors hover:text-white md:inline-block">
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 md:inline-block"
          >
            Get Started
          </Link>
          <button
            className="p-2 text-gray-300 transition-colors hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/5 bg-[#1a1f2e]/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-4">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-center text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
