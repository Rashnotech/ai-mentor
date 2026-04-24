"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  internshipAdminApi,
  type InternshipApplicationAdminResponse,
  getApiErrorMessage,
} from "@/lib/api"

export default function InternshipsManagementView() {
  const queryClient = useQueryClient()
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [verificationFilter, setVerificationFilter] = useState<string>("all")
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 20
  
  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<InternshipApplicationAdminResponse | null>(null)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [adminNotes, setAdminNotes] = useState("")

  // ============================================================================
  // API QUERIES & MUTATIONS
  // ============================================================================

  const {
    data: applicationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "internships", searchQuery, statusFilter, verificationFilter, page],
    queryFn: () =>
      internshipAdminApi.listApplications({
        search: searchQuery || undefined,
        status_filter: statusFilter === "all" ? undefined : statusFilter,
        verification_status: verificationFilter === "all" ? undefined : verificationFilter,
        limit,
        offset: page * limit,
      }),
    staleTime: 30000,
  })

  const applications = applicationsData?.applications || []
  const totalApplications = applicationsData?.total || 0
  const totalPages = Math.ceil(totalApplications / limit)

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (applicationId: number) =>
      internshipAdminApi.approveApplication(applicationId, { admin_notes: adminNotes || undefined }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "internships"] })
      toast.success("Application approved!", {
        description: `${data.first_name} ${data.last_name} has been approved. Acceptance email sent.`,
      })
      handleCloseReviewModal()
    },
    onError: (error) => {
      toast.error("Failed to approve application", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (applicationId: number) =>
      internshipAdminApi.rejectApplication(applicationId, {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "internships"] })
      toast.success("Application rejected", {
        description: `${data.first_name} ${data.last_name} has been notified of the decision.`,
      })
      handleCloseReviewModal()
    },
    onError: (error) => {
      toast.error("Failed to reject application", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (applicationId: number) => internshipAdminApi.deleteApplication(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "internships"] })
      toast.success("Application deleted successfully")
      setShowDeleteModal(false)
      setSelectedApplication(null)
    },
    onError: (error) => {
      toast.error("Failed to delete application", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleReview = (application: InternshipApplicationAdminResponse) => {
    setSelectedApplication(application)
    setReviewAction(null)
    setRejectionReason("")
    setAdminNotes(application.admin_notes || "")
    setShowReviewModal(true)
  }

  const handleCloseReviewModal = () => {
    setShowReviewModal(false)
    setSelectedApplication(null)
    setReviewAction(null)
    setRejectionReason("")
    setAdminNotes("")
  }

  const handleDelete = (application: InternshipApplicationAdminResponse) => {
    setSelectedApplication(application)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = () => {
    if (!selectedApplication) return
    deleteMutation.mutate(selectedApplication.application_id)
  }

  const handleCloseDeleteModal = () => {
    if (deleteMutation.isPending) return
    setShowDeleteModal(false)
    setSelectedApplication(null)
  }

  const handleApprove = () => {
    if (!selectedApplication) return
    approveMutation.mutate(selectedApplication.application_id)
  }

  const handleReject = () => {
    if (!selectedApplication) return
    if (!rejectionReason.trim() || rejectionReason.length < 10) {
      toast.error("Please provide a rejection reason (minimum 10 characters)")
      return
    }
    rejectMutation.mutate(selectedApplication.application_id)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(0)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(0)
  }

  const handleVerificationFilterChange = (value: string) => {
    setVerificationFilter(value)
    setPage(0)
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
      submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700" },
      under_review: { label: "Under Review", className: "bg-yellow-100 text-yellow-700" },
      approved: { label: "Approved", className: "bg-green-100 text-green-700" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    }
    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge className={`${config.className} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const getVerificationBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
      verified: { label: "Verified", className: "bg-green-100 text-green-700" },
      rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge className={`${config.className} border-0 text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTrack = (track?: string) => {
    if (!track) return "Not selected"
    return track.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Internship Applications</h1>
        <p className="text-gray-600 mt-2">Review and manage internship applications from candidates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalApplications}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {applications.filter((a) => a.status === "submitted").length}
              </p>
            </div>
            <Loader2 className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {applications.filter((a) => a.status === "approved").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {applications.filter((a) => a.status === "rejected").length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or track..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-full lg:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Verification Filter */}
          <Select value={verificationFilter} onValueChange={handleVerificationFilterChange}>
            <SelectTrigger className="w-full lg:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verification</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading applications...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <XCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-medium">Failed to load applications</p>
            <p className="text-sm text-gray-600 mt-1">{getApiErrorMessage(error)}</p>
            <Button onClick={() => refetch()} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">No applications found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.application_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {application.first_name} {application.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{application.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{formatTrack(application.selected_track)}</p>
                        <p className="text-xs text-gray-500">{application.institution_type}</p>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(application.status)}</td>
                      <td className="px-6 py-4">{getVerificationBadge(application.verification_status)}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{formatDate(application.submitted_at)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleReview(application)}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </Button>
                          <Button
                            onClick={() => handleDelete(application)}
                            size="sm"
                            variant="outline"
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalApplications)} of{" "}
                  {totalApplications} applications
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Review Application</DialogTitle>
            <DialogDescription>
              Review the candidate's application details and take action
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Full Name</p>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedApplication.first_name} {selectedApplication.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="text-sm text-gray-900 mt-1">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </p>
                    <p className="text-sm text-gray-900 mt-1">{selectedApplication.telephone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedApplication.state}, {selectedApplication.country}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> Institution
                    </p>
                    <p className="text-sm text-gray-900 mt-1 capitalize">{selectedApplication.institution_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Submitted
                    </p>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(selectedApplication.submitted_at)}</p>
                  </div>
                </div>
              </div>

              {/* Track Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Track</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="font-medium text-blue-900">{formatTrack(selectedApplication.selected_track)}</p>
                  {selectedApplication.course_title ? (
                    <p className="text-sm text-blue-700 mt-1">Course: {selectedApplication.course_title}</p>
                  ) : selectedApplication.course_id ? (
                    <p className="text-sm text-blue-700 mt-1">Course: #{selectedApplication.course_id}</p>
                  ) : null}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Verification Documents</h3>
                <div className="space-y-2">
                  {selectedApplication.it_letter_url && (
                    <a
                      href={selectedApplication.it_letter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      IT Letter
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedApplication.admission_letter_url && (
                    <a
                      href={selectedApplication.admission_letter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      Admission Letter
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedApplication.id_card_url && (
                    <a
                      href={selectedApplication.id_card_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      ID Card ({selectedApplication.id_type})
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!selectedApplication.it_letter_url &&
                    !selectedApplication.admission_letter_url &&
                    !selectedApplication.id_card_url && (
                      <p className="text-sm text-gray-500">No documents uploaded yet</p>
                    )}
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Application Status</p>
                  {getStatusBadge(selectedApplication.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-2">Verification Status</p>
                  {getVerificationBadge(selectedApplication.verification_status)}
                </div>
              </div>

              {/* Action Selection */}
              {selectedApplication.status !== "approved" && selectedApplication.status !== "rejected" && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Take Action</h3>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setReviewAction("approve")}
                      variant={reviewAction === "approve" ? "default" : "outline"}
                      className={`flex-1 ${reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setReviewAction("reject")}
                      variant={reviewAction === "reject" ? "default" : "outline"}
                      className={`flex-1 ${reviewAction === "reject" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {reviewAction === "reject" && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear reason for rejection (minimum 10 characters). This will be sent to the candidate."
                    rows={4}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {rejectionReason.length} / 10 characters minimum
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Admin Notes <span className="text-gray-500">(Optional, internal only)</span>
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this application..."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Existing Notes */}
              {selectedApplication.verification_notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Previous Verification Notes</h3>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                    {selectedApplication.verification_notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button onClick={handleCloseReviewModal} variant="outline" disabled={approveMutation.isPending || rejectMutation.isPending}>
              Cancel
            </Button>
            {reviewAction === "approve" && (
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Approval
                  </>
                )}
              </Button>
            )}
            {reviewAction === "reject" && (
              <Button
                onClick={handleReject}
                disabled={rejectMutation.isPending || rejectionReason.length < 10}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => !open && handleCloseDeleteModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently remove this internship registration.
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="py-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Candidate:</span> {selectedApplication.first_name} {selectedApplication.last_name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {selectedApplication.email}
              </p>
              <p>
                <span className="font-semibold">Application ID:</span> #{selectedApplication.application_id}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              onClick={handleCloseDeleteModal}
              variant="outline"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
