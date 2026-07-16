"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getApiErrorMessage,
  userAdminApi,
  type UserAdminResponse,
  type MentorProfileUpdate
} from "@/lib/api"
import {
  Search,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
  Mail,
  AlertTriangle,
  Loader2,
  UserCog,
} from "lucide-react"



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