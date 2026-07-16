"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { courseAdminApi, userAdminApi } from "@/lib/api"
import {
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Award,
  Loader2,
  UserCog,
} from "lucide-react"

// Mock data that will be replaced by API calls in future iterations
const PENDING_REVIEWS = [
  {
    id: 1,
    student: "Alex Turner",
    project: "E-commerce Dashboard",
    course: "React Advanced",
    submitted: "3 hours ago",
  },
  { id: 2, student: "Maria Garcia", project: "Weather App", course: "JavaScript Basics", submitted: "5 hours ago" },
  { id: 3, student: "John Smith", project: "Task Manager", course: "Node.js", submitted: "1 day ago" },
]

const SYSTEM_ALERTS = [
  { type: "warning", message: "Server load at 85% - Consider scaling", time: "10 min ago" },
  { type: "info", message: "Database backup completed successfully", time: "1 hour ago" },
  { type: "error", message: "Payment gateway timeout reported by 3 users", time: "2 hours ago" },
]

// Admin Views Components
export function OverviewView() {
  // Fetch user stats from API
  const { 
    data: userStats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => userAdminApi.getStats(),
    staleTime: 60000, // 1 minute
  })

  // Fetch courses from API
  const { 
    data: courses, 
    isLoading: isLoadingCourses 
  } = useQuery({
    queryKey: ["admin", "courses-overview"],
    queryFn: () => courseAdminApi.listCourses({ limit: 4 }),
    staleTime: 60000,
  })

  // Fetch recent users from API
  const { 
    data: recentUsersData, 
    isLoading: isLoadingRecentUsers 
  } = useQuery({
    queryKey: ["admin", "users", "recent"],
    queryFn: () => userAdminApi.listUsers({ limit: 5, offset: 0 }),
    staleTime: 60000,
  })

  const recentUsers = recentUsersData?.users || []

  // Build stats array from API data
  const statsData = [
    { 
      label: "Total Students", 
      value: isLoadingStats ? "..." : userStats?.students?.toLocaleString() || "0", 
      change: "+12.5%", 
      trend: "up", 
      icon: Users 
    },
    { 
      label: "Active Courses", 
      value: isLoadingCourses ? "..." : courses?.length?.toString() || "0", 
      change: `${courses?.filter(c => c.is_active)?.length || 0} active`, 
      trend: "up", 
      icon: BookOpen 
    },
    { 
      label: "Total Mentors", 
      value: isLoadingStats ? "..." : userStats?.mentors?.toLocaleString() || "0", 
      change: "Active", 
      trend: "up", 
      icon: UserCog 
    },
    { 
      label: "Total Users", 
      value: isLoadingStats ? "..." : userStats?.total_users?.toLocaleString() || "0", 
      change: `${userStats?.active_users || 0} active`, 
      trend: "up", 
      icon: TrendingUp 
    },
  ]

  // Format the joined date
  const formatJoinedDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge
                    variant={stat.trend === "up" ? "default" : "secondary"}
                    className="bg-green-100 text-green-700 border-0"
                  >
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>New users who joined recently</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecentUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent registrations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          user.is_active
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-yellow-100 text-yellow-700 border-0"
                        }
                      >
                        {user.is_active ? "active" : "inactive"}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{formatJoinedDate(user.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/users">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Top Performing Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>Courses by enrollment and modules</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCourses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : !courses || courses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No courses available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.slice(0, 4).map((course) => (
                  <div key={course.course_id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{course.title}</p>
                        <p className="text-xs text-gray-500">{course.modules_count} modules • {course.paths_count} paths</p>
                      </div>
                      <Badge className={course.is_active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-600 border-0"}>
                        {course.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.estimated_hours}h estimated
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {course.difficulty_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/courses">
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Courses
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews & Alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Project Reviews</CardTitle>
            <CardDescription>Projects waiting for instructor feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PENDING_REVIEWS.map((review) => (
                <div key={review.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{review.project}</p>
                      <p className="text-xs text-gray-500">by {review.student}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                      <Eye className="w-3 h-3 mr-1" />
                      Review
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Badge variant="secondary" className="text-xs">
                      {review.course}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {review.submitted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent system events and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {SYSTEM_ALERTS.map((alert, idx) => {
                const Icon = alert.type === "error" ? XCircle : alert.type === "warning" ? AlertCircle : CheckCircle
                const colorClass =
                  alert.type === "error"
                    ? "text-red-600 bg-red-50"
                    : alert.type === "warning"
                      ? "text-yellow-600 bg-yellow-50"
                      : "text-green-600 bg-green-50"
                return (
                  <div key={idx} className={`p-3 rounded-lg ${colorClass}`}>
                    <div className="flex gap-3">
                      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs opacity-75 mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


// Main Admin Dashboard Component - Shows Overview
export default function AdminDashboard() {
  return <OverviewView />
}
