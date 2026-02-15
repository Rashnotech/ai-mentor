"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Search, ChevronDown, Clock, Layers, Layout, CheckCircle2, Star, Loader2, LogOut, User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { publicCourseApi, CourseListResponse } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Gradient colors for course cards
const GRADIENTS = [
  "bg-gradient-to-br from-emerald-800 to-teal-900",
  "bg-gradient-to-br from-indigo-900 to-purple-900",
  "bg-gradient-to-br from-orange-800 to-rose-900",
  "bg-gradient-to-br from-slate-800 to-cyan-900",
  "bg-gradient-to-br from-green-900 to-emerald-800",
  "bg-gradient-to-br from-yellow-900 to-blue-900",
  "bg-gradient-to-br from-blue-800 to-indigo-900",
  "bg-gradient-to-br from-pink-800 to-rose-900",
]

// Level color mapping
const getLevelColor = (level: string) => {
  switch (level?.toUpperCase()) {
    case "BEGINNER":
      return "bg-green-100 text-green-700 border-green-200"
    case "INTERMEDIATE":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "ADVANCED":
      return "bg-red-100 text-red-700 border-red-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export default function CoursesPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])

  // Fetch courses from backend
  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseListResponse[]>({
    queryKey: ["public-courses"],
    queryFn: () => publicCourseApi.listCourses(),
  })

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Search Filter
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())

      // Level Filter
      const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(course.difficulty_level.toUpperCase())

      return matchesSearch && matchesLevel
    })
  }, [courses, searchQuery, selectedLevels])

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))
  }

  const clearFilters = () => {
    setSelectedLevels([])
    setSearchQuery("")
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold text-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Layout className="w-5 h-5 text-white" />
              </div>
              LearnTech
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/courses" className="text-blue-600 hover:text-blue-700 transition-colors">
                Courses
              </Link>
              {isAuthenticated && (
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                  My Learning
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user.full_name || user.email}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || "User"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm hover:shadow"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-[#0f172a] py-16 border-b border-gray-200">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-4">Find Your Next Project-Based Course</h1>
          <p className="text-gray-300 mb-8 text-lg">
            Master new tech skills by building real-world applications with our AI-powered learning platform.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for 'React' or 'Data Science'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e293b] border border-gray-700 rounded-lg pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-500 shadow-xl"
            />
            <button className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-md text-sm font-medium transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filter Courses</h3>
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Clear
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Skill Level</h4>
            {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((level) => (
              <label key={level} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    selectedLevels.includes(level)
                      ? "border-blue-600"
                      : "border-gray-300 bg-white group-hover:border-gray-400"
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    toggleLevel(level)
                  }}
                >
                  {selectedLevels.includes(level) && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                </div>
                <span
                  className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors select-none capitalize"
                  onClick={() => toggleLevel(level)}
                >
                  {level.toLowerCase()}
                </span>
              </label>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{filteredCourses.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{courses.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
                Most Popular <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {coursesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">No courses found</h3>
              <p className="text-gray-500">Try adjusting your filters or search query.</p>
              <button
                onClick={clearFilters}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCourses.map((course, index) => (
                <Link href={`/courses/${course.slug}`} key={course.course_id} className="block group h-full">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-200 transition-all hover:shadow-lg hover:shadow-blue-900/5 h-full flex flex-col">
                    {/* Card Image */}
                    <div className={`h-40 w-full ${GRADIENTS[index % GRADIENTS.length]} relative p-4 shrink-0`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
                      <div className="flex gap-2 relative z-10">
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm bg-white/90 ${getLevelColor(course.difficulty_level)}`}
                        >
                          {course.difficulty_level.charAt(0) + course.difficulty_level.slice(1).toLowerCase()}
                        </span>
                        {course.modules_count > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm bg-white/90 text-purple-600 border-purple-200">
                            {`${course.modules_count} Modules`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description}</p>
                      
                      <div className="mb-4">
                        <span className="text-lg font-bold text-green-600">
                          {course.min_price && course.min_price > 0 ? `$${course.min_price.toFixed(2)}` : "Free"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <Layers className="w-3.5 h-3.5" />
                          {course.paths_count || 0} Paths
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {course.estimated_hours || 0} Hours
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination (Mock) */}
          {filteredCourses.length > 0 && (
            <div className="flex justify-center mt-12 gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all">
                &lt;
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white font-medium shadow-sm">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all">
                2
              </button>
              <span className="flex items-center text-gray-400 px-1">...</span>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all">
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
