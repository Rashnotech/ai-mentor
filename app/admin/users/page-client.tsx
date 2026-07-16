"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import {
  getApiErrorMessage,
  userAdminApi,
  type UserAdminResponse,
  type UserCreatePayload,
  type UserUpdatePayload,
  type UserRole,
  type AdminUserEnrollmentCourse,
  type AdminUserLearningResponse,
} from "@/lib/api"
import {
  Users,
  Search,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Award,
  Link2,
  X,
  Save,
  RefreshCw,
  Ban,
  ExternalLink,
  Loader2,
} from "lucide-react"


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
  const [selectedUserLearning, setSelectedUserLearning] = useState<AdminUserLearningResponse | null>(null)
  const [isLoadingUserLearning, setIsLoadingUserLearning] = useState(false)
  const [certificateForm, setCertificateForm] = useState({
    enrollmentKey: "",
    certificate_url: "",
  })
  
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

  const uploadCertificateMutation = useMutation({
    mutationFn: ({
      userId,
      courseId,
      pathId,
      certificateUrl,
    }: {
      userId: string
      courseId: number
      pathId: number | null
      certificateUrl: string
    }) =>
      userAdminApi.uploadCertificate(userId, {
        course_id: courseId,
        path_id: pathId,
        certificate_url: certificateUrl,
        is_public: true,
      }),
    onError: (error) => {
      toast.error("Failed to save certificate", {
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

  const getEnrollmentKey = (enrollment: AdminUserEnrollmentCourse) =>
    `${enrollment.course_id}:${enrollment.path_id ?? "none"}`

  const loadUserLearning = async (user: UserAdminResponse, preferredEnrollmentKey?: string) => {
    setIsLoadingUserLearning(true)
    try {
      const learning = await userAdminApi.getUserLearning(user.id)
      setSelectedUserLearning(learning)

      const nextEnrollment =
        learning.enrolled_courses.find((course) => getEnrollmentKey(course) === preferredEnrollmentKey) ||
        learning.enrolled_courses[0]

      setCertificateForm({
        enrollmentKey: nextEnrollment ? getEnrollmentKey(nextEnrollment) : "",
        certificate_url: nextEnrollment?.certificate?.certificate_url || "",
      })
    } catch (error) {
      setSelectedUserLearning(null)
      toast.error("Failed to load enrolled courses", {
        description: getApiErrorMessage(error),
      })
    } finally {
      setIsLoadingUserLearning(false)
    }
  }

  const handleViewUser = (user: UserAdminResponse) => {
    setSelectedUser(user)
    setSelectedUserLearning(null)
    setCertificateForm({ enrollmentKey: "", certificate_url: "" })
    setShowViewUserModal(true)
    void loadUserLearning(user)
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

  const handleSaveCertificate = async () => {
    if (!selectedUser || !selectedUserLearning) return

    const selectedEnrollment = selectedUserLearning.enrolled_courses.find(
      (course) => getEnrollmentKey(course) === certificateForm.enrollmentKey
    )

    if (!selectedEnrollment) {
      toast.error("Select an enrolled course before saving a certificate")
      return
    }

    const certificateUrl = certificateForm.certificate_url.trim()
    if (!certificateUrl) {
      toast.error("Certificate URL is required")
      return
    }

    await uploadCertificateMutation.mutateAsync({
      userId: selectedUser.id,
      courseId: selectedEnrollment.course_id,
      pathId: selectedEnrollment.path_id,
      certificateUrl,
    })

    toast.success("Certificate saved", {
      description: `${selectedEnrollment.course_title} will now appear in the student's profile.`,
    })
    await loadUserLearning(selectedUser, certificateForm.enrollmentKey)
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
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" 
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

                {/* Enrolled Courses */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Enrolled Courses</h4>
                      <p className="text-xs text-gray-500">Courses and certificates attached to this student.</p>
                    </div>
                    {isLoadingUserLearning && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                  </div>

                  {isLoadingUserLearning ? (
                    <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
                      Loading enrolled courses...
                    </div>
                  ) : selectedUserLearning?.enrolled_courses.length ? (
                    <div className="space-y-3">
                      {selectedUserLearning.enrolled_courses.map((course) => (
                        <div
                          key={getEnrollmentKey(course)}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{course.course_title}</p>
                              <p className="text-sm text-gray-500">
                                {course.path_title || "Default learning path"} · {course.enrollment_status}
                              </p>
                              {course.enrolled_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Enrolled {formatDate(course.enrolled_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={
                                  course.is_active
                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                                }
                              >
                                {course.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {course.certificate?.certificate_url ? (
                                <a
                                  href={course.certificate.certificate_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                                >
                                  View Certificate
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-sm text-gray-400">No certificate yet</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      This user has not enrolled in any course yet.
                    </div>
                  )}
                </div>

                {/* Certificate Upload */}
                <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Upload Certificate</h4>
                      <p className="text-xs text-gray-500">
                        Paste the hosted certificate URL for one of this student's enrolled courses.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enrolled Course
                      </label>
                      <select
                        value={certificateForm.enrollmentKey}
                        onChange={(event) => {
                          const nextEnrollment = selectedUserLearning?.enrolled_courses.find(
                            (course) => getEnrollmentKey(course) === event.target.value
                          )
                          setCertificateForm({
                            enrollmentKey: event.target.value,
                            certificate_url: nextEnrollment?.certificate?.certificate_url || "",
                          })
                        }}
                        disabled={!selectedUserLearning?.enrolled_courses.length || isLoadingUserLearning}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {!selectedUserLearning?.enrolled_courses.length && (
                          <option value="">No enrolled courses</option>
                        )}
                        {selectedUserLearning?.enrolled_courses.map((course) => (
                          <option key={getEnrollmentKey(course)} value={getEnrollmentKey(course)}>
                            {course.course_title}
                            {course.path_title ? ` · ${course.path_title}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate URL
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="url"
                            value={certificateForm.certificate_url}
                            onChange={(event) =>
                              setCertificateForm({
                                ...certificateForm,
                                certificate_url: event.target.value,
                              })
                            }
                            placeholder="https://example.com/certificates/student-certificate.pdf"
                            disabled={!selectedUserLearning?.enrolled_courses.length}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleSaveCertificate}
                          disabled={
                            uploadCertificateMutation.isPending ||
                            isLoadingUserLearning ||
                            !selectedUserLearning?.enrolled_courses.length
                          }
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {uploadCertificateMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Certificate
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        The link will appear in the student's Achievements & Certificates section.
                      </p>
                    </div>
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