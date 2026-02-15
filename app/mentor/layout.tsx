"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  Clock,
  Video,
  Calendar,
  ChevronRight,
  X,
  Award,
} from "lucide-react"

// Mock data for notification count
const SESSION_REQUESTS_COUNT = 2

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const handleLogout = async () => {
      await logout()
  }

  // Helper to get user initials
  const getUserInitials = () => {
    if (!user?.full_name) return "M"
    return user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)
  }

  // Navigation items
  const navItems = [
    { href: "/mentor/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/mentor/sessions", label: "Sessions", icon: Video },
    { href: "/mentor/my-students", label: "My Students", icon: Users },
    { href: "/mentor/my-courses", label: "My Courses", icon: BookOpen },
    { href: "/mentor/settings", label: "Settings", icon: Settings },
  ]

  const isActiveRoute = (href: string) => {
    if (href === "/mentor/overview" && pathname === "/mentor") return true
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <ProtectedRoute allowedRoles={["mentor", "admin"]}>
      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:hidden ${
            showMobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <Link href="/mentor" className="flex items-center gap-2 text-blue-600">
                <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">Mentor Hub</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 font-medium ${
                        isActive ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Desktop Sidebar - Fixed position */}
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white border-r border-gray-200 z-30">
          <div className="p-6 border-b border-gray-100 shrink-0">
            <Link href="/mentor" className="flex items-center gap-2 text-blue-600">
              <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">Mentor Hub</span>
            </Link>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 font-medium ${
                      isActive ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content - offset for fixed sidebar */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowMobileMenu(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search sessions, students..."
                    className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {SESSION_REQUESTS_COUNT}
                  </span>
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-3 pl-3 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name || "Mentor"}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role || "mentor"}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials()}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showProfileDropdown ? "rotate-90" : ""}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {showProfileDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowProfileDropdown(false)} 
                      />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">{user?.full_name || "Mentor"}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/mentor/settings"
                            onClick={() => setShowProfileDropdown(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <User className="w-4 h-4" />
                            My Profile
                          </Link>
                          <Link
                            href="/mentor/settings"
                            onClick={() => setShowProfileDropdown(false)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>
                        </div>
                        <div className="border-t border-gray-100 py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
