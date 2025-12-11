"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  TrendingUp,
  DollarSign,
  Activity,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Shield,
  Database,
  Target,
  Award,
  Download,
} from "lucide-react"

// Mock data for admin dashboard
const ADMIN_STATS = [
  { label: "Total Students", value: "2,847", change: "+12.5%", trend: "up", icon: Users },
  { label: "Active Courses", value: "128", change: "+8", trend: "up", icon: BookOpen },
  { label: "Revenue (MTD)", value: "$84,290", change: "+23.1%", trend: "up", icon: DollarSign },
  { label: "Completion Rate", value: "73.2%", change: "+5.4%", trend: "up", icon: TrendingUp },
]

const RECENT_USERS = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    joined: "2 hours ago",
    status: "active",
    level: "Beginner",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "mchen@email.com",
    joined: "5 hours ago",
    status: "active",
    level: "Intermediate",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    joined: "1 day ago",
    status: "pending",
    level: "Beginner",
  },
  { id: 4, name: "David Kim", email: "dkim@email.com", joined: "2 days ago", status: "active", level: "Advanced" },
]

const COURSE_PERFORMANCE = [
  { name: "Advanced Python", students: 342, completion: 78, revenue: "$12,540", rating: 4.8 },
  { name: "React for Beginners", students: 521, completion: 82, revenue: "$18,230", rating: 4.9 },
  { name: "UI/UX Design", students: 287, completion: 71, revenue: "$9,870", rating: 4.7 },
  { name: "Data Science", students: 198, completion: 65, revenue: "$8,420", rating: 4.6 },
]

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
function OverviewView() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ADMIN_STATS.map((stat) => {
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
            <CardDescription>New students in the last 48 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {RECENT_USERS.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={user.status === "active" ? "default" : "secondary"}
                      className={
                        user.status === "active"
                          ? "bg-green-100 text-green-700 border-0"
                          : "bg-yellow-100 text-yellow-700 border-0"
                      }
                    >
                      {user.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{user.joined}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              View All Users
            </Button>
          </CardContent>
        </Card>

        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>Courses by enrollment and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {COURSE_PERFORMANCE.map((course) => (
                <div key={course.name} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{course.name}</p>
                      <p className="text-xs text-gray-500">{course.students} students enrolled</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-0">{course.revenue}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {course.completion}% completion
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {course.rating} rating
                    </span>
                  </div>
                </div>
              ))}
            </div>
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

function UsersManagementView() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 text-sm">Manage all registered students and their accounts</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Status</option>
                <option>Active</option>
                <option>Pending</option>
                <option>Suspended</option>
              </select>
              <select className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Level</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Courses</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...RECENT_USERS, ...RECENT_USERS].map((user, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-sm text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {user.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{Math.floor(Math.random() * 5) + 1}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={
                          user.status === "active"
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-yellow-100 text-yellow-700 border-0"
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.joined}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">Showing 1-8 of 2,847 students</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CoursesManagementView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
          <p className="text-gray-500 text-sm">Create and manage all course content</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <BookOpen className="w-4 h-4 mr-2" />
          Create New Course
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSE_PERFORMANCE.map((course) => (
          <Card key={course.name} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <Badge className="bg-green-100 text-green-700 border-0">{course.revenue}</Badge>
              </div>
              <CardDescription>Active course with {course.students} enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">{course.completion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${course.completion}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rating</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    {course.rating}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
        <p className="text-gray-500 text-sm">Platform performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ADMIN_STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700 border-0">
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Monthly revenue breakdown</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Revenue chart placeholder</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Growth</CardTitle>
            <CardDescription>New registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <Activity className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Growth chart placeholder</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Completion</CardTitle>
            <CardDescription>Completion rates by course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <Target className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Completion chart placeholder</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SettingsView() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    maintenanceMode: false,
    twoFactorAuth: true,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-500 text-sm">Configure platform settings and preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Platform configuration options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-500">Send system emails to admins</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailNotifications ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Auto Backup</p>
                <p className="text-xs text-gray-500">Daily automated database backup</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoBackup: !settings.autoBackup })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoBackup ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoBackup ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="font-medium text-sm text-gray-900">Maintenance Mode</p>
                <p className="text-xs text-gray-500">Disable student access temporarily</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenanceMode ? "bg-red-600" : "bg-gray-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenanceMode ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm text-gray-900">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500">Require 2FA for admin accounts</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.twoFactorAuth ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.twoFactorAuth ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Database Size</p>
                  <p className="text-xs text-gray-500">Total storage used</p>
                </div>
              </div>
              <p className="font-semibold text-sm text-gray-900">2.4 GB</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Server Uptime</p>
                  <p className="text-xs text-gray-500">Last restart time</p>
                </div>
              </div>
              <p className="font-semibold text-sm text-gray-900">99.9%</p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Last Backup</p>
                  <p className="text-xs text-gray-500">Most recent backup</p>
                </div>
              </div>
              <p className="font-semibold text-sm text-gray-900">2 hours ago</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions - use with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-transparent"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Cache
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-transparent"
          >
            <Database className="w-4 h-4 mr-2" />
            Reset Database Connections
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  const [currentView, setCurrentView] = useState("overview")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const renderContent = () => {
    switch (currentView) {
      case "users":
        return <UsersManagementView />
      case "courses":
        return <CoursesManagementView />
      case "analytics":
        return <AnalyticsView />
      case "settings":
        return <SettingsView />
      case "overview":
      default:
        return <OverviewView />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
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
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "overview" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("overview")
                setShowMobileMenu(false)
              }}
            >
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "users" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("users")
                setShowMobileMenu(false)
              }}
            >
              <Users className="w-5 h-5" />
              User Management
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "courses" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("courses")
                setShowMobileMenu(false)
              }}
            >
              <BookOpen className="w-5 h-5" />
              Course Management
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "analytics"
                  ? "text-blue-600 bg-blue-50 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("analytics")
                setShowMobileMenu(false)
              }}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "settings" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("settings")
                setShowMobileMenu(false)
              }}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Button>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
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
                AD
              </div>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-900">Admin User</p>
                      <p className="text-xs text-gray-500">admin@learntech.com</p>
                    </div>
                    <Link href="/dashboard">
                      <button className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                        <User className="w-4 h-4" />
                        View as Student
                      </button>
                    </Link>
                    <Link href="/login">
                      <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 border-t border-gray-100 mt-1 pt-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  )
}
