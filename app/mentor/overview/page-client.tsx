"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { courseAdminApi, authApi } from "@/lib/api"
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

const UPCOMING_SESSIONS = [
  {
    id: 1,
    studentName: "Alex Turner",
    topic: "ML Model Optimization",
    date: "2024-01-15",
    time: "10:00 AM",
    duration: 60,
    status: "confirmed",
  },
  {
    id: 2,
    studentName: "Jessica Lee",
    topic: "Career Guidance in AI",
    date: "2024-01-15",
    time: "2:00 PM",
    duration: 45,
    status: "confirmed",
  },
  {
    id: 3,
    studentName: "Ryan Cooper",
    topic: "TensorFlow Project Review",
    date: "2024-01-16",
    time: "11:00 AM",
    duration: 60,
    status: "pending",
  },
]

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

  // Calculate stats from real data
  const activeCourses = courses.filter(c => c.is_active).length
  const totalModules = courses.reduce((sum, c) => sum + (c.modules_count || 0), 0)
  const totalPaths = courses.reduce((sum, c) => sum + (c.paths_count || 0), 0)

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
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
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
                <p className="text-2xl font-bold text-gray-900">{UPCOMING_SESSIONS.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">4.9</p>
                <p className="text-sm text-gray-500">Rating</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Based on reviews
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
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
          {UPCOMING_SESSIONS.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {UPCOMING_SESSIONS.slice(0, 3).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {session.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{session.topic}</p>
                      <p className="text-sm text-gray-500">with {session.studentName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{session.time}</p>
                    <p className="text-xs text-gray-500">{session.date}</p>
                  </div>
                  <Badge 
                    className={session.status === "confirmed" 
                      ? "bg-green-100 text-green-700 border-0" 
                      : "bg-amber-100 text-amber-700 border-0"
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
