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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { useUserStore } from "@/lib/stores/user-store"
import { useAuth } from "@/lib/auth-context"
import RubberDuckChat from "./_components/rubber-duck-chat"
import { LearningSurveyModal } from "@/components/learning-survey-modal"

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const isLearnRoute = /^\/dashboard\/courses\/[^/]+\/learn/.test(pathname)
  
  const user = useUserStore((state) => state.user)
  const { logout } = useAuth()

  // Get user initials for avatar
  const userInitials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  // Get user handle / subtitle display
  const userHandle = user?.email
    ? `@${user.email.split("@")[0]}`
    : user?.skill_level
    ? user.skill_level.charAt(0).toUpperCase() + user.skill_level.slice(1) + " Level"
    : "Student"

  const getHeaderTitle = () => {
    if (pathname.startsWith("/dashboard/courses")) return "My Courses"
    if (pathname.startsWith("/dashboard/sessions")) return "Sessions"
    if (pathname.startsWith("/dashboard/projects")) return "Projects"
    if (pathname.startsWith("/dashboard/community")) return "Community"
    if (pathname.startsWith("/dashboard/profile")) return "Profile"
    return "Dashboard"
  }

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
      <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-gray-900">
        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 ${
            isSidebarCollapsed ? "w-64 lg:w-20" : "w-64"
          } bg-[#F4F5F2] border-r border-gray-200/80 transform transition-all duration-200 ease-in-out ${
            showMobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full flex flex-col">
            <div
              className={`p-5 flex items-center ${
                isSidebarCollapsed ? "lg:justify-center justify-between" : "justify-between"
              }`}
            >
              <Link
                href="/dashboard"
                className={`flex items-center gap-2.5 text-blue-600 ${
                  isSidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <img src="/mylogo.png" className="w-5 h-5 object-contain" alt="Rashnotech" />
                </div>
                <span className="font-bold text-lg tracking-tight text-gray-900">Rashnotech</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} className="block" title={item.label}>
                    <div
                      className={`w-full flex items-center ${
                        isSidebarCollapsed
                          ? "lg:justify-center lg:px-0 px-4 justify-between"
                          : "justify-between px-4"
                      } py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer relative ${
                        active
                          ? "text-blue-600 bg-[#EBF2FF] font-semibold"
                          : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-800 font-medium"
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                        <span className={isSidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                      </span>
                      {active && (
                        <span
                          className={`w-2 h-2 rounded-full bg-blue-600 shrink-0 ${
                            isSidebarCollapsed ? "lg:hidden" : ""
                          }`}
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="p-3">
              <div
                className={`p-4 rounded-2xl bg-white border border-gray-200/70 shadow-xs ${
                  isSidebarCollapsed ? "lg:hidden" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Keep Learning</p>
                <p className="text-xs text-gray-500 mb-3">Track modules &amp; complete your projects</p>
                <Link href="/dashboard/courses" className="block">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl">
                    Explore Courses
                  </Button>
                </Link>
              </div>
              <div
                className={`mt-4 flex items-center ${
                  isSidebarCollapsed ? "lg:justify-center px-0" : "gap-3 px-2"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0"
                  title={user?.full_name || "User"}
                >
                  {userInitials}
                </div>
                <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? "lg:hidden" : ""}`}>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{userHandle}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-white">
          {/* Header */}
          <header className="h-20 border-b border-gray-100 bg-white flex items-center justify-between px-6 lg:px-10 shrink-0">
            <div className="flex items-center gap-4 lg:gap-8 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden -ml-2 text-gray-500"
                onClick={() => setShowMobileMenu(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight shrink-0">
                {getHeaderTitle()}
              </h1>
              <div className="hidden sm:flex relative w-64 lg:w-96 max-w-md">
                <input
                  type="text"
                  placeholder="Search Class..."
                  className="w-full pl-4 pr-10 py-2.5 bg-[#F7F7F7] border border-transparent rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
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
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 border border-blue-200 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                      {user?.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-400 leading-tight truncate mt-0.5">
                      {userHandle}
                    </p>
                  </div>
                </button>

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

          {/* Content Area */}
          {isLearnRoute ? (
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 lg:px-10 lg:py-8">
              <div className="max-w-7xl mx-auto">{children}</div>
            </div>
          )}
        </main>
      </div>

      {/* Rubber Duck AI Chat */}
      <RubberDuckChat />
      <LearningSurveyModal />
    </ProtectedRoute>
  )
}
