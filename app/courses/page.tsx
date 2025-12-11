"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronDown, Clock, Layers, Layout, CheckCircle2 } from "lucide-react"

const COURSES = [
  {
    id: 1,
    title: "The Complete Python Bootcamp: From Zero to Hero",
    description: "Build 10 real-world Python applications and master data science fundamentals.",
    level: "Beginner",
    levelColor: "bg-green-100 text-green-700 border-green-200",
    tag: "Python",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    projects: 5,
    hours: 25,
    image: "bg-gradient-to-br from-emerald-800 to-teal-900",
  },
  {
    id: 2,
    title: "Advanced React & State Management",
    description: "Master Redux, MobX, and Context API to build scalable web applications.",
    level: "Intermediate",
    levelColor: "bg-amber-100 text-amber-700 border-amber-200",
    tag: "React",
    tagColor: "bg-sky-100 text-sky-700 border-sky-200",
    projects: 8,
    hours: 42,
    image: "bg-gradient-to-br from-indigo-900 to-purple-900",
  },
  {
    id: 3,
    title: "UI/UX Design Fundamentals with Figma",
    description: "Learn design principles and create stunning interfaces from scratch.",
    level: "Beginner",
    levelColor: "bg-green-100 text-green-700 border-green-200",
    tag: "UI/UX",
    tagColor: "bg-purple-100 text-purple-700 border-purple-200",
    projects: 12,
    hours: 30,
    image: "bg-gradient-to-br from-orange-800 to-rose-900",
  },
  {
    id: 4,
    title: "Data Science & Machine Learning Bootcamp",
    description: "Use Pandas, NumPy, and Scikit-learn to analyze data and build models.",
    level: "Advanced",
    levelColor: "bg-red-100 text-red-700 border-red-200",
    tag: "Data Science",
    tagColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    projects: 15,
    hours: 80,
    image: "bg-gradient-to-br from-slate-800 to-cyan-900",
  },
  {
    id: 5,
    title: "The Complete Node.js Developer Course",
    description: "Learn to build, test, and deploy real-world production applications.",
    level: "Intermediate",
    levelColor: "bg-amber-100 text-amber-700 border-amber-200",
    tag: "Web Development",
    tagColor: "bg-lime-100 text-lime-700 border-lime-200",
    projects: 7,
    hours: 35,
    image: "bg-gradient-to-br from-green-900 to-emerald-800",
  },
  {
    id: 6,
    title: "iOS & Swift - The Complete iOS App Bootcamp",
    description: "From beginner to iOS app developer with just one course.",
    level: "Intermediate",
    levelColor: "bg-amber-100 text-amber-700 border-amber-200",
    tag: "Mobile Development",
    tagColor: "bg-blue-100 text-blue-700 border-blue-200",
    projects: 10,
    hours: 60,
    image: "bg-gradient-to-br from-yellow-900 to-blue-900",
  },
]

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])

  const filteredCourses = useMemo(() => {
    return COURSES.filter((course) => {
      // Search Filter
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tag.toLowerCase().includes(searchQuery.toLowerCase())

      // Topic Filter
      const matchesTopic =
        selectedTopics.length === 0 ||
        selectedTopics.includes(course.tag) ||
        (course.tag === "React" && selectedTopics.includes("Web Development")) || // Simple mapping
        (course.tag === "Node.js" && selectedTopics.includes("Web Development"))

      // Level Filter
      const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(course.level)

      return matchesSearch && matchesTopic && matchesLevel
    })
  }, [searchQuery, selectedTopics, selectedLevels])

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]))
  }

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))
  }

  const clearFilters = () => {
    setSelectedTopics([])
    setSelectedLevels([])
    setSearchQuery("")
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
              <Link href="/workspace" className="text-gray-600 hover:text-gray-900 transition-colors">
                My Learning
              </Link>
              <Link href="/workspace" className="text-gray-600 hover:text-gray-900 transition-colors">
                Projects
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200"></div>
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
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Topic</h4>
            {["Web Development", "AI & Machine Learning", "UI/UX Design", "Data Science", "Mobile Development"].map(
              (topic) => (
                <label key={topic} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selectedTopics.includes(topic)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 bg-white group-hover:border-gray-400"
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleTopic(topic)
                    }}
                  >
                    {selectedTopics.includes(topic) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors select-none"
                    onClick={() => toggleTopic(topic)}
                  >
                    {topic}
                  </span>
                </label>
              ),
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Skill Level</h4>
            {["Beginner", "Intermediate", "Advanced"].map((level) => (
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
                  className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors select-none"
                  onClick={() => toggleLevel(level)}
                >
                  {level}
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
              <span className="font-semibold text-gray-900">{COURSES.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <button className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
                Most Popular <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
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
              {filteredCourses.map((course) => (
                <Link href={`/courses/${course.id}`} key={course.id} className="block group h-full">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-200 transition-all hover:shadow-lg hover:shadow-blue-900/5 h-full flex flex-col">
                    {/* Card Image */}
                    <div className={`h-40 w-full ${course.image} relative p-4 shrink-0`}>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
                      <div className="flex gap-2 relative z-10">
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm bg-white/90 ${course.levelColor}`}
                        >
                          {course.level}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-sm bg-white/90 ${course.tagColor}`}
                        >
                          {course.tag}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6 line-clamp-2">{course.description}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <Layers className="w-3.5 h-3.5" />
                          {course.projects} Projects
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {course.hours} Hours
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
