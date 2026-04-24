"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function InternshipHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#1a1f2e]/95 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1 rounded-lg">
                <img src="/mylogo.png" className="w-6 h-6 text-white" alt="Rashnotech" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Rashnotech</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              <a href="/courses" className="hover:text-white transition-colors">
                Courses
              </a>
              <a href="#ai-features" className="hover:text-white transition-colors">
                AI Features
              </a>
              <Link href="/internship" className="hover:text-white transition-colors">
                Internship
              </Link>
              <a href="#" className="hover:text-white transition-colors">
                Services
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="hidden md:inline-block text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="hidden md:inline-block px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg transition-all"
            >
              Get Started
            </Link>
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#1a1f2e]/95 backdrop-blur-md">
            <div className="flex flex-col px-6 py-4 gap-1">
              <a href="/courses" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Courses
              </a>
              <a href="#ai-features" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                AI Features
              </a>
              <Link href="/internship" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Internship
              </Link>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Services
              </a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Contact Us
              </a>
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-white/10">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors text-center py-2">
                  Log in
                </Link>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg transition-all text-center">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
  )
}
