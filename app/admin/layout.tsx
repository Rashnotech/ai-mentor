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
  BarChart3,
  Settings,
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  Shield,
  GraduationCap,
  UserCog,
  MessagesSquare,
  Receipt,
  Loader2,
} from "lucide-react"

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { id: "users", label: "User Management", icon: Users, href: "/admin/users" },
  { id: "courses", label: "Course Management", icon: BookOpen, href: "/admin/courses" },
  { id: "bootcamps", label: "Bootcamp Management", icon: GraduationCap, href: "/admin/bootcamps" },
  { id: "mentors", label: "Mentor Management", icon: UserCog, href: "/admin/mentors" },
  { id: "community", label: "Community", icon: MessagesSquare, href: "/admin/community" },
  { id: "transactions", label: "Transactions", icon: Receipt, href: "/admin/transactions" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { id: "settings", label: "Settings", icon: Settings, href: "/admin/settings" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getCurrentView = () => {
    if (pathname === "/admin") return "overview"
    const segment = pathname.split("/")[2]
    return segment || "overview"
  }

  const currentView = getCurrentView()

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen h-screen bg-gray-50 flex overflow-hidden font-sans text-gray-900">
        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-gray-200 flex-shrink-0 transform transition-transform duration-200 ease-in-out ${
            showMobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <Link href="/admin" className="flex items-center gap-2 text-blue-600">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">Admin Panel</span>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <Link key={item.id} href={item.href}>
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

            <div className="p-4 border-t border-gray-100">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <Shield className="w-8 h-8 mb-2 opacity-90" />
                <p className="text-sm font-semibold mb-1">Admin Access</p>
                <p className="text-xs opacity-90">Full system control</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
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
                  placeholder="Search users, courses, analytics..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </Button>

              {/* Admin Profile Dropdown */}
              <div className="relative">
                <div
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs cursor-pointer hover:bg-purple-200 transition-colors"
                >
                  {user?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
                </div>

                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-sm text-gray-900">{user?.full_name || "Admin User"}</p>
                        <p className="text-xs text-gray-500">{user?.email || "admin@learntech.com"}</p>
                      </div>
                      <Link href="/dashboard">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                          <User className="w-4 h-4" />
                          View as Student
                        </button>
                      </Link>
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
