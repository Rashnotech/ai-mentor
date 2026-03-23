"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import {
  courseAdminApi,
  getApiErrorMessage,
  validateCourseForm,
  validateModuleForm,
  generateSlug,
  sanitizeString,
  bootcampAdminApi,
  userAdminApi,
  communityApi,
  type CourseListResponse,
  type CourseCreatePayload,
  type CourseUpdatePayload,
  type DifficultyLevel,
  type LearningPathResponse,
  type LearningPathCreatePayload,
  type ModuleCreatePayload,
  type ModuleUpdatePayload,
  type ModuleResponse,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type ProjectResponse,
  type LessonCreatePayload,
  type LessonUpdatePayload,
  type LessonResponse,
  type AssessmentQuestionCreatePayload,
  type AssessmentQuestionUpdatePayload,
  type AssessmentQuestionResponse,
  type BootcampListResponse,
  type BootcampCreatePayload,
  type BootcampUpdatePayload,
  type EnrollmentResponse,
  type EnrollmentCreatePayload,
  type UserAdminResponse,
  type UserCreatePayload,
  type UserUpdatePayload,
  type UserListResponse,
  type UserRole,
  type MentorProfileResponse,
  type MentorProfileUpdate,
  type CommunityChannel,
  type CreateChannelPayload,
  transactionAdminApi,
  type AdminTransactionItem,
  type AdminTransactionListResponse,
  type AdminTransactionDetailResponse,
  type AdminTransactionStats,
} from "@/lib/api"
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
  ChevronRight,
  ChevronDown,
  Plus,
  FolderTree,
  FileQuestion,
  ClipboardList,
  Folder,
  Link2,
  X,
  Save,
  FileText,
  Code,
  Receipt,
  CreditCard,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Printer,
  Mail,
  Ban,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Calendar,
  GraduationCap,
  Loader2,
  MapPin,
  Sparkles,
  UserCog,
  Star,
  Briefcase,
  MessageSquare,
  Video,
  Globe,
  Linkedin,
  Github,
  MessagesSquare,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Pin,
  Lock,
  Unlock,
  TrendingDown,
  Hash,
  AtSign,
  Image,
  Smile,
  MoreVertical,
  ArrowLeft
} from "lucide-react"

// Mock data that will be replaced by API calls in future iterations
const ADMIN_STATS = [
  { label: "Total Students", value: "2,847", change: "+12.5%", trend: "up", icon: Users },
  { label: "Active Courses", value: "128", change: "+8", trend: "up", icon: BookOpen },
  { label: "Revenue (MTD)", value: "$84,290", change: "+23.1%", trend: "up", icon: DollarSign },
  { label: "Completion Rate", value: "73.2%", change: "+5.4%", trend: "up", icon: TrendingUp },
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

export function UsersManagementView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 20
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showViewUserModal, setShowViewUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAdminResponse | null>(null)
  
  // Form state
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student" as UserRole,
    is_active: true,
    is_verified: false,
    bio: "",
  })

  // ============================================================================
  // API QUERIES & MUTATIONS
  // ============================================================================

  // Fetch users from backend
  const { 
    data: usersData,
    isLoading: isLoadingUsers, 
    isError: isUsersError,
    error: usersError,
    refetch: refetchUsers 
  } = useQuery({
    queryKey: ["admin", "users", searchQuery, roleFilter, statusFilter, page],
    queryFn: () => userAdminApi.listUsers({
      search: searchQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      is_active: statusFilter === "all" ? undefined : statusFilter === "active",
      limit,
      offset: page * limit,
    }),
    staleTime: 30000,
  })

  const users = usersData?.users || []
  const totalUsers = usersData?.total || 0
  const totalPages = Math.ceil(totalUsers / limit)

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (data: UserCreatePayload) => userAdminApi.createUser(data),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("User created successfully!", {
        description: `${newUser.full_name} has been created.`,
      })
      setShowAddUserModal(false)
      resetUserForm()
    },
    onError: (error) => {
      toast.error("Failed to create user", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdatePayload }) => 
      userAdminApi.updateUser(userId, data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("User updated successfully!", {
        description: `${updatedUser.full_name} has been updated.`,
      })
      setShowEditUserModal(false)
      setSelectedUser(null)
    },
    onError: (error) => {
      toast.error("Failed to update user", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userAdminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("User deleted successfully!")
      setShowDeleteConfirm(false)
      setSelectedUser(null)
    },
    onError: (error) => {
      toast.error("Failed to delete user", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => userAdminApi.toggleStatus(userId),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success(`User ${updatedUser.is_active ? 'activated' : 'suspended'} successfully!`)
    },
    onError: (error) => {
      toast.error("Failed to toggle user status", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => userAdminApi.resetPassword(userId),
    onSuccess: (result) => {
      toast.success("Password reset email sent!", {
        description: `Email sent to ${result.email}`,
      })
    },
    onError: (error) => {
      toast.error("Failed to send password reset", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetUserForm = () => {
    setUserForm({
      email: "",
      password: "",
      full_name: "",
      role: "student",
      is_active: true,
      is_verified: false,
      bio: "",
    })
  }

  const handleAddUser = () => {
    resetUserForm()
    setShowAddUserModal(true)
  }

  const handleViewUser = (user: UserAdminResponse) => {
    setSelectedUser(user)
    setShowViewUserModal(true)
  }

  const handleEditUser = (user: UserAdminResponse) => {
    setSelectedUser(user)
    setUserForm({
      email: user.email,
      password: "",
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      bio: user.bio || "",
    })
    setShowEditUserModal(true)
  }

  const handleDeleteUser = (user: UserAdminResponse) => {
    setSelectedUser(user)
    setShowDeleteConfirm(true)
  }

  const handleSaveNewUser = () => {
    if (!userForm.email || !userForm.password || !userForm.full_name) {
      toast.error("Please fill in all required fields")
      return
    }
    createUserMutation.mutate({
      email: userForm.email,
      password: userForm.password,
      full_name: userForm.full_name,
      role: userForm.role,
      is_active: userForm.is_active,
      is_verified: userForm.is_verified,
      bio: userForm.bio || undefined,
    })
  }

  const handleUpdateUser = () => {
    if (!selectedUser) return
    if (!userForm.email || !userForm.full_name) {
      toast.error("Please fill in all required fields")
      return
    }
    updateUserMutation.mutate({
      userId: selectedUser.id,
      data: {
        email: userForm.email,
        full_name: userForm.full_name,
        role: userForm.role,
        is_active: userForm.is_active,
        is_verified: userForm.is_verified,
        bio: userForm.bio || undefined,
      },
    })
  }

  const handleConfirmDelete = () => {
    if (!selectedUser) return
    deleteUserMutation.mutate(selectedUser.id)
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
      : <Badge className="bg-red-100 text-red-700 border-0">Inactive</Badge>
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-700 border-0">Admin</Badge>
      case "mentor":
        return <Badge className="bg-blue-100 text-blue-700 border-0">Mentor</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-0">Student</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`
    return formatDate(dateString)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 text-sm">Manage all registered users and their accounts</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddUser}>
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                  setPage(0)
                }}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as "all" | UserRole)
                  setPage(0)
                }}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500">Loading users...</span>
            </div>
          ) : isUsersError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-medium">Failed to load users</p>
              <p className="text-gray-500 text-sm mt-1">{getApiErrorMessage(usersError)}</p>
              <Button variant="outline" onClick={() => refetchUsers()} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.full_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-sm text-gray-900">{user.full_name}</span>
                              {user.is_verified && (
                                <CheckCircle className="inline-block w-3 h-3 text-blue-500 ml-1" />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                        <td className="py-3 px-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(user.is_active)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatRelativeTime(user.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewUser(user)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditUser(user)}
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user)}
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No users found matching your criteria</p>
                </div>
              )}

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {users.length} of {totalUsers} users
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm text-gray-600">
                    Page {page + 1} of {Math.max(1, totalPages)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add New User Modal */}
      {showAddUserModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddUserModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                  <p className="text-sm text-gray-500">Create a new user account</p>
                </div>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter password (min 8 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={userForm.is_active ? "active" : "inactive"}
                      onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === "active" })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.is_verified}
                        onChange={(e) => setUserForm({ ...userForm, is_verified: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Mark as verified</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio (Optional)</label>
                    <textarea
                      value={userForm.bio}
                      onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      placeholder="Add a bio for this user..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleSaveNewUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View User Modal */}
      {showViewUserModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowViewUserModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                <button
                  onClick={() => setShowViewUserModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* User Header */}
                <div className="flex items-center gap-4 mb-6">
                  {selectedUser.avatar_url ? (
                    <img 
                      src={selectedUser.avatar_url} 
                      alt={selectedUser.full_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl">
                      {selectedUser.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedUser.full_name}
                      {selectedUser.is_verified && (
                        <CheckCircle className="inline-block w-4 h-4 text-blue-500 ml-2" />
                      )}
                    </h3>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(selectedUser.is_active)}
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {selectedUser.bio && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Bio</h4>
                    <p className="text-gray-600 text-sm">{selectedUser.bio}</p>
                  </div>
                )}

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Email Verified</span>
                    <span className="text-gray-900">{selectedUser.is_verified ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Joined</span>
                    <span className="text-gray-900">{formatDate(selectedUser.created_at)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="text-gray-900">{formatDate(selectedUser.updated_at)}</span>
                  </div>
                  {selectedUser.last_login && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Last Login</span>
                      <span className="text-gray-900">{formatDate(selectedUser.last_login)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">User ID</span>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedUser.id.slice(0, 8)}...</code>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    setShowViewUserModal(false)
                    handleDeleteUser(selectedUser)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowViewUserModal(false)}>
                    Close
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setShowViewUserModal(false)
                      handleEditUser(selectedUser)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit User
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditUserModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                  <p className="text-sm text-gray-500">Update user information</p>
                </div>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={userForm.is_active ? "active" : "inactive"}
                      onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === "active" })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userForm.is_verified}
                        onChange={(e) => setUserForm({ ...userForm, is_verified: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Email Verified</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={userForm.bio}
                      onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      placeholder="User bio..."
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetPasswordMutation.mutate(selectedUser.id)}
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Reset Password
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={selectedUser.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
                      onClick={() => toggleStatusMutation.mutate(selectedUser.id)}
                      disabled={toggleStatusMutation.isPending}
                    >
                      {toggleStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : selectedUser.is_active ? (
                        <Ban className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      {selectedUser.is_active ? "Suspend" : "Activate"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User?</h3>
                <p className="text-gray-500 mb-2">
                  Are you sure you want to delete <span className="font-medium text-gray-900">{selectedUser.full_name}</span>?
                </p>
                <p className="text-sm text-red-600 mb-6">
                  This action cannot be undone. All user data will be permanently removed.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700" 
                    onClick={handleConfirmDelete}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function CoursesManagementView() {
  const queryClient = useQueryClient()
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseListResponse | null>(null)
  
  // Modal states
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [showAddModuleModal, setShowAddModuleModal] = useState(false)
  const [showEditPathModal, setShowEditPathModal] = useState(false)
  const [showDeletePathConfirm, setShowDeletePathConfirm] = useState(false)
  const [pathToDelete, setPathToDelete] = useState<LearningPathResponse | null>(null)
  const [editingPath, setEditingPath] = useState<LearningPathResponse | null>(null)
  const [selectedPathForModule, setSelectedPathForModule] = useState<number | null>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingCourse, setEditingCourse] = useState<CourseListResponse | null>(null)
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null)
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Form states - updated to match backend schema
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
    estimated_hours: 10,
    difficulty_level: "BEGINNER" as DifficultyLevel,
    is_active: false,
    cover_image_url: "",
    prerequisites: "",
    what_youll_learn: "",
    certificate_on_completion: false,
  })

  const [moduleForm, setModuleForm] = useState({
    title: "",
    slug: "",
    description: "",
    order: 1,
    unlock_after_days: 0,
    is_available_by_default: true,
    first_deadline_days: null as number | null,
    second_deadline_days: null as number | null,
    third_deadline_days: null as number | null,
  })

  const [quizForm, setQuizForm] = useState({
    name: "",
    slug: "",
    passingScore: 75,
    questionsList: [] as { id: string; question: string; options: string[]; correctAnswer: number }[],
  })

  const [taskForm, setTaskForm] = useState({
    name: "",
    slug: "",
    type: "exercise",
    instructions: "",
    starterCode: "",
    expectedOutput: "",
  })

  // ============================================================================
  // API QUERIES & MUTATIONS
  // ============================================================================

  // Fetch courses from backend
  const { 
    data: courses = [], 
    isLoading: isLoadingCourses, 
    isError: isCoursesError,
    error: coursesError,
    refetch: refetchCourses 
  } = useQuery({
    queryKey: ["admin", "courses", statusFilter, searchQuery],
    queryFn: () => courseAdminApi.listCourses({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    staleTime: 30000, // 30 seconds
  })

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CourseCreatePayload) => courseAdminApi.createCourse(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course created successfully!", {
        description: `"${newCourse.title}" has been created.`,
      })
      setShowCreateCourseModal(false)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to create course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CourseUpdatePayload }) => 
      courseAdminApi.updateCourse(courseId, data),
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course updated successfully!", {
        description: `"${updatedCourse.title}" has been updated.`,
      })
      setShowEditCourseModal(false)
      setEditingCourse(null)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to update course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: number) => courseAdminApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course deleted successfully!")
      setShowDeleteConfirm(false)
      setCourseToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Fetch learning paths for selected course
  const {
    data: learningPaths = [],
    isLoading: isLoadingPaths,
  } = useQuery({
    queryKey: ["admin", "learningPaths", selectedCourse],
    queryFn: () => selectedCourse ? courseAdminApi.listLearningPaths(selectedCourse) : Promise.resolve([]),
    enabled: !!selectedCourse,
    staleTime: 30000,
  })

  // Create learning path mutation
  const createLearningPathMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: LearningPathCreatePayload }) =>
      courseAdminApi.createLearningPath(courseId, data),
    onSuccess: (newPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Learning path created!", {
        description: `"${newPath.title}" has been created.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to create learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update learning path mutation
  const updateLearningPathMutation = useMutation({
    mutationFn: ({ pathId, data }: { pathId: number; data: { title?: string; description?: string; is_default?: boolean; price: number } }) =>
      courseAdminApi.updateLearningPath(pathId, data),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Learning path updated!", {
        description: `"${updatedPath.title}" has been updated.`,
      })
      setShowEditPathModal(false)
    },
    onError: (error) => {
      toast.error("Failed to update learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete learning path mutation
  const deleteLearningPathMutation = useMutation({
    mutationFn: (pathId: number) => courseAdminApi.deleteLearningPath(pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Learning path deleted!", {
        description: "The learning path and all its content have been removed.",
      })
      if (selectedPathId === pathToDelete?.path_id) {
        setSelectedPathId(null)
        setSelectedModuleId(null)
      }
      setShowDeletePathConfirm(false)
      setPathToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Set default path mutation
  const setDefaultPathMutation = useMutation({
    mutationFn: ({ courseId, pathId }: { courseId: number; pathId: number }) =>
      courseAdminApi.setDefaultPath(courseId, pathId),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Default path set!", {
        description: `"${updatedPath.title}" is now the default path.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to set default path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Unset default path mutation
  const unsetDefaultPathMutation = useMutation({
    mutationFn: ({ courseId, pathId }: { courseId: number; pathId: number }) =>
      courseAdminApi.unsetDefaultPath(courseId, pathId),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Default path unset!", {
        description: `"${updatedPath.title}" is no longer the default path.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to unset default path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: ({ pathId, data }: { pathId: number; data: ModuleCreatePayload }) =>
      courseAdminApi.createModule(pathId, data),
    onSuccess: (newModule) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Module created!", {
        description: `"${newModule.title}" has been added to the course.`,
      })
      setShowAddModuleModal(false)
      setModuleForm({ title: "", slug: "", description: "", order: 1 })
      setSelectedPathForModule(null)
    },
    onError: (error) => {
      toast.error("Failed to create module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: ModuleUpdatePayload }) =>
      courseAdminApi.updateModule(moduleId, data),
    onSuccess: (updatedModule) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules", selectedPathId] })
      toast.success("Module updated!", {
        description: `"${updatedModule.title}" has been updated.`,
      })
      setShowEditModuleModal(false)
      setEditingModule(null)
      setModuleForm({ title: "", slug: "", description: "", order: 1 })
    },
    onError: (error) => {
      toast.error("Failed to update module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: number) => courseAdminApi.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules", selectedPathId] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Module deleted!")
      setShowDeleteModuleConfirm(false)
      setModuleToDelete(null)
      if (selectedModuleId === moduleToDelete?.module_id) {
        setSelectedModuleId(null)
      }
    },
    onError: (error) => {
      toast.error("Failed to delete module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // State for edit/delete module modals
  const [showEditModuleModal, setShowEditModuleModal] = useState(false)
  const [showDeleteModuleConfirm, setShowDeleteModuleConfirm] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleResponse | null>(null)
  const [moduleToDelete, setModuleToDelete] = useState<ModuleResponse | null>(null)

  // State for selected path and module for content management
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [showAddPathModal, setShowAddPathModal] = useState(false)
  const [pathForm, setPathForm] = useState({
    title: "",
    description: "",
    price: 0,
    is_default: false,
  })

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content: "",
    order: 1,
    content_type: "" as string,
    estimated_minutes: 15,
    youtube_video_url: "",
    external_resources: [] as string[],
    expected_outcomes: [] as string[],
  })
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [showEditLessonModal, setShowEditLessonModal] = useState(false)
  const [showDeleteLessonConfirm, setShowDeleteLessonConfirm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null)
  const [lessonToDelete, setLessonToDelete] = useState<LessonResponse | null>(null)
  const [newResource, setNewResource] = useState("")
  const [newOutcome, setNewOutcome] = useState("")

  // Project/Exercise form state
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    order: 1,
    estimated_hours: 2,
    starter_repo_url: "",
    solution_repo_url: "",
    required_skills: [] as string[],
  })
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)

  // Assessment question form state
  const [assessmentForm, setAssessmentForm] = useState<{
    question_text: string
    question_type: "multiple_choice" | "debugging" | "coding" | "short_answer"
    difficulty_level: DifficultyLevel
    order: number
    options: string[]
    correct_answer: string
    explanation: string
    points: number
  }>({
    question_text: "",
    question_type: "multiple_choice",
    difficulty_level: "BEGINNER",
    order: 1,
    options: ["", "", "", ""],
    correct_answer: "0",
    explanation: "",
    points: 10,
  })
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false)

  // Fetch modules for selected path
  const {
    data: modules = [],
    isLoading: isLoadingModules,
  } = useQuery({
    queryKey: ["admin", "modules", selectedPathId],
    queryFn: () => selectedPathId ? courseAdminApi.listModules(selectedPathId) : Promise.resolve([]),
    enabled: !!selectedPathId,
    staleTime: 30000,
  })

  // Fetch projects for selected module
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
  } = useQuery({
    queryKey: ["admin", "projects", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listProjects(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch lessons for selected module
  const {
    data: lessons = [],
    isLoading: isLoadingLessons,
  } = useQuery({
    queryKey: ["admin", "lessons", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listLessons(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch assessments for selected module
  const {
    data: assessments = [],
    isLoading: isLoadingAssessments,
  } = useQuery({
    queryKey: ["admin", "assessments", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listAssessments(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: LessonCreatePayload }) =>
      courseAdminApi.createLesson(moduleId, data),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson created!", {
        description: `"${newLesson.title}" has been added.`,
      })
      setShowAddLessonModal(false)
      setLessonForm({
        title: "",
        description: "",
        content: "",
        order: 1,
        content_type: "",
        estimated_minutes: 15,
        youtube_video_url: "",
        external_resources: [],
        expected_outcomes: [],
      })
    },
    onError: (error) => {
      toast.error("Failed to create lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: number; data: LessonUpdatePayload }) =>
      courseAdminApi.updateLesson(lessonId, data),
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson updated!", {
        description: `"${updatedLesson.title}" has been updated.`,
      })
      setShowEditLessonModal(false)
      setEditingLesson(null)
    },
    onError: (error) => {
      toast.error("Failed to update lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => courseAdminApi.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson deleted!")
      setShowDeleteLessonConfirm(false)
      setLessonToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: ProjectCreatePayload }) =>
      courseAdminApi.createProject(moduleId, data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project/Exercise created!", {
        description: `"${newProject.title}" has been added.`,
      })
      setShowAddProjectModal(false)
      setProjectForm({
        title: "",
        description: "",
        order: 1,
        estimated_hours: 2,
        starter_repo_url: "",
        solution_repo_url: "",
        required_skills: [],
      })
    },
    onError: (error) => {
      toast.error("Failed to create project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ProjectUpdatePayload }) =>
      courseAdminApi.updateProject(projectId, data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project updated!", {
        description: `"${updatedProject.title}" has been updated.`,
      })
      setShowEditProjectModal(false)
      setEditingProject(null)
    },
    onError: (error) => {
      toast.error("Failed to update project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => courseAdminApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project deleted!", {
        description: "Project has been removed.",
      })
      setShowDeleteProjectConfirm(false)
      setProjectToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: AssessmentQuestionCreatePayload }) =>
      courseAdminApi.createAssessmentQuestion(moduleId, data),
    onSuccess: (newQuestion) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Quiz question created!", {
        description: "Question has been added to the quiz.",
      })
      setShowAddAssessmentModal(false)
      setAssessmentForm({
        question_text: "",
        question_type: "multiple_choice",
        difficulty_level: "BEGINNER",
        order: 1,
        options: ["", "", "", ""],
        correct_answer: "0",
        explanation: "",
        points: 10,
      })
    },
    onError: (error) => {
      toast.error("Failed to create question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update assessment mutation
  const updateAssessmentMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: AssessmentQuestionUpdatePayload }) =>
      courseAdminApi.updateAssessmentQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Question updated!", {
        description: "Assessment question has been updated.",
      })
      setShowEditAssessmentModal(false)
      setEditingAssessment(null)
    },
    onError: (error) => {
      toast.error("Failed to update question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: (questionId: number) => courseAdminApi.deleteAssessmentQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Question deleted!", {
        description: "Assessment question has been removed.",
      })
      setShowDeleteAssessmentConfirm(false)
      setAssessmentToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // State for edit/delete assessment modals
  const [showEditAssessmentModal, setShowEditAssessmentModal] = useState(false)
  const [showDeleteAssessmentConfirm, setShowDeleteAssessmentConfirm] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<AssessmentQuestionResponse | null>(null)
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentQuestionResponse | null>(null)

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      slug: "",
      description: "",
      estimated_hours: 10,
      difficulty_level: "BEGINNER",
      is_active: false,
      cover_image_url: "",
      prerequisites: "",
      what_youll_learn: "",
      certificate_on_completion: false,
    })
    setFormErrors({})
  }

  // Auto-generate slug from title - don't sanitize while typing to allow spaces
  const handleTitleChange = (title: string) => {
    setCourseForm(prev => ({
      ...prev,
      title: title,
      slug: generateSlug(title),
    }))
  }

  // Handle module title change with slug generation
  const handleModuleTitleChange = (title: string) => {
    setModuleForm(prev => ({
      ...prev,
      title: title,
      slug: generateSlug(title),
    }))
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateCourse = () => {
    // Validate form - only pass fields that are validated
    const errors = validateCourseForm({
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
    })
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Please fix the errors in the form")
      return
    }

    // Parse comma-separated values into arrays
    const prerequisitesArray = courseForm.prerequisites
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const whatYoullLearnArray = courseForm.what_youll_learn
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Clean and submit
    const payload: CourseCreatePayload = {
      title: sanitizeString(courseForm.title),
      description: sanitizeString(courseForm.description),
      slug: courseForm.slug.toLowerCase().trim(),
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      cover_image_url: courseForm.cover_image_url || undefined,
      prerequisites: prerequisitesArray.length > 0 ? prerequisitesArray : undefined,
      what_youll_learn: whatYoullLearnArray.length > 0 ? whatYoullLearnArray : undefined,
      certificate_on_completion: courseForm.certificate_on_completion,
    }

    createCourseMutation.mutate(payload)
  }

  const handleEditCourse = (course: CourseListResponse) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description || "",
      estimated_hours: course.estimated_hours,
      difficulty_level: course.difficulty_level as DifficultyLevel,
      is_active: course.is_active,
      cover_image_url: "",
      prerequisites: course.prerequisites?.join(", ") || "",
      what_youll_learn: course.what_youll_learn?.join(", ") || "",
      certificate_on_completion: course.certificate_on_completion || false,
    })
    setFormErrors({})
    setShowEditCourseModal(true)
  }

  const handleUpdateCourse = () => {
    if (!editingCourse) return

    // Validate form
    // Validate form - only pass fields that are validated
    const errors = validateCourseForm({
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
    })
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Please fix the errors in the form")
      return
    }

    // Parse comma-separated values into arrays
    const prerequisitesArray = courseForm.prerequisites
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const whatYoullLearnArray = courseForm.what_youll_learn
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Clean and submit
    const payload: CourseUpdatePayload = {
      title: sanitizeString(courseForm.title),
      description: sanitizeString(courseForm.description),
      slug: courseForm.slug.toLowerCase().trim(),
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      is_active: courseForm.is_active,
      prerequisites: prerequisitesArray.length > 0 ? prerequisitesArray : undefined,
      what_youll_learn: whatYoullLearnArray.length > 0 ? whatYoullLearnArray : undefined,
      certificate_on_completion: courseForm.certificate_on_completion,
    }

    updateCourseMutation.mutate({ courseId: editingCourse.course_id, data: payload })
  }

  const handleDeleteCourse = (course: CourseListResponse) => {
    setCourseToDelete(course)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDeleteCourse = () => {
    if (courseToDelete) {
      deleteCourseMutation.mutate(courseToDelete.course_id)
    }
  }

  const handleAddModule = async () => {
    // Validate module form
    const errors = validateModuleForm(moduleForm)
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedCourse) {
      toast.error("Please select a course first")
      return
    }

    try {
      let pathId: number

      // Check if a specific path is selected
      if (selectedPathForModule) {
        pathId = selectedPathForModule
      } else if (learningPaths.length === 0) {
        // Auto-create a default learning path for this course
        toast.info("Creating default learning path...")
        const selectedCourseData = courses.find(c => c.course_id === selectedCourse)
        const defaultPath = await courseAdminApi.createLearningPath(selectedCourse, {
          course_id: selectedCourse,
          title: `${selectedCourseData?.title || 'Course'} - Main Path`,
          description: `Default learning path for ${selectedCourseData?.title || 'this course'}`,
          is_default: true,
        })
        pathId = defaultPath.path_id
        // Invalidate to refresh learning paths
        queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      } else {
        // Use the first (or default) learning path
        const defaultPath = learningPaths.find(p => p.is_default) || learningPaths[0]
        pathId = defaultPath.path_id
      }

      // Create the module
      const moduleData: ModuleCreatePayload = {
        path_id: pathId,
        title: sanitizeString(moduleForm.title),
        description: sanitizeString(moduleForm.description),
        order: moduleForm.order,
        unlock_after_days: moduleForm.unlock_after_days,
        is_available_by_default: moduleForm.is_available_by_default,
        first_deadline_days: moduleForm.first_deadline_days || undefined,
        second_deadline_days: moduleForm.second_deadline_days || undefined,
        third_deadline_days: moduleForm.third_deadline_days || undefined,
      }

      createModuleMutation.mutate({ pathId, data: moduleData })
    } catch (error) {
      toast.error("Failed to create module", {
        description: getApiErrorMessage(error),
      })
    }
  }

  const handleAddQuiz = (moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingQuiz(null)
    setQuizForm({ name: "", slug: "", passingScore: 75, questionsList: [] })
    setShowQuizModal(true)
  }

  const handleEditQuiz = (quiz: any, moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingQuiz(quiz)
    setQuizForm({
      name: quiz.name,
      slug: quiz.slug,
      passingScore: quiz.passingScore,
      questionsList: quiz.questionsList || [],
    })
    setShowQuizModal(true)
  }

  const handleSaveQuiz = () => {
    console.log(editingQuiz ? "Updating quiz:" : "Creating quiz:", quizForm, "in module:", currentModuleId)
    setShowQuizModal(false)
    setEditingQuiz(null)
    setCurrentModuleId(null)
  }

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      console.log("Deleting quiz:", quizId)
    }
  }

  // Quiz question management helpers
  const addQuestion = () => {
    const newQuestion = {
      id: `q-${Date.now()}`,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
    }
    setQuizForm({
      ...quizForm,
      questionsList: [...quizForm.questionsList, newQuestion],
    })
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizForm.questionsList]
    updated[index] = { ...updated[index], [field]: value }
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizForm.questionsList]
    const options = [...updated[questionIndex].options]
    options[optionIndex] = value
    updated[questionIndex] = { ...updated[questionIndex], options }
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const removeQuestion = (index: number) => {
    const updated = quizForm.questionsList.filter((_, i) => i !== index)
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const handleAddTask = (moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingTask(null)
    setTaskForm({ name: "", slug: "", type: "exercise", instructions: "", starterCode: "", expectedOutput: "" })
    setShowTaskModal(true)
  }

  const handleEditTask = (task: any, moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingTask(task)
    setTaskForm({
      name: task.name,
      slug: task.slug,
      type: task.type,
      instructions: task.instructions || "",
      starterCode: task.starterCode || "",
      expectedOutput: task.expectedOutput || "",
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = () => {
    console.log(editingTask ? "Updating task:" : "Creating task:", taskForm, "in module:", currentModuleId)
    setShowTaskModal(false)
    setEditingTask(null)
    setCurrentModuleId(null)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      console.log("Deleting task:", taskId)
    }
  }

  // Find selected course from API data
  const selectedCourseData = courses.find(c => c.course_id === selectedCourse)

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    toast.success("Path copied to clipboard!")
  }

  // Render modals helper - these need to be always available
  const renderModals = () => (
    <>
      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateCourseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
                <button
                  onClick={() => setShowCreateCourseModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.title ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="e.g., Advanced React & State Management"
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Slug</label>
                  <input
                    type="text"
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.slug ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="e.g., react-advanced"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used in URL: /courses/{courseForm.slug || "slug"}</p>
                  {formErrors.slug && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                      formErrors.description ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Course description..."
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours *</label>
                    <input
                      type="number"
                      value={courseForm.estimated_hours}
                      onChange={(e) => setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.estimated_hours ? "border-red-500" : "border-gray-200"
                      }`}
                      min="1"
                      placeholder="10"
                    />
                    {formErrors.estimated_hours && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.estimated_hours}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={courseForm.difficulty_level}
                      onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL (optional)</label>
                  <input
                    type="url"
                    value={courseForm.cover_image_url}
                    onChange={(e) => setCourseForm({ ...courseForm, cover_image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites (optional)</label>
                  <textarea
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Basic JavaScript, HTML/CSS fundamentals (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of prerequisites</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What You&apos;ll Learn (optional)</label>
                  <textarea
                    value={courseForm.what_youll_learn}
                    onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Build React apps, State management with Redux, Testing (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of learning outcomes</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="certificate_on_completion_create"
                    checked={courseForm.certificate_on_completion}
                    onChange={(e) => setCourseForm({ ...courseForm, certificate_on_completion: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="certificate_on_completion_create" className="text-sm font-medium text-gray-700">
                    Certificate on Completion
                  </label>
                </div>
              </div>
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateCourseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleCreateCourse}
                  disabled={createCourseMutation.isPending}
                >
                  {createCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Course
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditCourseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
                <button
                  onClick={() => setShowEditCourseModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.title ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Slug</label>
                  <input
                    type="text"
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.slug ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Used in URL: /courses/{courseForm.slug || "slug"}</p>
                  {formErrors.slug && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                      formErrors.description ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours *</label>
                    <input
                      type="number"
                      value={courseForm.estimated_hours}
                      onChange={(e) => setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.estimated_hours ? "border-red-500" : "border-gray-200"
                      }`}
                      min="1"
                    />
                    {formErrors.estimated_hours && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.estimated_hours}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={courseForm.difficulty_level}
                      onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isActiveEdit"
                    checked={courseForm.is_active}
                    onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveEdit" className="text-sm text-gray-700">
                    <span className="font-medium">Course is Active</span>
                    <span className="block text-xs text-gray-500">Active courses are visible to students</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites (optional)</label>
                  <textarea
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Basic JavaScript, HTML/CSS fundamentals (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of prerequisites</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What You&apos;ll Learn (optional)</label>
                  <textarea
                    value={courseForm.what_youll_learn}
                    onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Build React apps, State management with Redux, Testing (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of learning outcomes</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="certificate_on_completion_edit"
                    checked={courseForm.certificate_on_completion}
                    onChange={(e) => setCourseForm({ ...courseForm, certificate_on_completion: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="certificate_on_completion_edit" className="text-sm font-medium text-gray-700">
                    Certificate on Completion
                  </label>
                </div>
              </div>
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditCourseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleUpdateCourse}
                  disabled={updateCourseMutation.isPending}
                >
                  {updateCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Course
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Module Modal */}
      {showAddModuleModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add New Module</h2>
                <button
                  onClick={() => setShowAddModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Learning Path Selector */}
                {learningPaths.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Learning Path *</label>
                    <select
                      value={selectedPathForModule || ""}
                      onChange={(e) => setSelectedPathForModule(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select a learning path</option>
                      {learningPaths.map((path) => (
                        <option key={path.path_id} value={path.path_id}>
                          {path.title} {path.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which learning path this module belongs to. Modules are path-specific.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => handleModuleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Slug</label>
                  <input
                    type="text"
                    value={moduleForm.slug}
                    onChange={(e) => setModuleForm({ ...moduleForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., react-fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={moduleForm.order}
                    onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddModuleModal(false)} disabled={createModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleAddModule}
                  disabled={createModuleMutation.isPending || isLoadingPaths}
                >
                  {createModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Module
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Module Modal */}
      {showEditModuleModal && editingModule && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Module</h2>
                <button
                  onClick={() => setShowEditModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={moduleForm.order}
                      onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={editingModule.estimated_hours || 0}
                      onChange={(e) => setEditingModule({ ...editingModule, estimated_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditModuleModal(false)} disabled={updateModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    updateModuleMutation.mutate({
                      moduleId: editingModule.module_id,
                      data: {
                        title: moduleForm.title,
                        description: moduleForm.description,
                        order: moduleForm.order,
                        estimated_hours: editingModule?.estimated_hours || 0,
                        unlock_after_days: moduleForm.unlock_after_days,
                        is_available_by_default: moduleForm.is_available_by_default,
                        first_deadline_days: moduleForm.first_deadline_days || undefined,
                        second_deadline_days: moduleForm.second_deadline_days || undefined,
                        third_deadline_days: moduleForm.third_deadline_days || undefined,
                      }
                    })
                  }}
                  disabled={updateModuleMutation.isPending}
                >
                  {updateModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Module Confirmation Modal */}
      {showDeleteModuleConfirm && moduleToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModuleConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Module</h2>
                <button
                  onClick={() => setShowDeleteModuleConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this module?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{moduleToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        All lessons, projects, and quiz questions associated with this module will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteModuleConfirm(false)} disabled={deleteModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => {
                    deleteModuleMutation.mutate(moduleToDelete.module_id)
                  }}
                  disabled={deleteModuleMutation.isPending}
                >
                  {deleteModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Module
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Path Modal */}
      {showEditPathModal && editingPath && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditPathModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Learning Path</h2>
                <button
                  onClick={() => setShowEditPathModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault()
                if (editingPath) {
                  updateLearningPathMutation.mutate({
                    pathId: editingPath.path_id,
                    data: { title: pathForm.title, description: pathForm.description, price: pathForm.price || 0 }
                  })
                }
              }}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Path Title</label>
                    <input
                      type="text"
                      value={pathForm.title}
                      onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                      placeholder="Enter path title"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={pathForm.description}
                      onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                      placeholder="Describe this learning path..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pathForm.price}
                      onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to 0 for free courses</p>
                  </div>
                </div>
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowEditPathModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={updateLearningPathMutation.isPending}
                  >
                    {updateLearningPathMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Delete Path Confirmation Modal */}
      {showDeletePathConfirm && pathToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeletePathConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Learning Path</h2>
                <button
                  onClick={() => setShowDeletePathConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this path?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{pathToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        All modules, lessons, projects, and quizzes in this learning path will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeletePathConfirm(false)} disabled={deleteLearningPathMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => {
                    if (pathToDelete) {
                      deleteLearningPathMutation.mutate(pathToDelete.path_id)
                    }
                  }}
                  disabled={deleteLearningPathMutation.isPending}
                >
                  {deleteLearningPathMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Path
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quiz Modal (Add/Edit) */}
      {showQuizModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowQuizModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">{editingQuiz ? "Edit Quiz" : "Add New Quiz"}</h2>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Basic Quiz Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Name</label>
                    <input
                      type="text"
                      value={quizForm.name}
                      onChange={(e) => setQuizForm({ ...quizForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., React Basics Quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Slug</label>
                    <input
                      type="text"
                      value={quizForm.slug}
                      onChange={(e) => setQuizForm({ ...quizForm, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., react-basics-quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm({ ...quizForm, passingScore: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Quiz Questions</h3>
                      <p className="text-sm text-gray-500">{quizForm.questionsList.length} question(s) added</p>
                    </div>
                    <Button onClick={addQuestion} className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {quizForm.questionsList.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No questions added yet</p>
                      <p className="text-sm text-gray-400">Click "Add Question" to create your first quiz question</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizForm.questionsList.map((q, qIndex) => (
                        <div key={q.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Question {qIndex + 1}
                              </label>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your question..."
                              />
                            </div>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-7"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correctAnswer === oIndex}
                                  onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                                    q.correctAnswer === oIndex
                                      ? "border-green-300 bg-green-50 focus:ring-green-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                  }`}
                                  placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="text-green-600">●</span> Select the radio button next to the correct answer
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <p className="text-sm text-gray-500">
                  {quizForm.questionsList.length > 0 && (
                    <>Total: {quizForm.questionsList.length} questions · Passing: {quizForm.passingScore}%</>
                  )}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowQuizModal(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveQuiz}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingQuiz ? "Update Quiz" : "Save Quiz"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Task Modal (Add/Edit) */}
      {showTaskModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowTaskModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingTask ? "Edit Task" : "Add New Task"}</h2>
                  <p className="text-sm text-gray-500">
                    {taskForm.type === "project" ? "Project with submission requirements" : "Coding exercise with instructions"}
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Basic Task Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                    <input
                      type="text"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Component Composition Exercise"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Slug</label>
                    <input
                      type="text"
                      value={taskForm.slug}
                      onChange={(e) => setTaskForm({ ...taskForm, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., component-composition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="exercise">Exercise</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Task Instructions
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Provide detailed instructions for students. Use Markdown for formatting (headers, lists, code blocks, etc.)
                  </p>
                  <textarea
                    value={taskForm.instructions}
                    onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] font-mono text-sm"
                    placeholder={`# Task Overview\nDescribe what students will build...\n\n## Requirements\n- Requirement 1\n- Requirement 2\n\n## Steps\n1. First step...\n2. Second step...\n\n## Hints\n- Helpful tip 1\n- Helpful tip 2`}
                  />
                </div>

                {/* Code Section - for exercises */}
                {taskForm.type === "exercise" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          Starter Code (Optional)
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Code template students will start with
                      </p>
                      <textarea
                        value={taskForm.starterCode}
                        onChange={(e) => setTaskForm({ ...taskForm, starterCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] font-mono text-sm bg-gray-900 text-green-400"
                        placeholder="// Starter code here..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Expected Output (Optional)
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Sample output or solution for validation
                      </p>
                      <textarea
                        value={taskForm.expectedOutput}
                        onChange={(e) => setTaskForm({ ...taskForm, expectedOutput: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] font-mono text-sm bg-gray-900 text-green-400"
                        placeholder="// Expected output or solution..."
                      />
                    </div>
                  </div>
                )}

                {/* Project specific guidance */}
                {taskForm.type === "project" && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Link2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Project Submission</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Projects require students to submit a link (GitHub repo, deployed site, etc.). 
                          Make sure your instructions clearly specify what should be submitted and any required formats.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <p className="text-sm text-gray-500">
                  {taskForm.type === "exercise" ? "Exercise · Code in browser" : "Project · Link submission"}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveTask}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingTask ? "Update Task" : "Save Task"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )

  // Course List View
  if (!selectedCourse) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
              <p className="text-gray-500 text-sm">Manage courses, modules, quizzes, and tasks with canonical paths</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={() => {
                resetCourseForm()
                setShowCreateCourseModal(true)
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Create New Course
            </Button>
          </div>

          {/* Courses Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Loading State */}
              {isLoadingCourses && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Loading courses...</span>
                </div>
              )}

              {/* Error State */}
              {isCoursesError && (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-2">Failed to load courses</div>
                  <p className="text-sm text-gray-500 mb-4">{getApiErrorMessage(coursesError)}</p>
                  <Button variant="outline" onClick={() => refetchCourses()}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingCourses && !isCoursesError && courses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
                  <p className="text-gray-500 text-sm mb-4">Get started by creating your first course</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700" 
                    onClick={() => {
                      resetCourseForm()
                      setShowCreateCourseModal(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </div>
              )}

              {/* Courses Table */}
              {!isLoadingCourses && !isCoursesError && courses.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Course</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Canonical Path</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paths</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Modules</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Level</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.course_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-sm text-gray-900">{course.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{course.description || "No description"}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                                /courses/{course.slug}
                              </code>
                              <button
                                onClick={() => copyPath(`/courses/${course.slug}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy path"
                              >
                                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.paths_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.modules_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.estimated_hours}h</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                course.difficulty_level === "BEGINNER"
                                  ? "bg-green-100 text-green-700 border-0"
                                  : course.difficulty_level === "INTERMEDIATE"
                                  ? "bg-yellow-100 text-yellow-700 border-0"
                                  : "bg-red-100 text-red-700 border-0"
                              }
                            >
                              {course.difficulty_level.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                course.is_active
                                  ? "bg-green-100 text-green-700 border-0"
                                  : "bg-gray-100 text-gray-600 border-0"
                              }
                            >
                              {course.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-transparent"
                                onClick={() => setSelectedCourse(course.course_id)}
                              >
                                <FolderTree className="w-4 h-4 mr-1" />
                                Manage
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditCourse(course)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteCourse(course)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && courseToDelete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Course</CardTitle>
                <CardDescription>
                  Are you sure you want to delete &quot;{courseToDelete.title}&quot;? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  This will also delete all associated learning paths, modules, lessons, and quizzes.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setCourseToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleConfirmDeleteCourse}
                  disabled={deleteCourseMutation.isPending}
                >
                  {deleteCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Course
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {renderModals()}
      </>
    )
  }

  // Course Detail View with Modules, Quizzes, Tasks
  return (
    <>
      <div className="space-y-6">
        {/* Header with Breadcrumb */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setSelectedCourse(null)
                setSelectedPathId(null)
                setSelectedModuleId(null)
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Courses
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{selectedCourseData?.title}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCourseData?.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <code className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-700 font-mono">
                  /courses/{selectedCourseData?.slug}
                </code>
                <Badge
                  className={
                    selectedCourseData?.is_active
                      ? "bg-green-100 text-green-700 border-0"
                      : "bg-gray-100 text-gray-600 border-0"
                  }
                >
                  {selectedCourseData?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedCourseData) handleEditCourse(selectedCourseData)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700" 
                onClick={() => setShowAddPathModal(true)}
              >
                <FolderTree className="w-4 h-4 mr-2" />
                Add Learning Path
              </Button>
            </div>
          </div>
        </div>

        {/* Learning Paths Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Learning Paths List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-purple-600" />
                  Learning Paths
                </CardTitle>
                <CardDescription>
                  {learningPaths.length} path(s) in this course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoadingPaths ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : learningPaths.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FolderTree className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No learning paths yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setShowAddPathModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Path
                    </Button>
                  </div>
                ) : (
                  learningPaths.map((path) => (
                    <div
                      key={path.path_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedPathId === path.path_id
                          ? "border-purple-300 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedPathId(path.path_id)
                          setSelectedModuleId(null)
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 text-sm">{path.title}</span>
                          {path.is_default && (
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{path.description}</p>
                      </button>
                      {/* Path Actions */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                        {path.is_default ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedCourse) {
                                unsetDefaultPathMutation.mutate({ courseId: selectedCourse, pathId: path.path_id })
                              }
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                            title="Unset as default"
                          >
                            Unset Default
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedCourse) {
                                setDefaultPathMutation.mutate({ courseId: selectedCourse, pathId: path.path_id })
                              }
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPath(path)
                            setPathForm({ title: path.title, description: path.description, price: path.price || 0, is_default: path.is_default })
                            setShowEditPathModal(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                          title="Edit path"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPathToDelete(path)
                            setShowDeletePathConfirm(true)
                          }}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                          title="Delete path"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle: Modules List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Folder className="w-5 h-5 text-blue-600" />
                      Modules
                    </CardTitle>
                    <CardDescription>
                      {selectedPathId ? `${modules.length} module(s)` : "Select a learning path"}
                    </CardDescription>
                  </div>
                  {selectedPathId && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setModuleForm({
                          title: "",
                          slug: "",
                          description: "",
                          order: modules.length + 1,
                          unlock_after_days: 0,
                          is_available_by_default: true,
                          first_deadline_days: null,
                          second_deadline_days: null,
                          third_deadline_days: null,
                        })
                        setShowAddModuleModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {!selectedPathId ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Folder className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Select a learning path to view modules</p>
                  </div>
                ) : isLoadingModules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : modules.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Folder className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No modules in this path</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setModuleForm({
                          title: "",
                          slug: "",
                          description: "",
                          order: 1,
                          unlock_after_days: 0,
                          is_available_by_default: true,
                          first_deadline_days: null,
                          second_deadline_days: null,
                          third_deadline_days: null,
                        })
                        setShowAddModuleModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Module
                    </Button>
                  </div>
                ) : (
                  modules.map((module, index) => (
                    <div
                      key={module.module_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedModuleId === module.module_id
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                      }`}
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedModuleId(module.module_id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 text-sm flex-1">{module.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 ml-8">{module.description}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-2 ml-8">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingModule(module)
                            setModuleForm({
                              title: module.title,
                              slug: "",
                              description: module.description,
                              order: module.order,
                              unlock_after_days: module.unlock_after_days ?? 0,
                              is_available_by_default: module.is_available_by_default ?? true,
                              first_deadline_days: module.first_deadline_days ?? null,
                              second_deadline_days: module.second_deadline_days ?? null,
                              third_deadline_days: module.third_deadline_days ?? null,
                            })
                            setShowEditModuleModal(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit module"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setModuleToDelete(module)
                            setShowDeleteModuleConfirm(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Module Content (Lessons, Quizzes & Projects) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Lessons */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Lessons
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${lessons.length} lesson(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowAddLessonModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage lessons</p>
                  </div>
                ) : isLoadingLessons ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No lessons yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddLessonModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Lesson
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lessons.map((lesson, index) => (
                      <div key={lesson.lesson_id} className="p-2 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{lesson.description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {lesson.estimated_minutes && (
                                <span className="text-xs text-gray-400">{lesson.estimated_minutes} min</span>
                              )}
                              {lesson.youtube_video_url && (
                                <Badge className="bg-red-50 text-red-600 border-0 text-xs">Video</Badge>
                              )}
                              {lesson.external_resources && lesson.external_resources.length > 0 && (
                                <Badge className="bg-purple-50 text-purple-600 border-0 text-xs">{lesson.external_resources.length} resource(s)</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingLesson(lesson)
                                setLessonForm({
                                  title: lesson.title,
                                  description: lesson.description,
                                  content: lesson.content || "",
                                  order: lesson.order,
                                  content_type: lesson.content_type || "",
                                  estimated_minutes: lesson.estimated_minutes || 15,
                                  youtube_video_url: lesson.youtube_video_url || "",
                                  external_resources: lesson.external_resources || [],
                                  expected_outcomes: lesson.expected_outcomes || [],
                                })
                                setShowEditLessonModal(true)
                              }}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Edit lesson"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                setLessonToDelete(lesson)
                                setShowDeleteLessonConfirm(true)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quiz Questions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-amber-600" />
                      Quiz Questions
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${assessments.length} question(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => setShowAddAssessmentModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileQuestion className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage quizzes</p>
                  </div>
                ) : isLoadingAssessments ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileQuestion className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No quiz questions yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddAssessmentModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Question
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {assessments.map((q, index) => (
                      <div key={q.question_id} className="p-2 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 line-clamp-2">{q.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{q.question_type}</Badge>
                              <span className="text-xs text-gray-500">{q.points} pts</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingAssessment(q)
                                setAssessmentForm({
                                  question_text: q.question_text,
                                  question_type: q.question_type as "multiple_choice" | "debugging" | "coding" | "short_answer",
                                  difficulty_level: q.difficulty_level as DifficultyLevel,
                                  order: q.order,
                                  options: q.options || ["", "", "", ""],
                                  correct_answer: q.correct_answer,
                                  explanation: q.explanation || "",
                                  points: q.points,
                                })
                                setShowEditAssessmentModal(true)
                              }}
                              className="p-1 hover:bg-amber-100 rounded transition-colors"
                              title="Edit question"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => {
                                setAssessmentToDelete(q)
                                setShowDeleteAssessmentConfirm(true)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects/Exercises */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="w-5 h-5 text-green-600" />
                      Projects & Exercises
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${projects.length} item(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddProjectModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage projects</p>
                  </div>
                ) : isLoadingProjects ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No projects/exercises yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddProjectModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projects.map((project, index) => (
                      <div key={project.project_id} className="p-2 bg-gray-50 rounded border border-gray-200 hover:border-green-200 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{project.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                            {project.estimated_hours && (
                              <span className="text-xs text-gray-400">{project.estimated_hours}h</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingProject(project)
                                setProjectForm({
                                  title: project.title,
                                  description: project.description,
                                  order: project.order,
                                  estimated_hours: project.estimated_hours || 2,
                                  starter_repo_url: project.starter_repo_url || "",
                                  solution_repo_url: project.solution_repo_url || "",
                                  required_skills: project.required_skills || [],
                                })
                                setShowEditProjectModal(true)
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit project"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setProjectToDelete(project)
                                setShowDeleteProjectConfirm(true)
                              }}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-start">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedCourse(null)
              setSelectedPathId(null)
              setSelectedModuleId(null)
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>

      {/* Add Learning Path Modal */}
      {showAddPathModal && selectedCourse && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddPathModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create Learning Path</h2>
                <button
                  onClick={() => setShowAddPathModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Path Title *</label>
                  <input
                    type="text"
                    value={pathForm.title}
                    onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Beginner Track"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                    placeholder="Describe what students will learn in this path..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pathForm.price}
                    onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={pathForm.is_default}
                    onChange={(e) => setPathForm({ ...pathForm, is_default: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">Set as default path</label>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddPathModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700" 
                  onClick={() => {
                    if (!pathForm.title || !pathForm.description) {
                      toast.error("Please fill in all required fields")
                      return
                    }
                    createLearningPathMutation.mutate({
                      courseId: selectedCourse,
                      data: {
                        course_id: selectedCourse,
                        title: sanitizeString(pathForm.title),
                        description: sanitizeString(pathForm.description),
                        price: pathForm.price,
                        is_default: pathForm.is_default,
                      }
                    })
                    setShowAddPathModal(false)
                    setPathForm({ title: "", description: "", price: 0, is_default: false })
                  }}
                  disabled={createLearningPathMutation.isPending}
                >
                  {createLearningPathMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Path
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddLessonModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add New Lesson</h2>
                <button
                  onClick={() => setShowAddLessonModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Introduction to Variables"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                    placeholder="Brief overview of the lesson..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Content</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 font-mono text-sm"
                    placeholder="Write the main lesson content here... (supports markdown)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Minutes</label>
                    <input
                      type="number"
                      value={lessonForm.estimated_minutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 15 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <select
                      value={lessonForm.content_type}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select type</option>
                      <option value="theory">Theory</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    value={lessonForm.youtube_video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">External Resources</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/resource"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newResource.trim()) {
                          setLessonForm({ ...lessonForm, external_resources: [...lessonForm.external_resources, newResource.trim()] })
                          setNewResource("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.external_resources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lessonForm.external_resources.map((resource, index) => (
                        <Badge key={index} className="bg-purple-100 text-purple-700 border-0 flex items-center gap-1">
                          <a href={resource} target="_blank" rel="noopener noreferrer" className="truncate max-w-40 text-xs">{resource}</a>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, external_resources: lessonForm.external_resources.filter((_, i) => i !== index) })}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Outcomes (What you'll learn)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Understand how variables work"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newOutcome.trim()) {
                          setLessonForm({ ...lessonForm, expected_outcomes: [...lessonForm.expected_outcomes, newOutcome.trim()] })
                          setNewOutcome("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.expected_outcomes.length > 0 && (
                    <ul className="space-y-1">
                      {lessonForm.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-1 rounded">
                          <span className="text-green-600">✓</span>
                          <span className="flex-1">{outcome}</span>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, expected_outcomes: lessonForm.expected_outcomes.filter((_, i) => i !== index) })}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddLessonModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    if (!lessonForm.title || !lessonForm.description) {
                      toast.error("Please fill in required fields")
                      return
                    }
                    createLessonMutation.mutate({
                      moduleId: selectedModuleId,
                      data: {
                        module_id: selectedModuleId,
                        title: sanitizeString(lessonForm.title),
                        description: sanitizeString(lessonForm.description),
                        content: lessonForm.content || undefined,
                        order: lessonForm.order,
                        content_type: lessonForm.content_type || undefined,
                        estimated_minutes: lessonForm.estimated_minutes || undefined,
                        youtube_video_url: lessonForm.youtube_video_url || undefined,
                        external_resources: lessonForm.external_resources.length > 0 ? lessonForm.external_resources : undefined,
                        expected_outcomes: lessonForm.expected_outcomes.length > 0 ? lessonForm.expected_outcomes : undefined,
                      }
                    })
                  }}
                  disabled={createLessonMutation.isPending}
                >
                  {createLessonMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Lesson
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Lesson Modal */}
      {showEditLessonModal && editingLesson && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditLessonModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Lesson</h2>
                <button
                  onClick={() => setShowEditLessonModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Content</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 font-mono text-sm"
                    placeholder="Write the main lesson content here..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Minutes</label>
                    <input
                      type="number"
                      value={lessonForm.estimated_minutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 15 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <select
                      value={lessonForm.content_type}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select type</option>
                      <option value="theory">Theory</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    value={lessonForm.youtube_video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">External Resources</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/resource"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newResource.trim()) {
                          setLessonForm({ ...lessonForm, external_resources: [...lessonForm.external_resources, newResource.trim()] })
                          setNewResource("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.external_resources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lessonForm.external_resources.map((resource, index) => (
                        <Badge key={index} className="bg-purple-100 text-purple-700 border-0 flex items-center gap-1">
                          <a href={resource} target="_blank" rel="noopener noreferrer" className="truncate max-w-40 text-xs">{resource}</a>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, external_resources: lessonForm.external_resources.filter((_, i) => i !== index) })}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Outcomes (What you'll learn)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Understand how variables work"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newOutcome.trim()) {
                          setLessonForm({ ...lessonForm, expected_outcomes: [...lessonForm.expected_outcomes, newOutcome.trim()] })
                          setNewOutcome("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.expected_outcomes.length > 0 && (
                    <ul className="space-y-1">
                      {lessonForm.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-1 rounded">
                          <span className="text-green-600">✓</span>
                          <span className="flex-1">{outcome}</span>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, expected_outcomes: lessonForm.expected_outcomes.filter((_, i) => i !== index) })}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditLessonModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    if (!lessonForm.title || !lessonForm.description) {
                      toast.error("Please fill in required fields")
                      return
                    }
                    updateLessonMutation.mutate({
                      lessonId: editingLesson.lesson_id,
                      data: {
                        title: sanitizeString(lessonForm.title),
                        description: sanitizeString(lessonForm.description),
                        content: lessonForm.content || undefined,
                        order: lessonForm.order,
                        content_type: lessonForm.content_type || undefined,
                        estimated_minutes: lessonForm.estimated_minutes || undefined,
                        youtube_video_url: lessonForm.youtube_video_url || undefined,
                        external_resources: lessonForm.external_resources,
                        expected_outcomes: lessonForm.expected_outcomes,
                      }
                    })
                  }}
                  disabled={updateLessonMutation.isPending}
                >
                  {updateLessonMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Lesson Confirmation Modal */}
      {showDeleteLessonConfirm && lessonToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteLessonConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Lesson</h2>
                <button
                  onClick={() => setShowDeleteLessonConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this lesson?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{lessonToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        The lesson content and all associated progress will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteLessonConfirm(false)} disabled={deleteLessonMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => deleteLessonMutation.mutate(lessonToDelete.lesson_id)}
                  disabled={deleteLessonMutation.isPending}
                >
                  {deleteLessonMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Lesson
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Project/Exercise Modal */}
      {showAddProjectModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddProjectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add Project / Exercise</h2>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Build a Todo App"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={projectForm.estimated_hours}
                      onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description / Instructions *</label>
                  <p className="text-xs text-gray-500 mb-2">Provide detailed instructions. Use Markdown for formatting.</p>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[200px] font-mono text-sm"
                    placeholder={`# Project Overview\nDescribe what students will build...\n\n## Requirements\n- Requirement 1\n- Requirement 2\n\n## Steps\n1. First step...\n2. Second step...`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Starter Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.starter_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solution Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.solution_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, solution_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddProjectModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => {
                    if (!projectForm.title || !projectForm.description) {
                      toast.error("Please fill in title and description")
                      return
                    }
                    createProjectMutation.mutate({
                      moduleId: selectedModuleId,
                      data: {
                        module_id: selectedModuleId,
                        title: sanitizeString(projectForm.title),
                        description: projectForm.description,
                        order: projects.length + 1,
                        estimated_hours: projectForm.estimated_hours,
                        starter_repo_url: projectForm.starter_repo_url || undefined,
                        solution_repo_url: projectForm.solution_repo_url || undefined,
                      }
                    })
                  }}
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditProjectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
                <button
                  onClick={() => setShowEditProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Build a Todo App"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={projectForm.estimated_hours}
                      onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description / Instructions *</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[200px] font-mono text-sm"
                    placeholder="Describe what students will build..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Starter Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.starter_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solution Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.solution_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, solution_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={projectForm.order}
                    onChange={(e) => setProjectForm({ ...projectForm, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditProjectModal(false)} disabled={updateProjectMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => {
                    if (!projectForm.title || !projectForm.description) {
                      toast.error("Please fill in title and description")
                      return
                    }
                    updateProjectMutation.mutate({
                      projectId: editingProject.project_id,
                      data: {
                        title: sanitizeString(projectForm.title),
                        description: projectForm.description,
                        order: projectForm.order,
                        estimated_hours: projectForm.estimated_hours,
                        starter_repo_url: projectForm.starter_repo_url || undefined,
                        solution_repo_url: projectForm.solution_repo_url || undefined,
                      }
                    })
                  }}
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteProjectConfirm && projectToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteProjectConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Project</h2>
                <button
                  onClick={() => setShowDeleteProjectConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium mb-1">
                      Are you sure you want to delete "{projectToDelete.title}"?
                    </p>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone. All student submissions for this project will also be deleted.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteProjectConfirm(false)} disabled={deleteProjectMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteProjectMutation.mutate(projectToDelete.project_id)}
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Quiz Question Modal */}
      {showAddAssessmentModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddAssessmentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add Quiz Question</h2>
                <button
                  onClick={() => setShowAddAssessmentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                  <textarea
                    value={assessmentForm.question_text}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                    placeholder="Enter your question..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      value={assessmentForm.question_type}
                      onChange={(e) => {
                        const value = e.target.value as typeof assessmentForm.question_type
                        setAssessmentForm({ ...assessmentForm, question_type: value })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={assessmentForm.difficulty_level}
                      onChange={(e) => {
                        const value = e.target.value as typeof assessmentForm.difficulty_level
                        setAssessmentForm({ ...assessmentForm, difficulty_level: value })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      value={assessmentForm.points}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min="1"
                    />
                  </div>
                </div>

                {assessmentForm.question_type === "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                    <p className="text-xs text-gray-500 mb-3">Select the radio button next to the correct answer</p>
                    <div className="space-y-2">
                      {assessmentForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct_answer"
                            checked={assessmentForm.correct_answer === String(index)}
                            onChange={() => setAssessmentForm({ ...assessmentForm, correct_answer: String(index) })}
                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...assessmentForm.options]
                              newOptions[index] = e.target.value
                              setAssessmentForm({ ...assessmentForm, options: newOptions })
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                              assessmentForm.correct_answer === String(index)
                                ? "border-green-300 bg-green-50 focus:ring-green-500"
                                : "border-gray-200 focus:ring-amber-500"
                            }`}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assessmentForm.question_type !== "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Answer / Solution</label>
                    <textarea
                      value={assessmentForm.correct_answer}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] font-mono text-sm"
                      placeholder="Enter the expected answer or solution code..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                  <textarea
                    value={assessmentForm.explanation}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddAssessmentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700" 
                  onClick={() => {
                    if (!assessmentForm.question_text) {
                      toast.error("Please enter a question")
                      return
                    }
                    const data: AssessmentQuestionCreatePayload = {
                      module_id: selectedModuleId,
                      question_text: assessmentForm.question_text,
                      question_type: assessmentForm.question_type,
                      difficulty_level: assessmentForm.difficulty_level,
                      order: assessments.length + 1,
                      points: assessmentForm.points,
                      explanation: assessmentForm.explanation || undefined,
                      correct_answer: assessmentForm.correct_answer,
                    }
                    if (assessmentForm.question_type === "multiple_choice") {
                      data.options = assessmentForm.options.filter(o => o.trim() !== "")
                    }
                    createAssessmentMutation.mutate({ moduleId: selectedModuleId, data })
                  }}
                  disabled={createAssessmentMutation.isPending}
                >
                  {createAssessmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Assessment Modal */}
      {showEditAssessmentModal && editingAssessment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditAssessmentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Assessment Question</h2>
                <button
                  onClick={() => setShowEditAssessmentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                  <textarea
                    value={assessmentForm.question_text}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                    placeholder="Enter your question..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      value={assessmentForm.question_type}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, question_type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={assessmentForm.difficulty_level}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      value={assessmentForm.points}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                {assessmentForm.question_type === "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                    <div className="space-y-2">
                      {assessmentForm.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="edit-correct-answer"
                            checked={assessmentForm.correct_answer === String(idx)}
                            onChange={() => setAssessmentForm({ ...assessmentForm, correct_answer: String(idx) })}
                            className="w-4 h-4 text-amber-600"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...assessmentForm.options]
                              newOptions[idx] = e.target.value
                              setAssessmentForm({ ...assessmentForm, options: newOptions })
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                              assessmentForm.correct_answer === String(idx) 
                                ? "border-green-300 bg-green-50 focus:ring-green-500" 
                                : "border-gray-200 focus:ring-amber-500"
                            }`}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select the radio button for the correct answer</p>
                  </div>
                )}
                {assessmentForm.question_type !== "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                    <textarea
                      value={assessmentForm.correct_answer}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                  <textarea
                    value={assessmentForm.explanation}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditAssessmentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700" 
                  onClick={() => {
                    if (!assessmentForm.question_text) {
                      toast.error("Please enter a question")
                      return
                    }
                    const data: AssessmentQuestionUpdatePayload = {
                      question_text: assessmentForm.question_text,
                      question_type: assessmentForm.question_type,
                      difficulty_level: assessmentForm.difficulty_level,
                      order: assessmentForm.order,
                      points: assessmentForm.points,
                      explanation: assessmentForm.explanation || undefined,
                      correct_answer: assessmentForm.correct_answer,
                    }
                    if (assessmentForm.question_type === "multiple_choice") {
                      data.options = assessmentForm.options.filter(o => o.trim() !== "")
                    }
                    updateAssessmentMutation.mutate({ questionId: editingAssessment.question_id, data })
                  }}
                  disabled={updateAssessmentMutation.isPending}
                >
                  {updateAssessmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Assessment Confirmation Modal */}
      {showDeleteAssessmentConfirm && assessmentToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteAssessmentConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Question</h2>
                <button
                  onClick={() => setShowDeleteAssessmentConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this question?</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      "{assessmentToDelete.question_text}"
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium">⚠️ This action cannot be undone!</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteAssessmentConfirm(false)} disabled={deleteAssessmentMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => deleteAssessmentMutation.mutate(assessmentToDelete.question_id)}
                  disabled={deleteAssessmentMutation.isPending}
                >
                  {deleteAssessmentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {renderModals()}
    </>
  )
}

export function AnalyticsView() {
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

export function SettingsView() {
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

// Bootcamp Management Component
export function BootcampManagementView() {
  const queryClient = useQueryClient()
  const [selectedBootcamp, setSelectedBootcamp] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [editingBootcamp, setEditingBootcamp] = useState<BootcampListResponse | null>(null)
  const [deletingBootcamp, setDeletingBootcamp] = useState<BootcampListResponse | null>(null)
  
  const [memberForm, setMemberForm] = useState({
    user_id: "",
    email: "",
    paymentStatus: "pending" as "pending" | "partial" | "paid" | "refunded",
    amount: 0,
    notes: "",
  })
  
  const [bootcampForm, setBootcampForm] = useState({
    name: "",
    slug: "",
    description: "",
    startDate: "",
    endDate: "",
    duration: "",
    schedule: "",
    format: "online" as "online" | "in-person" | "hybrid",
    location: "",
    fee: 0,
    earlyBirdFee: 0,
    earlyBirdDeadline: "",
    maxCapacity: 25,
    instructor: "",
    curriculum: "",
    courseId: null as number | null, // Linked course for bootcamp
  })

  // ============================================================================
  // API QUERIES & MUTATIONS
  // ============================================================================

  // Fetch bootcamps
  const {
    data: bootcamps = [],
    isLoading: isLoadingBootcamps,
    isError: isBootcampsError,
  } = useQuery({
    queryKey: ["admin", "bootcamps"],
    queryFn: () => bootcampAdminApi.listBootcamps({ include_inactive: true, include_drafts: true }),
    staleTime: 30000,
  })

  // Fetch enrollments for selected bootcamp
  const {
    data: enrollments = [],
    isLoading: isLoadingEnrollments,
  } = useQuery({
    queryKey: ["admin", "enrollments", selectedBootcamp],
    queryFn: () => selectedBootcamp ? bootcampAdminApi.listEnrollments(selectedBootcamp) : Promise.resolve([]),
    enabled: !!selectedBootcamp && showMembersModal,
    staleTime: 30000,
  })

  // Fetch courses for bootcamp course linking
  const { data: availableCourses = [] } = useQuery({
    queryKey: ["admin", "bootcamp-courses"],
    queryFn: () => courseAdminApi.listCourses({ limit: 100 }),
    staleTime: 60000,
    enabled: showCreateModal || showEditModal,
  })

  // Create bootcamp mutation
  const createBootcampMutation = useMutation({
    mutationFn: (data: BootcampCreatePayload) => bootcampAdminApi.createBootcamp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bootcamps"] })
      toast.success("Bootcamp created!", {
        description: "The bootcamp has been successfully created.",
      })
      setShowCreateModal(false)
      resetBootcampForm()
    },
    onError: (error) => {
      toast.error("Failed to create bootcamp", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update bootcamp mutation
  const updateBootcampMutation = useMutation({
    mutationFn: ({ bootcampId, data }: { bootcampId: number; data: BootcampUpdatePayload }) =>
      bootcampAdminApi.updateBootcamp(bootcampId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bootcamps"] })
      toast.success("Bootcamp updated!", {
        description: "Changes have been saved.",
      })
      setShowEditModal(false)
      setEditingBootcamp(null)
    },
    onError: (error) => {
      toast.error("Failed to update bootcamp", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete bootcamp mutation
  const deleteBootcampMutation = useMutation({
    mutationFn: (bootcampId: number) => bootcampAdminApi.deleteBootcamp(bootcampId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bootcamps"] })
      toast.success("Bootcamp deleted!", {
        description: "The bootcamp has been permanently removed.",
      })
      setShowDeleteModal(false)
      setDeletingBootcamp(null)
    },
    onError: (error) => {
      toast.error("Failed to delete bootcamp", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Publish bootcamp mutation
  const publishBootcampMutation = useMutation({
    mutationFn: (bootcampId: number) => bootcampAdminApi.publishBootcamp(bootcampId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bootcamps"] })
      toast.success("Bootcamp published!", {
        description: "Users can now enroll in this bootcamp.",
      })
    },
    onError: (error) => {
      toast.error("Failed to publish bootcamp", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create enrollment mutation
  const createEnrollmentMutation = useMutation({
    mutationFn: ({ bootcampId, data }: { bootcampId: number; data: EnrollmentCreatePayload }) =>
      bootcampAdminApi.createEnrollment(bootcampId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "enrollments", selectedBootcamp] })
      queryClient.invalidateQueries({ queryKey: ["admin", "bootcamps"] })
      toast.success("Member enrolled!", {
        description: "The user has been enrolled in the bootcamp.",
      })
      setShowAddMemberModal(false)
      resetMemberForm()
    },
    onError: (error) => {
      toast.error("Failed to enroll member", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Helper to reset forms
  const resetBootcampForm = () => {
    setBootcampForm({
      name: "", slug: "", description: "", startDate: "", endDate: "",
      duration: "", schedule: "", format: "online", location: "", fee: 0,
      earlyBirdFee: 0, earlyBirdDeadline: "", maxCapacity: 25, instructor: "", curriculum: "",
      courseId: null,
    })
  }

  const resetMemberForm = () => {
    setMemberForm({ user_id: "", email: "", paymentStatus: "pending", amount: 0, notes: "" })
  }

  // Stats calculated from real data
  const stats = {
    total: bootcamps.length,
    published: bootcamps.filter(b => b.status === "published").length,
    inProgress: bootcamps.filter(b => b.status === "in_progress").length,
    completed: bootcamps.filter(b => b.status === "completed").length,
    totalEnrolled: bootcamps.reduce((sum, b) => sum + b.enrolled_count, 0),
    totalRevenue: enrollments.filter(m => m.payment_status === "paid").reduce((sum, m) => sum + m.amount_paid, 0),
  }

  // Computed values from API data
  const selectedBootcampData = selectedBootcamp 
    ? bootcamps.find(b => b.bootcamp_id === selectedBootcamp) 
    : null

  const bootcampMembers = enrollments

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700 border-0"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      case "published":
        return <Badge className="bg-green-100 text-green-700 border-0"><Sparkles className="w-3 h-3 mr-1" />Published</Badge>
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 border-0"><Activity className="w-3 h-3 mr-1" />In Progress</Badge>
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700 border-0"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-0"><X className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 border-0">Paid</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-700 border-0">Partial</Badge>
      case "pending":
        return <Badge className="bg-red-100 text-red-700 border-0">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleCreateBootcamp = () => {
    setBootcampForm({
      name: "", slug: "", description: "", startDate: "", endDate: "",
      duration: "", schedule: "", format: "online", location: "", fee: 0,
      earlyBirdFee: 0, earlyBirdDeadline: "", maxCapacity: 25, instructor: "", curriculum: "",
      courseId: null,
    })
    setShowCreateModal(true)
  }

  const handleEditBootcamp = (bootcamp: BootcampListResponse) => {
    setEditingBootcamp(bootcamp)
    setBootcampForm({
      name: bootcamp.name,
      slug: bootcamp.slug,
      description: bootcamp.description || "",
      startDate: bootcamp.start_date,
      endDate: bootcamp.end_date || "",
      duration: bootcamp.duration || "",
      schedule: bootcamp.schedule || "",
      format: bootcamp.format,
      location: bootcamp.location || "",
      fee: bootcamp.fee,
      earlyBirdFee: bootcamp.early_bird_fee || 0,
      earlyBirdDeadline: bootcamp.early_bird_deadline || "",
      maxCapacity: bootcamp.max_capacity,
      instructor: bootcamp.instructor_name || "",
      curriculum: bootcamp.curriculum?.join(", ") || "",
      courseId: bootcamp.course_id || null,
    })
    setShowEditModal(true)
  }

  const handleViewMembers = (bootcampId: number) => {
    setSelectedBootcamp(bootcampId)
    setShowMembersModal(true)
  }

  const handleSaveBootcamp = () => {
    const payload: BootcampCreatePayload = {
      name: bootcampForm.name,
      slug: bootcampForm.slug,
      description: bootcampForm.description || undefined,
      start_date: bootcampForm.startDate,
      end_date: bootcampForm.endDate,
      duration: bootcampForm.duration || undefined,
      schedule: bootcampForm.schedule || undefined,
      format: bootcampForm.format,
      location: bootcampForm.location || undefined,
      fee: bootcampForm.fee,
      early_bird_fee: bootcampForm.earlyBirdFee || undefined,
      early_bird_deadline: bootcampForm.earlyBirdDeadline || undefined,
      max_capacity: bootcampForm.maxCapacity,
      instructor_name: bootcampForm.instructor || undefined,
      curriculum: bootcampForm.curriculum ? bootcampForm.curriculum.split(",").map(c => c.trim()) : undefined,
      course_id: bootcampForm.courseId || undefined, // Linked course
    }

    if (editingBootcamp) {
      updateBootcampMutation.mutate({ bootcampId: editingBootcamp.bootcamp_id, data: payload })
    } else {
      createBootcampMutation.mutate(payload)
    }
  }

  const handleDeleteBootcamp = (bootcamp: BootcampListResponse) => {
    setDeletingBootcamp(bootcamp)
    setShowDeleteModal(true)
  }

  const confirmDeleteBootcamp = () => {
    if (deletingBootcamp) {
      deleteBootcampMutation.mutate(deletingBootcamp.bootcamp_id)
    }
  }

  const handleAddMember = () => {
    resetMemberForm()
    setShowAddMemberModal(true)
  }

  const handleSaveMember = () => {
    if (!selectedBootcamp) return
    if (!memberForm.user_id && !memberForm.email) return
    
    const payload: EnrollmentCreatePayload = {
      user_id: memberForm.user_id || undefined,
      email: memberForm.email || undefined,
      payment_status: memberForm.paymentStatus,
      amount_paid: memberForm.amount,
      notes: memberForm.notes || undefined,
    }
    createEnrollmentMutation.mutate({ bootcampId: selectedBootcamp, data: payload })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bootcamp Management</h2>
          <p className="text-gray-500 text-sm">Create and manage bootcamp cohorts, fees, and enrollments</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateBootcamp}>
          <Plus className="w-4 h-4 mr-2" />
          Create Bootcamp
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Bootcamps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            <p className="text-xs text-gray-500">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.totalEnrolled}</p>
            <p className="text-xs text-gray-500">Total Enrolled</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-green-600">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Bootcamps Grid */}
      {isLoadingBootcamps ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bootcamps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bootcamps Yet</h3>
            <p className="text-gray-500 mb-4">Create your first bootcamp to get started</p>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateBootcamp}>
              <Plus className="w-4 h-4 mr-2" />
              Create Bootcamp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {bootcamps.map((bootcamp) => (
            <Card key={bootcamp.bootcamp_id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(bootcamp.status)}
                      <Badge variant="outline" className="text-xs">
                        {bootcamp.format === "online" ? "Online" : bootcamp.format === "hybrid" ? "Hybrid" : "In-Person"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{bootcamp.name}</CardTitle>
                    <CardDescription className="mt-1">{bootcamp.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(bootcamp.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{bootcamp.duration || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{bootcamp.location || "Remote"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{bootcamp.enrolled_count}/{bootcamp.max_capacity} enrolled</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Enrollment</span>
                    <span>{Math.round((bootcamp.enrolled_count / bootcamp.max_capacity) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        bootcamp.enrolled_count >= bootcamp.max_capacity ? "bg-red-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min((bootcamp.enrolled_count / bootcamp.max_capacity) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-gray-500">Regular Fee</p>
                    <p className="text-lg font-bold text-gray-900">${bootcamp.fee.toLocaleString()}</p>
                  </div>
                  {bootcamp.status === "published" && bootcamp.early_bird_deadline && new Date(bootcamp.early_bird_deadline) > new Date() && (
                    <div className="text-right">
                      <p className="text-xs text-green-600">Early Bird</p>
                      <p className="text-lg font-bold text-green-600">${(bootcamp.early_bird_fee || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">until {formatDate(bootcamp.early_bird_deadline)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {bootcamp.status === "draft" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => publishBootcampMutation.mutate(bootcamp.bootcamp_id)}
                      disabled={publishBootcampMutation.isPending}
                    >
                      {publishBootcampMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewMembers(bootcamp.bootcamp_id)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Members ({bootcamp.enrolled_count})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBootcamp(bootcamp)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteBootcamp(bootcamp)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Bootcamp Confirmation Modal */}
      {showDeleteModal && deletingBootcamp && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Bootcamp</h3>
                <p className="text-gray-500 text-center mb-2">
                  Are you sure you want to delete <strong>{deletingBootcamp.name}</strong>?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This bootcamp has {deletingBootcamp.enrolled_count} enrolled members. 
                    Deleting it will remove all enrollment records and cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={confirmDeleteBootcamp}
                    disabled={deleteBootcampMutation.isPending}
                  >
                    {deleteBootcampMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Bootcamp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Bootcamp Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create New Bootcamp</h2>
                  <p className="text-sm text-gray-500">Set up a new bootcamp cohort with dates and pricing</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bootcamp Name *</label>
                    <input
                      type="text"
                      value={bootcampForm.name}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Full Stack Web Development Bootcamp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                    <input
                      type="text"
                      value={bootcampForm.slug}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., fullstack-web-2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
                    <input
                      type="text"
                      value={bootcampForm.instructor}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, instructor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Lead instructor name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={bootcampForm.description}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      placeholder="Brief description of the bootcamp..."
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Schedule & Format</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={bootcampForm.startDate}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, startDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input
                        type="date"
                        value={bootcampForm.endDate}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, endDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                      <input
                        type="text"
                        value={bootcampForm.duration}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, duration: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 12 weeks"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                      <input
                        type="number"
                        value={bootcampForm.maxCapacity}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, maxCapacity: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                      <input
                        type="text"
                        value={bootcampForm.schedule}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, schedule: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Mon-Fri, 9:00 AM - 5:00 PM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                      <select
                        value={bootcampForm.format}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, format: e.target.value as "online" | "in-person" | "hybrid" })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="online">Online</option>
                        <option value="in-person">In-Person</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={bootcampForm.location}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., San Francisco, CA or Remote"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Regular Fee ($) *</label>
                      <input
                        type="number"
                        value={bootcampForm.fee}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, fee: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Early Bird Fee ($)</label>
                      <input
                        type="number"
                        value={bootcampForm.earlyBirdFee}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, earlyBirdFee: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Early Bird Deadline</label>
                      <input
                        type="date"
                        value={bootcampForm.earlyBirdDeadline}
                        onChange={(e) => setBootcampForm({ ...bootcampForm, earlyBirdDeadline: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Curriculum */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Curriculum Topics</h3>
                  <input
                    type="text"
                    value={bootcampForm.curriculum}
                    onChange={(e) => setBootcampForm({ ...bootcampForm, curriculum: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React, Node.js, PostgreSQL, Docker (comma separated)"
                  />
                </div>

                {/* Linked Course */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Linked Course</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Select a course to link to this bootcamp. Enrolled students will be automatically enrolled in this course.
                  </p>
                  <select
                    value={bootcampForm.courseId || ""}
                    onChange={(e) => setBootcampForm({ ...bootcampForm, courseId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No linked course</option>
                    {availableCourses.map((course) => (
                      <option key={course.course_id} value={course.course_id}>
                        {course.title} ({course.difficulty_level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleSaveBootcamp}
                  disabled={createBootcampMutation.isPending || !bootcampForm.name || !bootcampForm.slug || !bootcampForm.startDate}
                >
                  {createBootcampMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Create Bootcamp
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Bootcamp Modal */}
      {showEditModal && editingBootcamp && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Bootcamp</h2>
                  <p className="text-sm text-gray-500">{editingBootcamp.name}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Same form fields as Create Modal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bootcamp Name *</label>
                    <input
                      type="text"
                      value={bootcampForm.name}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={bootcampForm.startDate}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={bootcampForm.endDate}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Regular Fee ($)</label>
                    <input
                      type="number"
                      value={bootcampForm.fee}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, fee: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                    <input
                      type="number"
                      value={bootcampForm.maxCapacity}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, maxCapacity: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                    <select
                      value={bootcampForm.format}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, format: e.target.value as "online" | "in-person" | "hybrid" })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="online">Online</option>
                      <option value="in-person">In-Person</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={bootcampForm.location}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Linked Course</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Enrolled students will be automatically enrolled in this course.
                    </p>
                    <select
                      value={bootcampForm.courseId || ""}
                      onChange={(e) => setBootcampForm({ ...bootcampForm, courseId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No linked course</option>
                      {availableCourses.map((course) => (
                        <option key={course.course_id} value={course.course_id}>
                          {course.title} ({course.difficulty_level})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleSaveBootcamp}
                  disabled={updateBootcampMutation.isPending}
                >
                  {updateBootcampMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Members Modal */}
      {showMembersModal && selectedBootcampData && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowMembersModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enrolled Members</h2>
                  <p className="text-sm text-gray-500">{selectedBootcampData.name}</p>
                </div>
                <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{selectedBootcampData.enrolled_count}</p>
                    <p className="text-xs text-gray-500">Enrolled</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{selectedBootcampData.max_capacity - selectedBootcampData.enrolled_count}</p>
                    <p className="text-xs text-gray-500">Spots Left</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {bootcampMembers.filter(m => m.payment_status === "paid").length}
                    </p>
                    <p className="text-xs text-green-600">Paid</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {bootcampMembers.filter(m => m.payment_status !== "paid").length}
                    </p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                </div>

                {/* Loading state */}
                {isLoadingEnrollments ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading members...</p>
                  </div>
                ) : bootcampMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No members enrolled yet</p>
                  </div>
                ) : (
                  /* Members Table */
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Enrolled Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bootcampMembers.map((member) => (
                          <tr key={member.enrollment_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                                  {(member.user_name || "U").charAt(0)}
                                </div>
                                <span className="font-medium text-sm text-gray-900">{member.user_name || "Unknown User"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{member.user_email || "-"}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{formatDate(member.enrolled_at)}</td>
                            <td className="py-3 px-4">{getPaymentBadge(member.payment_status)}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              ${member.amount_paid.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {member.payment_status !== "paid" && (
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600">
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowMembersModal(false)}>
                    Close
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddMember}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedBootcampData && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowAddMemberModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Member</h2>
                  <p className="text-sm text-gray-500">{selectedBootcampData.name}</p>
                </div>
                <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Provide either User ID or Email to find and enroll the user.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                    <input
                      type="text"
                      value={memberForm.user_id}
                      onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter user's UUID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                    <select
                      value={memberForm.paymentStatus}
                      onChange={(e) => setMemberForm({ ...memberForm, paymentStatus: e.target.value as "pending" | "partial" | "paid" | "refunded" })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid ($)</label>
                    <input
                      type="number"
                      value={memberForm.amount}
                      onChange={(e) => setMemberForm({ ...memberForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={memberForm.notes}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                    placeholder="Any notes about this enrollment..."
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Bootcamp Fee:</strong> ${selectedBootcampData.fee.toLocaleString()}
                    {selectedBootcampData.status === "enrolling" && selectedBootcampData.early_bird_deadline && new Date(selectedBootcampData.early_bird_deadline) > new Date() && (
                      <span className="text-green-600 ml-2">(Early Bird: ${(selectedBootcampData.early_bird_fee || 0).toLocaleString()})</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleSaveMember}
                  disabled={(!memberForm.user_id && !memberForm.email) || createEnrollmentMutation.isPending}
                >
                  {createEnrollmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Add Member
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Mentor Management Component
export function MentorManagementView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedMentor, setSelectedMentor] = useState<UserAdminResponse | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingMentor, setDeletingMentor] = useState<UserAdminResponse | null>(null)
  const [editForm, setEditForm] = useState({
    bio: "",
    title: "",
    company: "",
    expertise: [] as string[],
    hourlyRate: "",
    availability: "available",
    timezone: "",
    languages: [] as string[],
  })
  const [newExpertise, setNewExpertise] = useState("")
  const [newLanguage, setNewLanguage] = useState("")

  // Add Mentor modal state
  const [lookupEmail, setLookupEmail] = useState("")
  const [lookupResult, setLookupResult] = useState<UserAdminResponse | null>(null)
  const [lookupError, setLookupError] = useState("")

  // Fetch mentors from API
  const { data: mentorsData, isLoading: isLoadingMentors, error: mentorsError } = useQuery({
    queryKey: ["admin", "mentors", statusFilter],
    queryFn: () => userAdminApi.listMentors({
      is_active: statusFilter === "all" ? undefined : statusFilter === "active",
      limit: 100,
    }),
  })

  // Lookup user by email mutation
  const lookupUserMutation = useMutation({
    mutationFn: (email: string) => userAdminApi.lookupByEmail(email),
    onSuccess: (user) => {
      setLookupResult(user)
      setLookupError("")
      if (user.role === "mentor") {
        setLookupError("This user is already a mentor")
      }
    },
    onError: (error) => {
      setLookupResult(null)
      setLookupError(getApiErrorMessage(error))
    },
  })

  // Promote to mentor mutation
  const promoteToMentorMutation = useMutation({
    mutationFn: (userId: string) => userAdminApi.promoteToMentor(userId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] })
      toast.success("User promoted to mentor!", {
        description: `${user.full_name} is now a mentor.`,
      })
      setShowAddModal(false)
      resetAddMentorForm()
    },
    onError: (error) => {
      toast.error("Failed to promote user", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const resetAddMentorForm = () => {
    setLookupEmail("")
    setLookupResult(null)
    setLookupError("")
  }

  const handleLookupUser = () => {
    if (!lookupEmail.trim()) {
      setLookupError("Please enter an email address")
      return
    }
    setLookupResult(null)
    setLookupError("")
    lookupUserMutation.mutate(lookupEmail.trim())
  }

  const handlePromoteToMentor = () => {
    if (!lookupResult) return
    promoteToMentorMutation.mutate(lookupResult.id)
  }

  // Demote mentor mutation
  const demoteMentorMutation = useMutation({
    mutationFn: (userId: string) => userAdminApi.demoteMentor(userId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("Mentor demoted!", {
        description: `${user.full_name} is now a student.`,
      })
      setShowDeleteModal(false)
      setDeletingMentor(null)
    },
    onError: (error) => {
      toast.error("Failed to demote mentor", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Fetch mentor profile when editing
  const { data: mentorProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["admin", "mentor-profile", selectedMentor?.id],
    queryFn: () => selectedMentor ? userAdminApi.getMentorProfile(selectedMentor.id) : Promise.reject("No mentor selected"),
    enabled: showEditModal && !!selectedMentor,
  })

  // Update form when profile data loads
  useEffect(() => {
    if (mentorProfile && showEditModal) {
      setEditForm({
        bio: selectedMentor?.bio || "",
        title: mentorProfile.title || "",
        company: mentorProfile.company || "",
        expertise: mentorProfile.expertise || [],
        hourlyRate: mentorProfile.hourly_rate?.toString() || "",
        availability: mentorProfile.availability || "available",
        timezone: mentorProfile.timezone || "UTC",
        languages: mentorProfile.languages || [],
      })
    }
  }, [mentorProfile, showEditModal, selectedMentor?.bio])

  // Update mentor profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: MentorProfileUpdate }) =>
      userAdminApi.updateMentorProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "mentor-profile", selectedMentor?.id] })
      toast.success("Mentor profile updated!", {
        description: "The mentor profile has been saved successfully.",
      })
      setShowEditModal(false)
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const handleSaveProfile = () => {
    if (!selectedMentor) return
    
    const data: MentorProfileUpdate = {
      title: editForm.title || undefined,
      company: editForm.company || undefined,
      expertise: editForm.expertise.length > 0 ? editForm.expertise : undefined,
      languages: editForm.languages.length > 0 ? editForm.languages : undefined,
      hourly_rate: editForm.hourlyRate ? parseFloat(editForm.hourlyRate) : undefined,
      availability: editForm.availability,
      timezone: editForm.timezone,
      bio: editForm.bio || undefined,
    }
    
    updateProfileMutation.mutate({ userId: selectedMentor.id, data })
  }

  // Get mentors from API response
  const mentors = mentorsData?.users || []

  // Filter mentors by search query (client-side for responsiveness)
  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = mentor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mentor.bio && mentor.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const handleAddMentor = () => {
    resetAddMentorForm()
    setShowAddModal(true)
  }

  const handleViewMentor = (mentor: UserAdminResponse) => {
    setSelectedMentor(mentor)
    setShowViewModal(true)
  }

  const handleEditMentor = (mentor: UserAdminResponse) => {
    setSelectedMentor(mentor)
    setEditForm({
      bio: mentor.bio || "",
      title: "",
      company: "",
      expertise: [],
      hourlyRate: "",
      availability: "available",
      timezone: "UTC",
      languages: [],
    })
    setNewExpertise("")
    setNewLanguage("")
    setShowEditModal(true)
  }

  const handleDeleteMentor = (mentor: UserAdminResponse) => {
    setDeletingMentor(mentor)
    setShowDeleteModal(true)
  }

  const confirmDeleteMentor = () => {
    if (!deletingMentor) return
    demoteMentorMutation.mutate(deletingMentor.id)
  }

  // Stats
  const stats = {
    total: mentorsData?.total || 0,
    active: mentors.filter(m => m.is_active).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mentor Management</h2>
          <p className="text-gray-500 text-sm">Manage mentors, their profiles, and mentoring sessions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddMentor}>
          <Plus className="w-4 h-4 mr-2" />
          Add Mentor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Mentors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.total - stats.active}</p>
            <p className="text-xs text-gray-500">Inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{mentors.filter(m => m.is_verified).length}</p>
            <p className="text-xs text-gray-500">Verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search mentors by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoadingMentors && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading mentors...</span>
        </div>
      )}

      {/* Error State */}
      {mentorsError && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500">Failed to load mentors</p>
          <p className="text-sm text-gray-400">{getApiErrorMessage(mentorsError)}</p>
        </div>
      )}

      {/* Mentors Grid */}
      {!isLoadingMentors && !mentorsError && (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {mentor.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{mentor.full_name}</h3>
                      {mentor.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {mentor.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={mentor.is_active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                      {mentor.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {mentor.bio && (
                  <p className="text-sm text-gray-600 mt-4 line-clamp-2">{mentor.bio}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {mentor.last_login ? new Date(mentor.last_login).toLocaleDateString() : "Never"}
                    </p>
                    <p className="text-xs text-gray-500">Last Login</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(mentor.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">Joined</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewMentor(mentor)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditMentor(mentor)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteMentor(mentor)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoadingMentors && !mentorsError && filteredMentors.length === 0 && (
        <div className="text-center py-12">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No mentors found matching your criteria</p>
        </div>
      )}

      {/* Add Mentor Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowAddModal(false); resetAddMentorForm(); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Mentor</h2>
                  <p className="text-sm text-gray-500">Look up a user by email to promote to mentor</p>
                </div>
                <button onClick={() => { setShowAddModal(false); resetAddMentorForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Email Lookup Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookupUser()}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter user email to lookup"
                      disabled={lookupUserMutation.isPending}
                    />
                    <Button 
                      onClick={handleLookupUser} 
                      disabled={lookupUserMutation.isPending || !lookupEmail.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {lookupUserMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span className="ml-2">Lookup</span>
                    </Button>
                  </div>
                </div>

                {/* Error Message */}
                {lookupError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700">{lookupError}</p>
                  </div>
                )}

                {/* User Info Display */}
                {lookupResult && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">User Found</h3>
                      <p className="text-xs text-gray-500">Verify the user information below</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {lookupResult.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-semibold text-gray-900">{lookupResult.full_name}</h4>
                            {lookupResult.is_verified && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lookupResult.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Current Role</p>
                          <Badge className={
                            lookupResult.role === "admin" ? "bg-purple-100 text-purple-700 border-0" :
                            lookupResult.role === "mentor" ? "bg-blue-100 text-blue-700 border-0" :
                            "bg-gray-100 text-gray-700 border-0"
                          }>
                            {lookupResult.role.charAt(0).toUpperCase() + lookupResult.role.slice(1)}
                          </Badge>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Account Status</p>
                          <Badge className={
                            lookupResult.is_active ? "bg-green-100 text-green-700 border-0" :
                            "bg-red-100 text-red-700 border-0"
                          }>
                            {lookupResult.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      {lookupResult.role === "mentor" && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                          <p className="text-sm text-yellow-700">This user is already a mentor</p>
                        </div>
                      )}

                      {lookupResult.role === "admin" && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                          <p className="text-sm text-yellow-700">Admins cannot be promoted to mentor</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => { setShowAddModal(false); resetAddMentorForm(); }}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handlePromoteToMentor}
                  disabled={!lookupResult || lookupResult.role !== "student" || promoteToMentorMutation.isPending}
                >
                  {promoteToMentorMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Promote to Mentor
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Mentor Modal */}
      {showViewModal && selectedMentor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowViewModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Mentor Profile</h2>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* Profile Header */}
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedMentor.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{selectedMentor.full_name}</h3>
                      {selectedMentor.is_verified && (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <Badge className={selectedMentor.is_active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                        {selectedMentor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedMentor.email}
                    </p>
                    <p className="text-gray-500 flex items-center gap-2 mt-1">
                      <Badge className="bg-blue-100 text-blue-700 border-0">
                        {selectedMentor.role.charAt(0).toUpperCase() + selectedMentor.role.slice(1)}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Bio */}
                {selectedMentor.bio && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">About</h4>
                    <p className="text-gray-600">{selectedMentor.bio}</p>
                  </div>
                )}

                {/* Account Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Member Since</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedMentor.created_at).toLocaleDateString("en-US", { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric" 
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Last Login</p>
                    <p className="font-medium text-gray-900">
                      {selectedMentor.last_login 
                        ? new Date(selectedMentor.last_login).toLocaleDateString("en-US", { 
                            year: "numeric", 
                            month: "long", 
                            day: "numeric" 
                          })
                        : "Never"
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowViewModal(false)}>Close</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setShowViewModal(false); handleEditMentor(selectedMentor); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Mentor Modal */}
      {showEditModal && selectedMentor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Edit Mentor Profile</h2>
                  <p className="text-sm text-gray-500">{selectedMentor.full_name}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Loading profile...</span>
                </div>
              ) : (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={selectedMentor.full_name}
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={selectedMentor.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                {/* Professional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Senior Data Scientist"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <input
                      type="text"
                      value={editForm.company}
                      onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Google"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief professional background..."
                  />
                </div>

                {/* Expertise/Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expertise & Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newExpertise.trim()) {
                          e.preventDefault()
                          setEditForm({ ...editForm, expertise: [...editForm.expertise, newExpertise.trim()] })
                          setNewExpertise("")
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add skill (e.g., Python, Machine Learning)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newExpertise.trim()) {
                          setEditForm({ ...editForm, expertise: [...editForm.expertise, newExpertise.trim()] })
                          setNewExpertise("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.expertise.map((skill, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                        {skill}
                        <button
                          onClick={() => setEditForm({ ...editForm, expertise: editForm.expertise.filter((_, i) => i !== index) })}
                          className="ml-2 hover:text-blue-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {editForm.expertise.length === 0 && (
                      <p className="text-sm text-gray-400">No skills added yet</p>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newLanguage.trim()) {
                          e.preventDefault()
                          setEditForm({ ...editForm, languages: [...editForm.languages, newLanguage.trim()] })
                          setNewLanguage("")
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add language (e.g., English, Spanish)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newLanguage.trim()) {
                          setEditForm({ ...editForm, languages: [...editForm.languages, newLanguage.trim()] })
                          setNewLanguage("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.languages.map((lang, index) => (
                      <Badge key={index} className="bg-purple-100 text-purple-700 border-0 px-3 py-1">
                        {lang}
                        <button
                          onClick={() => setEditForm({ ...editForm, languages: editForm.languages.filter((_, i) => i !== index) })}
                          className="ml-2 hover:text-purple-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {editForm.languages.length === 0 && (
                      <p className="text-sm text-gray-400">No languages added yet</p>
                    )}
                  </div>
                </div>

                {/* Rate, Availability, Timezone */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($)</label>
                    <input
                      type="number"
                      value={editForm.hourlyRate}
                      onChange={(e) => setEditForm({ ...editForm, hourlyRate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                    <select
                      value={editForm.availability}
                      onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={editForm.timezone}
                      onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="PST">PST (UTC-8)</option>
                      <option value="EST">EST (UTC-5)</option>
                      <option value="CST">CST (UTC-6)</option>
                      <option value="MST">MST (UTC-7)</option>
                      <option value="GMT">GMT</option>
                      <option value="CET">CET (UTC+1)</option>
                      <option value="IST">IST (UTC+5:30)</option>
                    </select>
                  </div>
                </div>

                {/* Status Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Account Status</p>
                    <Badge className={selectedMentor.is_active ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                      {selectedMentor.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Verified</p>
                    <Badge className={selectedMentor.is_verified ? "bg-green-100 text-green-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                      {selectedMentor.is_verified ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
              )}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending || isLoadingProfile}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Demote Mentor Confirmation Modal */}
      {showDeleteModal && deletingMentor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Demote Mentor</h3>
                <p className="text-gray-500 text-center mb-4">
                  Are you sure you want to demote <strong>{deletingMentor.full_name}</strong> from mentor to student?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This will change the user&apos;s role from mentor to student. They will lose access to mentor features.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700" 
                    onClick={confirmDeleteMentor}
                    disabled={demoteMentorMutation.isPending}
                  >
                    {demoteMentorMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Demote Mentor
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function TransactionsView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransactionItem | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showSplitConfigModal, setShowSplitConfigModal] = useState(false)
  const [showSplitRecordModal, setShowSplitRecordModal] = useState(false)
  const [resolutionNote, setResolutionNote] = useState("")
  const [resolutionAction, setResolutionAction] = useState("")
  const [manualForm, setManualForm] = useState({ user_email: "", course_id: "", amount: "", payment_method: "cash", note: "" })
  const [splitConfigForm, setSplitConfigForm] = useState({ user_email: "", enrollment_id: "", total_amount: "", initial_amount: "", note: "" })
  const [splitRecordForm, setSplitRecordForm] = useState({ user_email: "", enrollment_id: "", amount: "", payment_method: "cash", note: "" })
  const [detailData, setDetailData] = useState<AdminTransactionDetailResponse | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Lookup states for modals
  const [manualUserLookup, setManualUserLookup] = useState<{ user_id: string; email: string; full_name: string } | null>(null)
  const [manualUserLoading, setManualUserLoading] = useState(false)
  const [splitConfigEnrollments, setSplitConfigEnrollments] = useState<Array<{ enrollment_id: number; course_id: number; course_title: string; path_id: number | null; enrollment_status: string; is_active: boolean }>>([])
  const [splitConfigLookupUser, setSplitConfigLookupUser] = useState<{ user_id: string; full_name: string } | null>(null)
  const [splitConfigLoading, setSplitConfigLoading] = useState(false)
  const [splitRecordEnrollments, setSplitRecordEnrollments] = useState<Array<{ enrollment_id: number; course_id: number; course_title: string; path_id: number | null; enrollment_status: string; is_active: boolean }>>([])
  const [splitRecordLookupUser, setSplitRecordLookupUser] = useState<{ user_id: string; full_name: string } | null>(null)
  const [splitRecordLoading, setSplitRecordLoading] = useState(false)

  // Fetch courses for manual payment dropdown
  const { data: coursesData } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: () => courseAdminApi.listCourses({ limit: 100 }),
    staleTime: 60000,
  })

  // Fetch transactions
  const { data: txnData, isLoading, isFetching } = useQuery({
    queryKey: ["admin-transactions", page, pageSize, statusFilter, searchQuery],
    queryFn: () =>
      transactionAdminApi.listTransactions({
        page,
        page_size: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      }),
    staleTime: 15000,
  })

  const transactions = txnData?.transactions || []
  const stats = txnData?.stats || { total: 0, pending: 0, successful: 0, failed: 0, cancelled: 0, partial: 0, total_revenue: 0 }
  const totalPages = txnData?.total_pages || 1

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note: string }) =>
      transactionAdminApi.resolvePayment(id, action, note),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Payment resolved")
      setShowResolveModal(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Manual payment mutation
  const manualPaymentMutation = useMutation({
    mutationFn: (data: { user_email: string; course_id: number; amount: number; payment_method?: string; note?: string }) =>
      transactionAdminApi.recordManualPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Manual payment recorded")
      setShowManualPaymentModal(false)
      setManualForm({ user_email: "", course_id: "", amount: "", payment_method: "cash", note: "" })
      setManualUserLookup(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Split configure mutation
  const splitConfigMutation = useMutation({
    mutationFn: (data: { enrollment_id: number; total_amount: number; initial_amount: number; note?: string }) =>
      transactionAdminApi.configureSplitPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Split payment configured")
      setShowSplitConfigModal(false)
      setSplitConfigForm({ user_email: "", enrollment_id: "", total_amount: "", initial_amount: "", note: "" })
      setSplitConfigEnrollments([])
      setSplitConfigLookupUser(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Split record mutation
  const splitRecordMutation = useMutation({
    mutationFn: (data: { enrollment_id: number; amount: number; payment_method?: string; note?: string }) =>
      transactionAdminApi.recordSplitPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Split instalment recorded")
      setShowSplitRecordModal(false)
      setSplitRecordForm({ user_email: "", enrollment_id: "", amount: "", payment_method: "cash", note: "" })
      setSplitRecordEnrollments([])
      setSplitRecordLookupUser(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Send receipt email mutation
  const sendReceiptMutation = useMutation({
    mutationFn: (id: number) => transactionAdminApi.sendReceiptEmail(id),
    onSuccess: () => {
      toast.success("Receipt email sent!")
      setShowReceiptModal(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "successful":
        return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Successful</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700 border-0"><Ban className="w-3 h-3 mr-1" />Cancelled</Badge>
      case "partial":
        return <Badge className="bg-purple-100 text-purple-700 border-0"><Clock className="w-3 h-3 mr-1" />Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const handleViewDetail = async (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    try {
      const detail = await transactionAdminApi.getTransactionDetail(txn.id)
      setDetailData(detail)
      setShowDetailModal(true)
    } catch (err) {
      toast.error("Failed to load transaction details")
    }
  }

  const handleGenerateReceipt = async (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    try {
      const data = await transactionAdminApi.getReceiptData(txn.id)
      setReceiptData(data)
      setShowReceiptModal(true)
    } catch (err) {
      toast.error("Failed to load receipt data")
    }
  }

  const handleResolvePayment = (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    setResolutionNote("")
    setResolutionAction("")
    setShowResolveModal(true)
  }

  const handleSubmitResolution = () => {
    if (!selectedTransaction || !resolutionAction) return
    resolveMutation.mutate({ id: selectedTransaction.id, action: resolutionAction, note: resolutionNote })
  }

  const handleExportCSV = async () => {
    try {
      const blob = await transactionAdminApi.exportCSV(statusFilter === "all" ? undefined : statusFilter)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement("a")
      a.href = url
      a.download = "transactions.csv"
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("CSV exported")
    } catch {
      toast.error("Export failed")
    }
  }

  // Lookup handlers for modals
  const handleLookupManualUser = async () => {
    if (!manualForm.user_email.trim()) return
    setManualUserLoading(true)
    setManualUserLookup(null)
    try {
      const result = await transactionAdminApi.lookupUserByEmail(manualForm.user_email.trim())
      setManualUserLookup(result)
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setManualUserLoading(false)
    }
  }

  const handleLookupSplitConfigEnrollments = async () => {
    if (!splitConfigForm.user_email.trim()) return
    setSplitConfigLoading(true)
    setSplitConfigEnrollments([])
    setSplitConfigLookupUser(null)
    setSplitConfigForm(f => ({ ...f, enrollment_id: "" }))
    try {
      const result = await transactionAdminApi.lookupEnrollmentsByEmail(splitConfigForm.user_email.trim())
      setSplitConfigLookupUser({ user_id: result.user_id, full_name: result.full_name })
      setSplitConfigEnrollments(result.enrollments)
      if (result.enrollments.length === 0) {
        toast.info("No enrollments found for this user")
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setSplitConfigLoading(false)
    }
  }

  const handleLookupSplitRecordEnrollments = async () => {
    if (!splitRecordForm.user_email.trim()) return
    setSplitRecordLoading(true)
    setSplitRecordEnrollments([])
    setSplitRecordLookupUser(null)
    setSplitRecordForm(f => ({ ...f, enrollment_id: "" }))
    try {
      const result = await transactionAdminApi.lookupEnrollmentsByEmail(splitRecordForm.user_email.trim())
      setSplitRecordLookupUser({ user_id: result.user_id, full_name: result.full_name })
      setSplitRecordEnrollments(result.enrollments)
      if (result.enrollments.length === 0) {
        toast.info("No enrollments found for this user")
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setSplitRecordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-gray-500 text-sm">Track payments, generate receipts, and resolve issues</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowManualPaymentModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Manual Payment
          </Button>
          <Button variant="outline" onClick={() => setShowSplitConfigModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" />Split Payment
          </Button>
          <Button variant="outline" onClick={() => setShowSplitRecordModal(true)}>
            <DollarSign className="w-4 h-4 mr-2" />Record Instalment
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.successful}</p><p className="text-xs text-gray-500">Successful</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-xs text-gray-500">Failed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p><p className="text-xs text-gray-500">Cancelled</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_revenue)}</p><p className="text-xs text-blue-600">Revenue</p></CardContent></Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, user, or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Reference</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Course</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded truncate block max-w-[150px]">
                            {txn.reference}
                          </code>
                          {txn.is_split_payment && <span className="text-xs text-purple-600 mt-1 block">Split</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {(txn.user_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{txn.user_name || "Unknown"}</p>
                              <p className="text-xs text-gray-500">{txn.user_email || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900 max-w-[200px] truncate">{txn.course_title || "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(txn.amount)} <span className="text-gray-400 font-normal text-xs">{txn.currency}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 capitalize">{txn.payment_method || "Nomba"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(txn.status)}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{formatDate(txn.created_at)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleGenerateReceipt(txn)} title="Receipt">
                              <Receipt className="w-4 h-4" />
                            </Button>
                            {(txn.status === "failed" || txn.status === "pending" || txn.status === "cancelled") && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleResolvePayment(txn)} title="Resolve">
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetail(txn)} title="View Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <p className="text-sm text-gray-500">Page {page} of {totalPages} ({txnData?.total || 0} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReceiptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Payment Receipt</h2>
                <button onClick={() => setShowReceiptModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6">
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 space-y-4">
                  <div className="text-center border-b border-dashed border-gray-300 pb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">AI Mentor</h3>
                    <p className="text-xs text-gray-500">Payment Receipt</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="font-mono text-gray-900">{receiptData.transaction_id}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-900">{formatDate(receiptData.payment_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="text-gray-900">{receiptData.user_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="text-gray-900">{receiptData.user_email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Payment Method:</span><span className="text-gray-900 capitalize">{receiptData.payment_method}</span></div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">{receiptData.course_title}</span><span className="text-gray-900">{formatCurrency(receiptData.amount)}</span></div>
                    <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-300">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(receiptData.amount)} {receiptData.currency}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-4 text-center">
                    <p className={`text-xs font-medium ${receiptData.status === "successful" ? "text-green-600" : "text-yellow-600"}`}>
                      {receiptData.status === "successful" ? "✓ Payment Successful" : `Status: ${receiptData.status}`}
                    </p>
                    {receiptData.admin_override_note && <p className="text-xs text-gray-400 mt-1">Note: {receiptData.admin_override_note}</p>}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />Print
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={sendReceiptMutation.isPending} onClick={() => selectedTransaction && sendReceiptMutation.mutate(selectedTransaction.id)}>
                    <Mail className="w-4 h-4 mr-2" />{sendReceiptMutation.isPending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Resolve Payment Modal */}
      {showResolveModal && selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowResolveModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Resolve Payment Issue</h2>
                  <p className="text-sm text-gray-500">{selectedTransaction.reference}</p>
                </div>
                <button onClick={() => setShowResolveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Customer:</span><span className="font-medium text-gray-900">{selectedTransaction.user_name || "Unknown"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Amount:</span><span className="font-medium text-gray-900">{formatCurrency(selectedTransaction.amount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Current Status:</span>{getStatusBadge(selectedTransaction.status)}</div>
                  {selectedTransaction.admin_override_note && (
                    <div className="pt-2 border-t border-gray-200"><p className="text-xs text-gray-500">Previous note: {selectedTransaction.admin_override_note}</p></div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Action</label>
                  <select value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select an action...</option>
                    {selectedTransaction.status === "pending" && (
                      <>
                        <option value="mark_completed">Mark as Completed (activate enrollment)</option>
                        <option value="cancel">Cancel Transaction</option>
                        <option value="retry">Retry Payment (generate new checkout)</option>
                      </>
                    )}
                    {selectedTransaction.status === "failed" && (
                      <>
                        <option value="retry">Retry Payment</option>
                        <option value="mark_completed">Manual Course Credit</option>
                        <option value="cancel">Cancel & Close</option>
                      </>
                    )}
                    {selectedTransaction.status === "cancelled" && (
                      <>
                        <option value="retry">Re-open & Retry</option>
                        <option value="mark_completed">Mark as Completed</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes <span className="text-red-500">*</span></label>
                  <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" placeholder="Add notes about this resolution (required for admin audit trail)..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmitResolution} disabled={!resolutionAction || !resolutionNote || resolveMutation.isPending}>
                  {resolveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Apply Resolution
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailData && selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDetailModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Transaction Detail</h2>
                  <p className="text-sm text-gray-500 font-mono">{selectedTransaction.reference}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-6">
                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500 mb-1">Amount</p><p className="text-lg font-bold">{formatCurrency(detailData.payment.amount)}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Status</p>{getStatusBadge(detailData.payment.status)}</div>
                  <div><p className="text-xs text-gray-500 mb-1">Customer</p><p className="text-sm font-medium">{detailData.payment.user_name || "Unknown"}</p><p className="text-xs text-gray-400">{detailData.payment.user_email}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Course</p><p className="text-sm font-medium">{detailData.payment.course_title || "N/A"}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Payment Method</p><p className="text-sm capitalize">{detailData.payment.payment_method || "Nomba"}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Enrollment Status</p><p className="text-sm capitalize">{detailData.enrollment_status}</p></div>
                </div>

                {/* Split Info */}
                {detailData.split_info && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Split Payment Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-purple-600">Total:</span> {formatCurrency(detailData.split_info.total_amount)}</div>
                      <div><span className="text-purple-600">Paid:</span> {formatCurrency(detailData.split_info.amount_paid)}</div>
                      <div><span className="text-purple-600">Outstanding:</span> <span className="font-semibold text-red-600">{formatCurrency(detailData.split_info.outstanding_balance)}</span></div>
                      <div><span className="text-purple-600">Payments:</span> {detailData.split_info.payment_count}</div>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {detailData.payment_history.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History ({detailData.payment_history.length})</h4>
                    <div className="space-y-2">
                      {detailData.payment_history.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                          <span className="font-mono text-xs text-gray-600">{p.reference}</span>
                          <span>{formatCurrency(p.amount)}</span>
                          {getStatusBadge(p.status)}
                          <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                {detailData.audit_trail.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Audit Trail</h4>
                    <div className="space-y-2">
                      {detailData.audit_trail.map((a) => (
                        <div key={a.id} className="border-l-2 border-blue-300 pl-4 py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{a.action}</Badge>
                            {a.previous_status && <span className="text-xs text-gray-400">{a.previous_status} → {a.new_status}</span>}
                          </div>
                          {a.note && <p className="text-sm text-gray-600 mt-1">{a.note}</p>}
                          <p className="text-xs text-gray-400 mt-1">by {a.admin_name} · {formatDate(a.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gateway Response */}
                {detailData.gateway_response && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Gateway Response</h4>
                    <pre className="bg-gray-900 text-green-200 rounded-lg p-4 text-xs overflow-x-auto">{JSON.stringify(detailData.gateway_response, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manual Payment Modal */}
      {showManualPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowManualPaymentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Manual Payment</h2>
                <button onClick={() => setShowManualPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={manualForm.user_email}
                      onChange={(e) => { setManualForm(f => ({ ...f, user_email: e.target.value })); setManualUserLookup(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupManualUser() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupManualUser} disabled={manualUserLoading || !manualForm.user_email.trim()} className="shrink-0">
                      {manualUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {manualUserLookup && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-green-800">{manualUserLookup.full_name || manualUserLookup.email}</span>
                        <span className="text-green-600 ml-2 text-xs">({manualUserLookup.email})</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    value={manualForm.course_id}
                    onChange={(e) => setManualForm(f => ({ ...f, course_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Select a course...</option>
                    {(coursesData || []).map((c) => (
                      <option key={c.course_id} value={c.course_id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NGN)</label>
                  <input type="number" step="0.01" value={manualForm.amount} onChange={(e) => setManualForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={manualForm.payment_method} onChange={(e) => setManualForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pos">POS</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={manualForm.note} onChange={(e) => setManualForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowManualPaymentModal(false)}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700" disabled={!manualUserLookup || !manualForm.course_id || !manualForm.amount || manualPaymentMutation.isPending}
                  onClick={() => manualPaymentMutation.mutate({ user_email: manualForm.user_email.trim(), course_id: Number(manualForm.course_id), amount: Number(manualForm.amount), payment_method: manualForm.payment_method, note: manualForm.note })}>
                  {manualPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Split Payment Config Modal */}
      {showSplitConfigModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSplitConfigModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Configure Split Payment</h2>
                <button onClick={() => setShowSplitConfigModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={splitConfigForm.user_email}
                      onChange={(e) => { setSplitConfigForm(f => ({ ...f, user_email: e.target.value, enrollment_id: "" })); setSplitConfigEnrollments([]); setSplitConfigLookupUser(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupSplitConfigEnrollments() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupSplitConfigEnrollments} disabled={splitConfigLoading || !splitConfigForm.user_email.trim()} className="shrink-0">
                      {splitConfigLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {splitConfigLookupUser && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">{splitConfigLookupUser.full_name || splitConfigForm.user_email}</span>
                    </div>
                  )}
                </div>
                {splitConfigEnrollments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Enrollment</label>
                    <select
                      value={splitConfigForm.enrollment_id}
                      onChange={(e) => setSplitConfigForm(f => ({ ...f, enrollment_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Choose an enrollment...</option>
                      {splitConfigEnrollments.map((en) => (
                        <option key={en.enrollment_id} value={en.enrollment_id}>
                          {en.course_title} — {en.enrollment_status} (ID: {en.enrollment_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (NGN)</label>
                  <input type="number" step="0.01" value={splitConfigForm.total_amount} onChange={(e) => setSplitConfigForm(f => ({ ...f, total_amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Full course price" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Payment (NGN)</label>
                  <input type="number" step="0.01" value={splitConfigForm.initial_amount} onChange={(e) => setSplitConfigForm(f => ({ ...f, initial_amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="First instalment" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={splitConfigForm.note} onChange={(e) => setSplitConfigForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSplitConfigModal(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={!splitConfigForm.enrollment_id || !splitConfigForm.total_amount || !splitConfigForm.initial_amount || splitConfigMutation.isPending}
                  onClick={() => splitConfigMutation.mutate({ enrollment_id: Number(splitConfigForm.enrollment_id), total_amount: Number(splitConfigForm.total_amount), initial_amount: Number(splitConfigForm.initial_amount), note: splitConfigForm.note })}>
                  {splitConfigMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Configure Split
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Split Payment Record Modal */}
      {showSplitRecordModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSplitRecordModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Split Instalment</h2>
                <button onClick={() => setShowSplitRecordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={splitRecordForm.user_email}
                      onChange={(e) => { setSplitRecordForm(f => ({ ...f, user_email: e.target.value, enrollment_id: "" })); setSplitRecordEnrollments([]); setSplitRecordLookupUser(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupSplitRecordEnrollments() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupSplitRecordEnrollments} disabled={splitRecordLoading || !splitRecordForm.user_email.trim()} className="shrink-0">
                      {splitRecordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {splitRecordLookupUser && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">{splitRecordLookupUser.full_name || splitRecordForm.user_email}</span>
                    </div>
                  )}
                </div>
                {splitRecordEnrollments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Enrollment</label>
                    <select
                      value={splitRecordForm.enrollment_id}
                      onChange={(e) => setSplitRecordForm(f => ({ ...f, enrollment_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Choose an enrollment...</option>
                      {splitRecordEnrollments.map((en) => (
                        <option key={en.enrollment_id} value={en.enrollment_id}>
                          {en.course_title} — {en.enrollment_status} (ID: {en.enrollment_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NGN)</label>
                  <input type="number" step="0.01" value={splitRecordForm.amount} onChange={(e) => setSplitRecordForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={splitRecordForm.payment_method} onChange={(e) => setSplitRecordForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pos">POS</option>
                    <option value="nomba">Nomba Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={splitRecordForm.note} onChange={(e) => setSplitRecordForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSplitRecordModal(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={!splitRecordForm.enrollment_id || !splitRecordForm.amount || splitRecordMutation.isPending}
                  onClick={() => splitRecordMutation.mutate({ enrollment_id: Number(splitRecordForm.enrollment_id), amount: Number(splitRecordForm.amount), payment_method: splitRecordForm.payment_method, note: splitRecordForm.note })}>
                  {splitRecordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Record Instalment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Community Management View
export function CommunityManagementView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"reports" | "channels">("channels")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [channelForm, setChannelForm] = useState({ name: "", description: "", type: "public", category: "discussion", joinLink: "" })
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)

  // Fetch channels from API
  const { data: channelsData, isLoading: isLoadingChannels } = useQuery({
    queryKey: ["community-channels", searchQuery, statusFilter],
    queryFn: () => communityApi.listChannels({
      search: searchQuery || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 100,
    }),
    staleTime: 30000,
  })

  const channels = channelsData?.channels || []
  const totalChannels = channelsData?.total || 0

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: CreateChannelPayload) => communityApi.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-channels"] })
      toast.success("Community channel created successfully!")
      setShowCreateChannelModal(false)
      setChannelForm({ name: "", description: "", type: "public", category: "discussion", joinLink: "" })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  // Mock Community Stats (will connect to real API in future)
  const communityStats = [
    { label: "Total Channels", value: totalChannels.toString(), change: "+0", trend: "up", icon: Hash },
    { label: "Pending Reports", value: "0", change: "0", trend: "down", icon: Flag },
  ]

  // Mock Reports (will connect to real API in future)
  const reports = [
    { id: 1, type: "spam", content: "User promoting external products...", reportedBy: "Sarah Johnson", reportedUser: "SpamBot123", post: "Check out this amazing...", status: "pending", createdAt: "1 hour ago", priority: "high" },
    { id: 2, type: "harassment", content: "Offensive comments towards another user", reportedBy: "Michael Chen", reportedUser: "ToxicUser99", post: "You're so stupid...", status: "pending", createdAt: "3 hours ago", priority: "high" },
    { id: 3, type: "inappropriate", content: "Contains inappropriate language", reportedBy: "Emily Rodriguez", reportedUser: "CasualUser", post: "This code is [expletive]...", status: "under_review", createdAt: "1 day ago", priority: "medium" },
    { id: 4, type: "off-topic", content: "Discussion not related to channel topic", reportedBy: "David Kim", reportedUser: "NewUser42", post: "Anyone want to buy...", status: "pending", createdAt: "2 days ago", priority: "low" },
    { id: 5, type: "spam", content: "Repeated promotional messages", reportedBy: "Lisa Wang", reportedUser: "MarketingGuy", post: "Join my course...", status: "resolved", resolution: "User warned", createdAt: "3 days ago", priority: "medium" },
    { id: 6, type: "harassment", content: "Targeted harassment of member", reportedBy: "Anna Martinez", reportedUser: "Troll2024", post: "Nobody likes you...", status: "resolved", resolution: "User banned", createdAt: "5 days ago", priority: "high" },
  ]

  // Filter channels (already filtered by API, but handle client-side for immediate feedback)
  const filteredChannels = channels

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.reportedUser.toLowerCase().includes(searchQuery.toLowerCase()) || r.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewPost = (post: any) => {
    setSelectedPost(post)
    setShowPostDetailModal(true)
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const handleResolveReport = (report: any, action: string) => {
    console.log("Resolving report:", report.id, "with action:", action)
    setShowReportModal(false)
  }

  const handleCreateChannel = () => {
    if (!channelForm.name.trim()) {
      toast.error("Channel name is required")
      return
    }
    
    createChannelMutation.mutate({
      name: channelForm.name.trim(),
      description: channelForm.description.trim() || undefined,
      type: channelForm.type as "public" | "private",
      category: channelForm.category as "discussion" | "study-group" | "leadership",
      join_link: channelForm.joinLink.trim() || undefined,
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Management</h1>
          <p className="text-gray-500 text-sm">Manage discussions, channels, and community reports</p>
        </div>
        <Button onClick={() => setShowCreateChannelModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Create Channel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {communityStats.map((stat, index) => (
          <Card key={index} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className={`flex items-center gap-1 text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.label.includes("Reports") ? "bg-red-100" : "bg-blue-100"}`}>
                  <stat.icon className={`w-6 h-6 ${stat.label.includes("Reports") ? "text-red-600" : "text-blue-600"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "channels", label: "Channels", icon: Hash },
          { id: "reports", label: "Reports", icon: Flag, badge: reports.filter(r => r.status === "pending").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {activeTab === "reports" ? (
            <>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </>
          ) : activeTab === "channels" ? (
            <>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="removed">Removed</option>
            </>
          )}
        </select>
      </div>

      {/* Channels Tab */}
      {activeTab === "channels" && (
        <div>
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-12 text-center">
                <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No channels yet</h3>
                <p className="text-gray-500 mb-4">Create your first community channel to get started.</p>
                <Button onClick={() => setShowCreateChannelModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Channel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChannels.map((channel) => (
                <Card key={channel.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${channel.type === "private" ? "bg-purple-100" : "bg-blue-100"}`}>
                          {channel.type === "private" ? <Lock className="w-4 h-4 text-purple-600" /> : <Hash className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                          <Badge variant="outline" className="text-xs font-normal mt-1">{channel.category}</Badge>
                        </div>
                      </div>
                      <Badge className={channel.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {channel.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{channel.description || "No description"}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" />{channel.members_count.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{channel.posts_count.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {channel.join_link && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={channel.join_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Report Type</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Reported User</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <Badge className={`${
                          report.type === "harassment" ? "bg-red-100 text-red-700" :
                          report.type === "spam" ? "bg-orange-100 text-orange-700" :
                          report.type === "inappropriate" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {report.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate">{report.content}</p>
                          <p className="text-xs text-gray-500">Reported by {report.reportedBy} • {report.createdAt}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                            {report.reportedUser.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{report.reportedUser}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${
                          report.priority === "high" ? "bg-red-100 text-red-700" :
                          report.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {report.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={`${
                          report.status === "pending" ? "bg-orange-100 text-orange-700" :
                          report.status === "under_review" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {report.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {report.status !== "resolved" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleResolveReport(report, "dismiss")}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleResolveReport(report, "ban")}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateChannelModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl z-50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Community</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateChannelModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Community Name</label>
                <input
                  type="text"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder="e.g., React Beginners"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={channelForm.description}
                  onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                  placeholder="What is this community about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={channelForm.type}
                    onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={channelForm.category}
                    onChange={(e) => setChannelForm({ ...channelForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="study-group">Study Group</option>
                    <option value="leadership">Leadership</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Join Link</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={channelForm.joinLink}
                    onChange={(e) => setChannelForm({ ...channelForm, joinLink: e.target.value })}
                    placeholder="https://discord.gg/... or https://slack.com/..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500">Enter the invite link for Discord, Slack, or any external community platform</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateChannelModal(false)} disabled={createChannelMutation.isPending}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCreateChannel} disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {createChannelMutation.isPending ? "Creating..." : "Create Community"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReportModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-xl z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowReportModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className={`${
                    selectedReport.type === "harassment" ? "bg-red-100 text-red-700" :
                    selectedReport.type === "spam" ? "bg-orange-100 text-orange-700" :
                    selectedReport.type === "inappropriate" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedReport.type}
                  </Badge>
                  <Badge className={`${
                    selectedReport.priority === "high" ? "bg-red-100 text-red-700" :
                    selectedReport.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedReport.priority} priority
                  </Badge>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Reported Content:</p>
                  <p className="text-gray-900">"{selectedReport.post}"</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Reported User</p>
                    <p className="font-medium text-gray-900">{selectedReport.reportedUser}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reported By</p>
                    <p className="font-medium text-gray-900">{selectedReport.reportedBy}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Reason</p>
                  <p className="text-gray-900">{selectedReport.content}</p>
                </div>
                
                {selectedReport.status === "resolved" && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Resolution: {selectedReport.resolution}</p>
                  </div>
                )}
                
                {selectedReport.status !== "resolved" && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Take Action:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "dismiss")}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss Report
                      </Button>
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "warn")}>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Warn User
                      </Button>
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "delete")}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Content
                      </Button>
                      <Button variant="outline" className="text-red-600" onClick={() => handleResolveReport(selectedReport, "ban")}>
                        <Ban className="w-4 h-4 mr-2" />
                        Ban User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Main Admin Dashboard Component - Shows Overview
export default function AdminDashboard() {
  return <OverviewView />
}
