"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  Award,
  Star,
  Loader2,
  Sparkles,
  BookMarked,
  Compass,
  HeartHandshake,
  Clock,
  CheckCircle2,
  ArrowRight,
  Layers,
  PlayCircle,
  Flame,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUserStore } from "@/lib/stores/user-store"
import {
  studentCoursesApi,
  gamificationApi,
  type StudentCourseResponse,
  type AIMentorFeedbackItem,
} from "@/lib/api"

const FEEDBACK_ICONS: Record<string, typeof Sparkles> = {
  quiz_encouragement: Sparkles,
  quiz_correction: BookMarked,
  project_guidance: Compass,
  inactivity_checkin: HeartHandshake,
  module_unlocked: BookOpen,
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMinutes = Math.round(diffMs / 60000)
  if (diffMinutes < 60) return diffMinutes <= 1 ? "just now" : `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`
}

interface DashboardViewProps {
  onChangeView: (view: string) => void
}

export function DashboardView({ onChangeView }: DashboardViewProps) {
  const user = useUserStore((state) => state.user)
  const firstName = user?.full_name?.split(" ")[0] || "there"

  const [enrolledCourses, setEnrolledCourses] = useState<StudentCourseResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mentorFeedback, setMentorFeedback] = useState<AIMentorFeedbackItem[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true)
  const [streakDays, setStreakDays] = useState<number>(user?.streak_days ?? 0)
  const [totalXp, setTotalXp] = useState<number>(user?.total_xp ?? 0)

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

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const items = await studentCoursesApi.getMentorFeedback(10)
        setMentorFeedback(items)
      } catch (error) {
        console.error("Failed to fetch AI mentor feedback:", error)
      } finally {
        setIsLoadingFeedback(false)
      }
    }
    fetchFeedback()
  }, [])

  useEffect(() => {
    gamificationApi
      .getMyGamification()
      .then((g) => {
        setStreakDays(g.current_streak)
        setTotalXp(g.total_xp)
      })
      .catch(() => {
        // Non-blocking
      })
  }, [])

  // Get the course with most progress for next steps
  const activeCourse =
    enrolledCourses.find((c) => c.progress_percent > 0 && c.progress_percent < 100) ||
    enrolledCourses[0]

  // Calculate stats from enrolled courses
  const coursesInProgress = enrolledCourses.filter(
    (c) => c.progress_percent > 0 && c.progress_percent < 100
  ).length
  const completedCourses = enrolledCourses.filter((c) => c.progress_percent === 100).length
  const latestFeedback = mentorFeedback[0] || null

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {firstName}!</h1>
          <p className="text-gray-500">Let&apos;s continue your learning journey.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C]">
            <Flame className="w-4 h-4 text-[#EA580C]" />
            <span className="text-sm font-bold">{streakDays}</span>
            <span className="text-xs font-medium">Day Streak</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EBF2FF] border border-[#BFDBFE] text-[#1D4ED8]">
            <Zap className="w-4 h-4 text-[#2563EB]" />
            <span className="text-sm font-bold">{totalXp.toLocaleString()}</span>
            <span className="text-xs font-medium">XP</span>
          </div>
        </div>
      </div>

      {/* Three Solid Color Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#2563EB] text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-blue-100 mb-1">Enrolled Courses</div>
            <div className="text-4xl font-bold tracking-tight">{enrolledCourses.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1D4ED8] flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#EA580C] text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-orange-100 mb-1">In Progress</div>
            <div className="text-4xl font-bold tracking-tight">{coursesInProgress}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#C2410C] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#16A34A] text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-green-100 mb-1">Completed</div>
            <div className="text-4xl font-bold tracking-tight">{completedCourses}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#15803D] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col - Revamped Courses Display */}
        <div className="xl:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pick up right where you left off</p>
            </div>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl font-semibold text-sm"
              onClick={() => onChangeView("my-courses")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-12 bg-[#F8F9FA] rounded-2xl border border-gray-200">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No courses yet. Complete onboarding to get started!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {enrolledCourses.slice(0, 2).map((course) => (
                <div
                  key={course.course_id}
                  className="group rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-[#4E89FF] hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <div className="h-40 bg-[#EBF2FF] relative overflow-hidden">
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
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-semibold uppercase tracking-wide">
                        {course.difficulty_level || "Course"}
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
                      <h3 className="font-bold text-gray-900 text-base mb-1.5 line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#4E89FF]" />
                          {course.completed_modules}/{course.total_modules} Modules
                        </span>
                        {course.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {course.estimated_hours}h
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">Course Progress</span>
                        <span className="font-bold text-gray-900">{course.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full mb-4 overflow-hidden">
                        <div
                          className="bg-[#4E89FF] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress_percent}%` }}
                        />
                      </div>
                      <Link
                        href={`/dashboard/courses/${course.slug}/learn`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors"
                      >
                        {course.progress_percent > 0 ? "Continue Learning" : "Start Course"}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col - Next Steps & Latest AI Mentor Feedback */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-gray-900 font-bold text-base">
              <div className="w-8 h-8 rounded-lg bg-[#EBF2FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              Your Next Steps
            </div>
            {activeCourse ? (
              <>
                <p className="text-gray-600 text-sm mb-4">
                  Based on your progress in{" "}
                  <span className="font-semibold text-gray-900">{activeCourse.title}</span>,
                  continue where you left off.
                </p>
                <div className="p-4 bg-[#F4F5F7] rounded-xl mb-4">
                  <div className="text-xs text-[#2563EB] font-bold mb-1">
                    {activeCourse.progress_percent}% Complete
                  </div>
                  <div className="font-semibold text-sm text-gray-900">
                    {activeCourse.completed_lessons}/{activeCourse.total_lessons} Lessons Done
                  </div>
                </div>
                <Link href={`/dashboard/courses/${activeCourse.slug}/learn`} className="block w-full">
                  <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
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

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-yellow-400 font-semibold text-sm">
              <Star className="w-4 h-4 fill-current" />
              AI Mentor Feedback
            </div>

            {isLoadingFeedback ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : mentorFeedback.length === 0 || !latestFeedback ? (
              <div className="text-sm text-gray-300 italic">
                &ldquo;Keep up the great work! Complete a quiz or start a project to get personalized feedback from your AI mentor.&rdquo;
              </div>
            ) : (
              (() => {
                const Icon = FEEDBACK_ICONS[latestFeedback.category] ?? Sparkles
                return (
                  <div key={latestFeedback.feedback_id} className="border-l-2 border-yellow-400 pl-3.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Icon className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span className="line-clamp-1">{latestFeedback.title}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-gray-300 leading-relaxed">
                      {latestFeedback.message}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">{timeAgo(latestFeedback.created_at)}</p>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
