"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Star,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Layers,
  Clock,
  ArrowRight,
  PlayCircle,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { studentCoursesApi, type StudentCourseResponse, type AvailableCourseResponse } from "@/lib/api"
import { CourseReviewModal } from "./course-review"

export function MyCoursesView() {
  const [enrolledCourses, setEnrolledCourses] = useState<StudentCourseResponse[]>([])
  const [availableCourses, setAvailableCourses] = useState<AvailableCourseResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<{ id: number; title: string } | null>(null)

  const fetchCourses = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await studentCoursesApi.getMyCourses()
      setEnrolledCourses(data.enrolled)
      setAvailableCourses(data.available)
    } catch (err) {
      console.error("Failed to fetch courses:", err)
      setError("Failed to load courses. Please try again.")
      toast.error("Failed to load courses")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  // Get category from difficulty level
  const getCategory = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "Beginner"
      case "INTERMEDIATE":
        return "Intermediate"
      case "ADVANCED":
        return "Advanced"
      default:
        return "Development"
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your enrolled classes and explore new paths</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCourses}
          disabled={isLoading}
          className="text-gray-600 hover:text-gray-900 rounded-xl border-gray-200"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading courses...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchCourses} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && enrolledCourses.length === 0 && availableCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-[#F8F9FA] rounded-2xl border border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-700 font-semibold mb-1">No courses available yet</p>
          <p className="text-gray-400 text-sm">Check back later for new courses!</p>
        </div>
      )}

      {/* Enrolled Courses */}
      {!isLoading && !error && enrolledCourses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Enrolled Classes ({enrolledCourses.length})</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div
                key={course.course_id}
                className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[#4E89FF] hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="h-44 bg-[#EBF2FF] relative overflow-hidden">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2563EB] flex items-center justify-center text-white">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-gray-900 text-white rounded-lg">
                      {getCategory(course.difficulty_level)}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-[#16A34A] text-white rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Enrolled
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <div className="w-9 h-9 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-sm">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base mb-1.5 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span className="flex items-center gap-1 font-medium">
                        <Layers className="w-3.5 h-3.5 text-[#4E89FF]" />
                        {course.completed_modules}/{course.total_modules} Modules
                      </span>
                      <span className="font-bold text-gray-900">{course.progress_percent}%</span>
                    </div>

                    <div className="w-full bg-gray-100 h-2 rounded-full mb-4 overflow-hidden">
                      <div
                        className="bg-[#4E89FF] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${course.progress_percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {course.estimated_hours}h
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCourse({ id: course.course_id, title: course.title })
                            setReviewModalOpen(true)
                          }}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          Rate
                        </button>
                      </div>

                      <Link
                        href={`/dashboard/courses/${course.slug}/learn`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors"
                      >
                        {course.progress_percent > 0 ? "Continue" : "Start"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No enrolled courses but has available */}
      {!isLoading && !error && enrolledCourses.length === 0 && availableCourses.length > 0 && (
        <div className="p-6 rounded-2xl border border-dashed border-gray-300 bg-[#F8F9FA] text-center">
          <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">You haven&apos;t enrolled in any courses yet</p>
          <p className="text-gray-400 text-sm">Explore available courses below to get started!</p>
        </div>
      )}

      {/* Available Courses */}
      {!isLoading && !error && availableCourses.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Available Courses</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <div
                key={course.course_id}
                className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[#4E89FF] hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="h-44 bg-[#F4F5F7] relative overflow-hidden">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-gray-900 text-white rounded-lg">
                      {getCategory(course.difficulty_level)}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base mb-1.5 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {course.estimated_hours}h estimated
                    </span>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EBF2FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Enroll
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Review Modal */}
      {selectedCourse && (
        <CourseReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false)
            setSelectedCourse(null)
          }}
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          onReviewSubmitted={fetchCourses}
        />
      )}
    </div>
  )
}
