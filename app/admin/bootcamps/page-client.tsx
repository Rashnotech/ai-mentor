"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  courseAdminApi,
  getApiErrorMessage,
  bootcampAdminApi,
  type CourseListResponse,
  type BootcampListResponse,
  type BootcampCreatePayload,
  type BootcampUpdatePayload,
  type EnrollmentCreatePayload
} from "@/lib/api"
import {
  Users,
  Activity,
  UserPlus,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  X,
  Save,
  CreditCard,
  Mail,
  AlertTriangle,
  Calendar,
  GraduationCap,
  Loader2,
  MapPin,
  Sparkles
} from "lucide-react"


export function BootcampManagementView() {
  const queryClient = useQueryClient()

  type BootcampFormState = {
    name: string
    slug: string
    description: string
    startDate: string
    endDate: string
    duration: string
    schedule: string
    format: "online" | "in-person" | "hybrid"
    location: string
    fee: number
    earlyBirdFee: number
    earlyBirdDeadline: string
    maxCapacity: number
    instructor: string
    curriculum: string
    courseId: number | null
    pathId: number | null
  }

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
  
  const [bootcampForm, setBootcampForm] = useState<BootcampFormState>({
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
    pathId: null as number | null,
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
    queryFn: async () => {
      const pageSize = 100
      const courses: CourseListResponse[] = []
      let offset = 0

      while (true) {
        const page = await courseAdminApi.listCourses({ limit: pageSize, offset, include_paths: true })
        courses.push(...page)

        if (page.length < pageSize) {
          break
        }

        offset += pageSize
      }

      return courses
    },
    staleTime: 60000,
    enabled: showCreateModal || showEditModal,
  })

  const courseSelectionGroups = useMemo(() => {
    return availableCourses.map((course) => ({
      course,
      learningPaths: course.learning_paths || [],
    }))
  }, [availableCourses])

  const selectedCourseGroup = useMemo(
    () => courseSelectionGroups.find((group) => group.course.course_id === bootcampForm.courseId) || null,
    [courseSelectionGroups, bootcampForm.courseId],
  )

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
      pathId: null,
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
      pathId: null,
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
      pathId: bootcamp.path_id || null,
    })
    setShowEditModal(true)
  }

  const handleSelectBootcampCourse = (courseId: number) => {
    setBootcampForm((current) => ({
      ...current,
      courseId,
      pathId: null,
    }))
  }

  const handleSelectBootcampPath = (courseId: number, pathId: number) => {
    setBootcampForm((current) => ({
      ...current,
      courseId,
      pathId,
    }))
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
      path_id: bootcampForm.pathId || undefined,
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
                    Select a full course or a specific learning path within a course. Full course selection links all paths; path selection links only that track.
                  </p>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setBootcampForm((current) => ({ ...current, courseId: null, pathId: null }))}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        !bootcampForm.courseId
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">No linked course</p>
                          <p className="text-sm text-gray-500">Leave this bootcamp standalone.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optional</span>
                      </div>
                    </button>

                    {courseSelectionGroups.map(({ course, learningPaths }) => {
                      const isSelectedFullCourse = bootcampForm.courseId === course.course_id && bootcampForm.pathId === null
                      const isSelectedCoursePath = bootcampForm.courseId === course.course_id && bootcampForm.pathId !== null

                      return (
                        <details
                          key={course.course_id}
                          open={isSelectedFullCourse || isSelectedCoursePath}
                          className={`group rounded-xl border transition ${
                            isSelectedFullCourse || isSelectedCoursePath
                              ? "border-blue-500 bg-blue-50 shadow-sm"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">{course.title}</p>
                              <p className="text-sm text-gray-500">
                                {course.difficulty_level} • {learningPaths.length} learning path{learningPaths.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelectedFullCourse ? (
                                <Badge className="border-0 bg-blue-600 text-white">Full course</Badge>
                              ) : isSelectedCoursePath ? (
                                <Badge className="border-0 bg-indigo-600 text-white">Path selected</Badge>
                              ) : null}
                              <span className="text-xs font-medium text-gray-500 group-open:hidden">View paths</span>
                              <span className="text-xs font-medium text-gray-500 hidden group-open:inline">Hide paths</span>
                            </div>
                          </summary>

                          <div className="border-t border-gray-200 px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Link the entire course</p>
                                <p className="text-sm text-gray-500">All paths stay available and students are linked to the course as a whole.</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-transparent"
                                onClick={() => handleSelectBootcampCourse(course.course_id)}
                              >
                                Select full course
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Learning paths</p>
                              {learningPaths.length > 0 ? (
                                learningPaths.map((path) => {
                                  const isSelectedPath = bootcampForm.courseId === course.course_id && bootcampForm.pathId === path.path_id

                                  return (
                                    <button
                                      key={path.path_id}
                                      type="button"
                                      onClick={() => handleSelectBootcampPath(course.course_id, path.path_id)}
                                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                                        isSelectedPath
                                          ? "border-indigo-500 bg-indigo-50"
                                          : "border-gray-200 bg-white hover:border-indigo-300"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="font-medium text-gray-900">{path.title}</p>
                                          <p className="text-sm text-gray-500">
                                            {path.is_default ? "Default path" : "Custom path"}
                                            {path.min_skill_level || path.max_skill_level ? (
                                              <span>
                                                {" "}
                                                • {path.min_skill_level || "Any"}
                                                {path.max_skill_level ? ` to ${path.max_skill_level}` : ""}
                                              </span>
                                            ) : null}
                                          </p>
                                        </div>
                                        {isSelectedPath ? <Badge className="border-0 bg-indigo-600 text-white">Selected</Badge> : null}
                                      </div>
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
                                  This course has no learning paths yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </details>
                      )
                    })}
                  </div>
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
                  <div className="col-span-2 border-t border-gray-200 pt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Linked Course</label>
                    <p className="text-xs text-gray-500 mb-3">
                      Link the whole course or pick a specific learning path. Paths are shown under each course.
                    </p>
                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setBootcampForm((current) => ({ ...current, courseId: null, pathId: null }))}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          !bootcampForm.courseId
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">No linked course</p>
                            <p className="text-sm text-gray-500">Leave this bootcamp standalone.</p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Optional</span>
                        </div>
                      </button>

                      {courseSelectionGroups.map(({ course, learningPaths }) => {
                        const isSelectedFullCourse = bootcampForm.courseId === course.course_id && bootcampForm.pathId === null
                        const isSelectedCoursePath = bootcampForm.courseId === course.course_id && bootcampForm.pathId !== null

                        return (
                          <details
                            key={course.course_id}
                            open={isSelectedFullCourse || isSelectedCoursePath}
                            className={`group rounded-xl border transition ${
                              isSelectedFullCourse || isSelectedCoursePath
                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">{course.title}</p>
                                <p className="text-sm text-gray-500">
                                  {course.difficulty_level} • {learningPaths.length} learning path{learningPaths.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelectedFullCourse ? (
                                  <Badge className="border-0 bg-blue-600 text-white">Full course</Badge>
                                ) : isSelectedCoursePath ? (
                                  <Badge className="border-0 bg-indigo-600 text-white">Path selected</Badge>
                                ) : null}
                                <span className="text-xs font-medium text-gray-500 group-open:hidden">View paths</span>
                                <span className="text-xs font-medium text-gray-500 hidden group-open:inline">Hide paths</span>
                              </div>
                            </summary>

                            <div className="border-t border-gray-200 px-4 py-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Link the entire course</p>
                                  <p className="text-sm text-gray-500">All paths stay available and students are linked to the course as a whole.</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="bg-transparent"
                                  onClick={() => handleSelectBootcampCourse(course.course_id)}
                                >
                                  Select full course
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Learning paths</p>
                                {learningPaths.length > 0 ? (
                                  learningPaths.map((path) => {
                                    const isSelectedPath = bootcampForm.courseId === course.course_id && bootcampForm.pathId === path.path_id

                                    return (
                                      <button
                                        key={path.path_id}
                                        type="button"
                                        onClick={() => handleSelectBootcampPath(course.course_id, path.path_id)}
                                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                                          isSelectedPath
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-gray-200 bg-white hover:border-indigo-300"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="font-medium text-gray-900">{path.title}</p>
                                            <p className="text-sm text-gray-500">
                                              {path.is_default ? "Default path" : "Custom path"}
                                              {path.min_skill_level || path.max_skill_level ? (
                                                <span>
                                                  {" "}
                                                  • {path.min_skill_level || "Any"}
                                                  {path.max_skill_level ? ` to ${path.max_skill_level}` : ""}
                                                </span>
                                              ) : null}
                                            </p>
                                          </div>
                                          {isSelectedPath ? <Badge className="border-0 bg-indigo-600 text-white">Selected</Badge> : null}
                                        </div>
                                      </button>
                                    )
                                  })
                                ) : (
                                  <div className="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
                                    This course has no learning paths yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          </details>
                        )
                      })}
                    </div>
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
                    {selectedBootcampData.status === "published" && selectedBootcampData.early_bird_deadline && new Date(selectedBootcampData.early_bird_deadline) > new Date() && (
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
