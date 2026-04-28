"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { courseAdminApi, sessionsApi } from "@/lib/api"
import Link from "next/link"
import {
  Users,
  BookOpen,
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  Star,
  Video,
  ArrowUpRight,
  GraduationCap,
  AlertCircle,
} from "lucide-react"

export default function OverviewPage() {
  const { user } = useAuth()

  // Fetch courses created by this mentor
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["mentor", "courses", user?.id],
    queryFn: () =>
      courseAdminApi.listCourses({
        created_by: user?.id,
      }),
    enabled: !!user?.id,
    staleTime: 30000,
  })

  const { data: upcomingSessionData } = useQuery({
    queryKey: ["mentor", "sessions", "upcoming"],
    queryFn: () => sessionsApi.listMentorSessions({ status: "upcoming", page_size: 3 }),
    enabled: !!user?.id,
    staleTime: 30000,
  })

  // Calculate stats from real data
  const activeCourses = courses.filter(c => c.is_active).length
  const totalModules = courses.reduce((sum, c) => sum + (c.modules_count || 0), 0)
  const totalPaths = courses.reduce((sum, c) => sum + (c.paths_count || 0), 0)
  const upcomingSessions = upcomingSessionData?.sessions ?? []
  const averageCourseRating = courses.length
    ? courses.reduce((sum, course) => sum + (course.average_rating ?? 0), 0) / courses.length
    : 0
  const ratingDisplay = averageCourseRating > 0 ? averageCourseRating.toFixed(1) : "0.0"

  // Helper to get user initials
  const getUserInitials = () => {
    if (!user?.full_name) return "M"
    return user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Profile */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {getUserInitials()}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name?.split(" ")[0] || "Mentor"}!</h1>
                <p className="text-gray-500">{user?.bio || "Mentor"}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-blue-100 text-blue-700 border-0">Mentor</Badge>
                  {user?.github_username && (
                    <Badge variant="outline" className="text-gray-600">GitHub: {user.github_username}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                <p className="text-sm text-gray-500">Courses</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {activeCourses} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalModules}</p>
                <p className="text-sm text-gray-500">Modules</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Across {totalPaths} learning paths
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Video className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingSessions.length}</p>
                <p className="text-sm text-gray-500">Upcoming</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sessions this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{ratingDisplay}</p>
                <p className="text-sm text-gray-500">Rating</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Based on your courses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled mentoring sessions</CardDescription>
            </div>
            <Link href="/mentor/sessions">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div key={session.session_id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shrink-0">
                      {session.title.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{session.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {session.description || "Upcoming mentoring session"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900">{new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-xs text-gray-500">{new Date(session.scheduled_date).toLocaleDateString()}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0 shrink-0">
                    {session.computed_status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/mentor/my-courses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Courses</h3>
                <p className="text-sm text-gray-500">Create and edit your courses</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mentor/my-students">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">View Students</h3>
                <p className="text-sm text-gray-500">See enrolled students</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
