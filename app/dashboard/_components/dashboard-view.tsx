"use client"

import { useState, useEffect } from "react"
import { BookOpen, Award, Star, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUserStore } from "@/lib/stores/user-store"
import { studentCoursesApi, type StudentCourseResponse } from "@/lib/api"

interface DashboardViewProps {
  onChangeView: (view: string) => void
}

export function DashboardView({ onChangeView }: DashboardViewProps) {
  const user = useUserStore((state) => state.user)
  const firstName = user?.full_name?.split(" ")[0] || "there"
  
  const [enrolledCourses, setEnrolledCourses] = useState<StudentCourseResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await studentCoursesApi.getMyCourses()
        setEnrolledCourses(data.enrolled)
      } catch (error) {
        console.error("Failed to fetch courses:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourses()
  }, [])

  // Get the course with most progress for next steps
  const activeCourse = enrolledCourses.find(c => c.progress_percent > 0 && c.progress_percent < 100) || enrolledCourses[0]

  // Calculate stats from enrolled courses
  const coursesInProgress = enrolledCourses.filter(c => c.progress_percent > 0 && c.progress_percent < 100).length
  const completedCourses = enrolledCourses.filter(c => c.progress_percent === 100).length

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Stats */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {firstName}!</h1>
        <p className="text-gray-500">Let's continue your learning journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Enrolled Courses", value: enrolledCourses.length.toString(), color: "bg-blue-50 text-blue-700" },
          { label: "In Progress", value: coursesInProgress.toString(), color: "bg-orange-50 text-orange-700" },
          { label: "Completed", value: completedCourses.toString(), color: "bg-green-50 text-green-700" },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border border-gray-100 ${stat.color} bg-opacity-50`}>
            <div className="text-sm font-medium opacity-80 mb-1">{stat.label}</div>
            <div className="text-4xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col - Courses */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => onChangeView("my-courses")}
            >
              View All
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No courses yet. Complete onboarding to get started!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {enrolledCourses.slice(0, 2).map((course) => (
                <div
                  key={course.course_id}
                  className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {course.cover_image_url ? (
                      <img 
                        src={course.cover_image_url} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-300">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{course.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {course.completed_modules}/{course.total_modules} Modules
                  </p>
                  <div className="w-full bg-gray-100 h-2 rounded-full mb-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${course.progress_percent}%` }} 
                    />
                  </div>
                  <Link
                    href={`/courses/${course.slug}/learn`}
                    className="block w-full text-center py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors"
                  >
                    {course.progress_percent > 0 ? "Continue Learning" : "Start Course"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col - Next Steps & Feedback */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-blue-700 font-medium">
              <Award className="w-5 h-5" />
              Your Next Steps
            </div>
            {activeCourse ? (
              <>
                <p className="text-gray-600 text-sm mb-4">
                  Based on your progress in <span className="font-semibold text-gray-900">{activeCourse.title}</span>, 
                  continue where you left off.
                </p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                  <div className="text-xs text-blue-600 font-semibold mb-1">
                    {activeCourse.progress_percent}% Complete
                  </div>
                  <div className="font-medium text-gray-900">
                    {activeCourse.completed_lessons}/{activeCourse.total_lessons} Lessons Done
                  </div>
                </div>
                <Link href={`/courses/${activeCourse.slug}/learn`} className="block w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Continue Course
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Enroll in a course to see your next steps here!
              </p>
            )}
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-yellow-400 font-medium">
              <Star className="w-5 h-5" />
              AI Mentor Feedback
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-300 italic">
                "Keep up the great work! Complete your current lesson to unlock personalized feedback from your AI mentor."
              </div>
              <button className="text-sm text-blue-300 hover:underline">View full feedback →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
