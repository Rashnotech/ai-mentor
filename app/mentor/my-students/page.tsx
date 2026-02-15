"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<MentorStudentInfo | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [studentProjects, setStudentProjects] = useState<StudentProjectSubmission[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

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
    try {
      const projects = await courseAdminApi.getStudentProjects(student.id, student.course_id)
      setStudentProjects(projects)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Students</h2>
          <p className="text-gray-500 text-sm">View and manage students enrolled in your courses</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="overflow-x-auto">
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
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

            <div className="p-6 border-t border-gray-100 flex justify-between">
              <div className="flex gap-2">
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
              <Button variant="ghost" onClick={() => setShowStudentModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
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
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMessageModal(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Projects Modal */}
      {showProjectsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {selectedStudent.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedStudent.name}&apos;s Projects</h3>
                    <p className="text-sm text-gray-500">{selectedStudent.course_title}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowProjectsModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-500">Loading projects...</span>
                </div>
              ) : studentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No project submissions yet</p>
                  <p className="text-sm text-gray-400 mt-1">This student hasn&apos;t submitted any projects for review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentProjects.map((project) => (
                    <div
                      key={project.submission_id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{project.project_title}</h4>
                            {getStatusBadge(project.status)}
                            {getDeadlineBadge(project.deadline_status)}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            <span className="font-medium">Module:</span> {project.module_title}
                          </p>
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Submitted: {formatDate(project.submitted_at)}
                            </span>
                            {project.reviewed_at && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Reviewed: {formatDate(project.reviewed_at)}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-medium text-blue-600">
                              {project.points_earned} points
                            </span>
                          </div>
                          {project.reviewer_feedback && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-1">Feedback:</p>
                              <p className="text-sm text-gray-600">{project.reviewer_feedback}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <a
                            href={project.solution_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Code
                          </a>
                          {project.status === "submitted" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  // TODO: Implement approve API call
                                  alert(`Approving project: ${project.project_title}`)
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  // TODO: Implement reject API call
                                  alert(`Requesting revision for: ${project.project_title}`)
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Request Revision
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end shrink-0">
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
