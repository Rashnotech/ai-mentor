"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import {
  Bell,
  Search,
  Folder,
  BookOpen,
  User,
  Menu,
  LayoutDashboard,
  LogOut,
  Users,
  Shield,
  Loader2,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { useUserStore } from "@/lib/stores/user-store"
import { useAuth } from "@/lib/auth-context"

// --- Mock Data ---
const NOTIFICATIONS = [
  { id: 1, text: "Your project 'Portfolio' was reviewed by AI.", time: "1 hour ago", read: false },
  { id: 2, text: "New module unlocked in Advanced Python.", time: "3 hours ago", read: false },
  { id: 3, text: "You earned the 'Bug Squasher' badge!", time: "1 day ago", read: true },
]

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/sessions", label: "Sessions", icon: Video },
  { href: "/dashboard/projects", label: "Projects", icon: Folder },
  { href: "/dashboard/community", label: "Community", icon: Users },
  { href: "/dashboard/profile", label: "Profile", icon: User },
]

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const user = useUserStore((state) => state.user)
  const { logout } = useAuth()

  // Get user initials for avatar
  const userInitials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  // Get skill level display
  const skillLevel = user?.skill_level 
    ? user.skill_level.charAt(0).toUpperCase() + user.skill_level.slice(1) + " Level"
    : "Student"

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setShowProfileMenu(false)
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to logout. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Check if a nav item is active
  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
            showMobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <Link href="/dashboard" className="flex items-center gap-2 text-blue-600">
                <div className="p-1 bg-blue-600 rounded-lg">
                  <img src="/mylogo.png" className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">Rashnotech</span>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 font-medium ${
                        active
                          ? "text-blue-600 bg-blue-50 font-semibold"
                          : "text-gray-600 hover:bg-gray-50"
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

            <div className="p-4 border-t border-gray-100">
              <div className="p-4 rounded-xl bg-gray-900 text-white">
                <p className="text-sm font-medium mb-1">Pro Plan</p>
                <p className="text-xs text-gray-400 mb-3">Get unlimited AI access</p>
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                  Upgrade
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{skillLevel}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
          {/* Header */}
          <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden -ml-2 text-gray-500"
                onClick={() => setShowMobileMenu(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="hidden sm:flex relative w-64 lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses, projects..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                      <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-semibold text-sm">Notifications</span>
                        <button className="text-xs text-blue-600 hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {NOTIFICATIONS.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}
                          >
                            <p className="text-sm text-gray-800 mb-1">{n.text}</p>
                            <p className="text-xs text-gray-400">{n.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Profile Dropdown Menu */}
              <div className="relative">
                <div
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border border-blue-200 flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:opacity-90 transition-all"
                >
                  {userInitials}
                </div>

                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-sm text-gray-900">{user?.full_name || "User"}</p>
                        <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
                      </div>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3"
                      >
                        <User className="w-4 h-4" />
                        Update Profile
                      </Link>
                      {user?.role === "admin" && (
                        <Link href="/admin" className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm text-purple-600 flex items-center gap-3">
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 border-t border-gray-100 mt-1 pt-2 disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        {isLoggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
