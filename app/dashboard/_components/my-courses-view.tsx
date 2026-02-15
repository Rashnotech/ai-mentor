"use client"

import { useState, useEffect } from "react"
import { BookOpen, Star, Loader2, RefreshCw, AlertCircle, Plus } from "lucide-react"
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
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCourses}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* AI Help Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">AI Provides Personalized Help</h3>
          <p className="text-sm text-blue-700">
            Get real-time AI assistance as you learn. Ask questions, get hints on exercises, and receive
            personalized explanations tailored to your learning style and progress.
          </p>
        </div>
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
        <div className="flex flex-col items-center justify-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-600 mb-2">No courses available yet</p>
          <p className="text-gray-400 text-sm">Check back later for new courses!</p>
        </div>
      )}

      {/* Enrolled Courses */}
      {!isLoading && !error && enrolledCourses.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">My Enrolled Courses</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {enrolledCourses.map((course) => (
              <div key={course.course_id} className="p-4 rounded-xl border border-blue-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {course.cover_image_url ? (
                    <img 
                      src={course.cover_image_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded border border-gray-100">
                    {getCategory(course.difficulty_level)}
                  </span>
                  <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                    Enrolled
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${course.progress_percent}%` }} 
                  />
                </div>
                
                {/* Stats */}
                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>{course.progress_percent}% Complete</span>
                  <span>{course.completed_modules}/{course.total_modules} Modules</span>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-400">
                    {course.estimated_hours}h estimated
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCourse({ id: course.course_id, title: course.title })
                        setReviewModalOpen(true)
                      }}
                      className="text-sm font-medium text-yellow-600 hover:text-yellow-700 flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                      Rate
                    </button>
                    <Link 
                      href={`/courses/${course.slug}/learn`} 
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {course.progress_percent > 0 ? "Continue" : "Start"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No enrolled courses but has available */}
      {!isLoading && !error && enrolledCourses.length === 0 && availableCourses.length > 0 && (
        <div className="mb-8 p-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
          <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">You haven't enrolled in any courses yet</p>
          <p className="text-gray-400 text-sm">Explore available courses below to get started!</p>
        </div>
      )}

      {/* Available Courses */}
      {!isLoading && !error && availableCourses.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Courses</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <div key={course.course_id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {course.cover_image_url ? (
                    <img 
                      src={course.cover_image_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="mb-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded border border-gray-100">
                    {getCategory(course.difficulty_level)}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-400">
                    {course.estimated_hours}h estimated
                  </span>
                  <Link 
                    href={`/courses/${course.slug}`} 
                    className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Enroll
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
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
