"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useQuery } from "@tanstack/react-query"
import { courseAdminApi, MentorStudentInfo, StudentProjectSubmission } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  Users,
  BookOpen,
  Search,
  Eye,
  MessageSquare,
  Clock,
  Target,
  Activity,
  FileText,
  Send,
  X,
  AlertCircle,
  FolderOpen,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"

export default function MyStudentsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<MentorStudentInfo | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [studentProjects, setStudentProjects] = useState<StudentProjectSubmission[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null)
  const [reviewFeedback, setReviewFeedback] = useState<Record<number, string>>({})
  const [reviewPoints, setReviewPoints] = useState<Record<number, number>>({})
  const [reviewStatus, setReviewStatus] = useState<Record<number, "approved" | "needs_revision" | "rejected">>({})
  const [submittingReviewId, setSubmittingReviewId] = useState<number | null>(null)

  // Fetch students from API (only students enrolled in mentor's courses)
  const { data: studentsData, isLoading, error } = useQuery({
    queryKey: ["mentor-students", searchQuery, courseFilter, user?.id],
    queryFn: () => courseAdminApi.getMentorStudents({
      search: searchQuery || undefined,
      course_id: courseFilter !== "all" ? parseInt(courseFilter) : undefined,
      mentor_id: user?.id, // Filter to only show students enrolled in courses created by this mentor
      limit: 100
    }),
    enabled: !!user?.id,
    staleTime: 30000,
  })

  const students = studentsData?.students || []
  const courses = studentsData?.courses || []
  const totalStudents = studentsData?.total || 0

  const handleViewStudent = (student: MentorStudentInfo) => {
    setSelectedStudent(student)
    setShowStudentModal(true)
  }

  const handleOpenMessage = (student: MentorStudentInfo) => {
    setSelectedStudent(student)
    setMessageText("")
    setShowMessageModal(true)
  }

  const handleViewProjects = async (student: MentorStudentInfo) => {
    setSelectedStudent(student)
    setIsLoadingProjects(true)
    setShowProjectsModal(true)
    setStudentProjects([])
    try {
      const projects = await courseAdminApi.getStudentProjects(student.id, student.course_id)
      setStudentProjects(projects)
      // initialize review inputs from existing data
      const fbMap: Record<number, string> = {}
      const ptsMap: Record<number, number> = {}
      const statusMap: Record<number, "approved" | "needs_revision" | "rejected"> = {}
      projects.forEach((p) => {
        fbMap[p.project_id] = p.reviewer_feedback || ""
        ptsMap[p.project_id] = p.points_earned ?? 0
        // Map backend status to review status selector values
        if (p.status === "approved") statusMap[p.project_id] = "approved"
        else if (p.status === "rejected") statusMap[p.project_id] = "rejected"
        else statusMap[p.project_id] = "needs_revision" // default for submitted
      })
      setReviewFeedback(fbMap)
      setReviewPoints(ptsMap)
      setReviewStatus(statusMap)
    } catch (error) {
      console.error("Error fetching student projects:", error)
      setStudentProjects([])
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const handleSendMessage = () => {
    if (messageText.trim() && selectedStudent) {
      alert(`Message sent to ${selectedStudent.name}!`)
      setShowMessageModal(false)
      setMessageText("")
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      submitted: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending Review" },
      approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
      rejected: { bg: "bg-red-100", text: "text-red-700", label: "Needs Revision" },
    }
    const config = statusConfig[status] || statusConfig.submitted
    return <Badge className={`${config.bg} ${config.text} border-0`}>{config.label}</Badge>
  }

  const getDeadlineBadge = (deadlineStatus: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      on_time: { bg: "bg-green-100", text: "text-green-700", label: "On Time (100%)" },
      late_50: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Late (50%)" },
      late_25: { bg: "bg-orange-100", text: "text-orange-700", label: "Late (25%)" },
    }
    const c = config[deadlineStatus] || config.on_time
    return <Badge className={`${c.bg} ${c.text} border-0 text-xs`}>{c.label}</Badge>
  }

  const getSkillLevelBadge = (level: string | null) => {
    if (!level) return <Badge className="bg-gray-100 text-gray-700 border-0">Unknown</Badge>
    const colors: Record<string, string> = {
      beginner: "bg-gray-100 text-gray-700 border-0",
      intermediate: "bg-blue-100 text-blue-700 border-0",
      advanced: "bg-green-100 text-green-700 border-0",
    }
    return <Badge className={colors[level.toLowerCase()] || "bg-gray-100 text-gray-700 border-0"}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return "N/A"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">My Students</h2>
          <p className="text-sm text-gray-500">View and manage students enrolled in your courses</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.course_id} value={course.course_id.toString()}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {students.filter(s => s.skill_level?.toLowerCase() === "advanced").length}
            </p>
            <p className="text-sm text-gray-500">Advanced Level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
            <p className="text-sm text-gray-500">Active Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">
              {students.filter(s => s.last_active_at && new Date(s.last_active_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </p>
            <p className="text-sm text-gray-500">Active This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Students List</CardTitle>
          <CardDescription>
            {students.length} of {totalStudents} students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-500">Loading students...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <p className="text-red-500">Error loading students. Please try again.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 sm:hidden">
                {students.map((student) => (
                  <div key={student.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-lg font-semibold text-white">
                        {student.name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{student.name || "Unknown"}</p>
                        <p className="truncate text-xs text-gray-500">{student.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getSkillLevelBadge(student.skill_level)}
                          <Badge variant="outline" className="border-gray-200 text-gray-600">
                            {student.course_title}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Enrolled</p>
                        <p className="mt-1 font-medium text-gray-900">{formatDate(student.enrolled_at)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Last Active</p>
                        <p className="mt-1 font-medium text-gray-900">{formatDate(student.last_active_at)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewStudent(student)}
                        title="View Details"
                        className="w-full"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMessage(student)}
                        title="Send Message"
                        className="w-full"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleViewProjects(student)}
                        title="View Projects"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Level</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Course</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Enrolled</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Last Active</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {student.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{student.name || "Unknown"}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getSkillLevelBadge(student.skill_level)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-900">{student.course_title}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(student.enrolled_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(student.last_active_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewStudent(student)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenMessage(student)}
                            title="Send Message"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleViewProjects(student)}
                            title="View Projects"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
          {!isLoading && !error && students.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No students found</p>
              <p className="text-sm text-gray-400 mt-1">Students who enroll in your courses will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Student Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedStudent.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name || "Unknown"}</h2>
                    <p className="text-gray-500">{selectedStudent.email}</p>
                    {getSkillLevelBadge(selectedStudent.skill_level)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowStudentModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Student Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{selectedStudent.course_title}</p>
                  <p className="text-xs text-gray-500">Enrolled Course</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <Target className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{selectedStudent.skill_level || "N/A"}</p>
                  <p className="text-xs text-gray-500">Skill Level</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <Clock className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedStudent.enrolled_at)}</p>
                  <p className="text-xs text-gray-500">Enrolled</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <Activity className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedStudent.last_active_at)}</p>
                  <p className="text-xs text-gray-500">Last Active</p>
                </div>
              </div>

              {/* Learning Mode */}
              {selectedStudent.learning_mode && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Learning Preferences</h3>
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedStudent.learning_mode}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowStudentModal(false)
                    handleOpenMessage(selectedStudent)
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowStudentModal(false)
                    handleViewProjects(selectedStudent)
                  }}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  View Projects
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setShowStudentModal(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl bg-white sm:rounded-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {selectedStudent.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Message {selectedStudent.name}</h3>
                    <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowMessageModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Enter message subject..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button className="flex items-center gap-1 hover:text-blue-600">
                  <FileText className="w-4 h-4" />
                  Attach File
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowMessageModal(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                type="button"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Projects Modal - Mobile-first Review System */}
      {showProjectsModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-gray-50 sm:max-h-[90vh] sm:max-w-5xl sm:rounded-2xl">
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">Project Submissions</h3>
                  <p className="truncate text-sm text-gray-600">{selectedStudent.name} · {selectedStudent.course_title}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProjectsModal(false)} className="shrink-0">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-16 sm:py-20">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600 mb-3" />
                    <p className="text-gray-600 font-medium">Loading projects...</p>
                  </div>
                </div>
              ) : studentProjects.length === 0 ? (
                <div className="flex items-center justify-center py-16 sm:py-20 px-4">
                  <div className="text-center">
                    <FolderOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-600 font-medium">No project submissions yet</p>
                    <p className="text-sm text-gray-500 mt-1">This student hasn't submitted any projects for review</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 sm:p-6">
                  {studentProjects
                    .filter((p) => p.status === "submitted")
                    .map((project) => (
                      <div key={project.project_id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Project Card Header */}
                        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100">
                          <div className="flex flex-col gap-3">
                            <div>
                              <h4 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{project.project_title}</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getStatusBadge(project.status)}
                              {getDeadlineBadge(project.deadline_status)}
                            </div>
                          </div>
                        </div>

                        {/* Project Details */}
                        <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-3 border-b border-gray-100 bg-gray-50">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Module</p>
                              <p className="text-gray-900 font-medium">{project.module_title}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submitted</p>
                              <p className="text-gray-900 font-medium">{formatDate(project.submitted_at)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Points</p>
                              <p className="text-lg font-bold text-blue-600">{project.points_earned}</p>
                            </div>
                          </div>
                          
                          {/* Submission Link */}
                          <div>
                            {project.submission_url ? (
                              <a href={project.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                                <ExternalLink className="w-4 h-4" />
                                Open Submission
                              </a>
                            ) : (
                              <button disabled className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed">
                                <ExternalLink className="w-4 h-4" />
                                No Submission URL
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Project Description */}
                        {project.description && (
                          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-white">
                            <button onClick={() => setExpandedProjectId(expandedProjectId === project.project_id ? null : project.project_id)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                              <span>{expandedProjectId === project.project_id ? "−" : "+"} Project Description</span>
                            </button>
                            {expandedProjectId === project.project_id && (
                              <div className="mt-4 prose prose-sm max-w-none text-gray-700 bg-gray-50 -mx-4 -mb-4 p-4 sm:-mx-6 sm:-mb-5 sm:p-6">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mentor Review Section */}
                        <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 bg-white">
                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">Review Status</label>
                            <select value={reviewStatus[project.project_id] || "needs_revision"} onChange={(e) => setReviewStatus({ ...reviewStatus, [project.project_id]: e.target.value as "approved" | "needs_revision" | "rejected" })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              <option value="needs_revision">Needs Revision</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">Feedback</label>
                            <textarea value={reviewFeedback[project.project_id] || ""} onChange={(e) => setReviewFeedback({ ...reviewFeedback, [project.project_id]: e.target.value })} placeholder="Provide constructive feedback for the student..." rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                            <p className="text-xs text-gray-500 mt-1">{reviewFeedback[project.project_id]?.length || 0}/2000 characters</p>
                          </div>

                          {/* Review Actions */}
                          <div className="flex gap-3 pt-2">
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={async () => {
                              const status = reviewStatus[project.project_id] || "needs_revision"
                              const fb = reviewFeedback[project.project_id] || ""
                              setSubmittingReviewId(project.project_id)
                              try {
                                if (status === "approved") {
                                  const res = await courseAdminApi.approveProjectSubmission(Number(project.project_id), fb)
                                  setStudentProjects((prev) => prev.map((p) => p.project_id === project.project_id ? { ...p, status: res.status, is_approved: res.is_approved, points_earned: res.points_earned ?? p.points_earned, reviewer_feedback: fb, reviewed_at: res.reviewed_at } : p))
                                } else {
                                  const res = await courseAdminApi.rejectProjectSubmission(Number(project.project_id), fb)
                                  setStudentProjects((prev) => prev.map((p) => p.project_id === project.project_id ? { ...p, status: res.status, is_approved: res.is_approved, points_earned: res.points_earned ?? p.points_earned, reviewer_feedback: res.reviewer_feedback, reviewed_at: res.reviewed_at } : p))
                                }
                              } catch (err) {
                                console.error("Review error:", err)
                                alert("Failed to submit review. Please try again.")
                              } finally {
                                setSubmittingReviewId(null)
                              }
                            }} disabled={submittingReviewId === project.project_id}>
                              {submittingReviewId === project.project_id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Submit Review
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowProjectsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
