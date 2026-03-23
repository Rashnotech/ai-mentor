"use client"

import { useState, useEffect } from "react"
import { Folder, BookOpen, ExternalLink, Loader2, RefreshCw, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { toast } from "sonner"
import { studentCoursesApi, type StudentProjectResponse } from "@/lib/api"

export function ProjectsView() {
  const [projects, setProjects] = useState<StudentProjectResponse[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const projectsPerPage = 4

  const fetchProjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await studentCoursesApi.getMyProjects()
      setProjects(data.projects)
      setTotalCount(data.total_count)
      setCompletedCount(data.completed_count)
      setInProgressCount(data.in_progress_count)
    } catch (err) {
      console.error("Failed to fetch projects:", err)
      setError("Failed to load projects. Please try again.")
      toast.error("Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // Map status to display format
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 }
      case "submitted":
        return { label: "Submitted", color: "bg-yellow-100 text-yellow-700", icon: Clock }
      case "in_progress":
        return { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock }
      case "rejected":
        return { label: "Needs Revision", color: "bg-red-100 text-red-700", icon: XCircle }
      default:
        return { label: "Not Started", color: "bg-gray-100 text-gray-600", icon: Folder }
    }
  }

  // Filter projects
  const filteredProjects = filterStatus === "all" 
    ? projects 
    : projects.filter((p) => {
        if (filterStatus === "completed") return p.status === "approved"
        if (filterStatus === "in_progress") return p.status === "in_progress" || p.status === "submitted"
        if (filterStatus === "not_started") return p.status === "not_started"
        return true
      })

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage)
  const startIndex = (currentPage - 1) * projectsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + projectsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
          <p className="text-sm text-gray-500 mt-1">Hands-on projects from your enrolled courses</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchProjects}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{totalCount}</div>
            <div className="text-sm text-blue-600">Total Projects</div>
          </div>
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
            <div className="text-2xl font-bold text-orange-700">{inProgressCount}</div>
            <div className="text-sm text-orange-600">In Progress</div>
          </div>
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{completedCount}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
        </div>
      )}

      {/* Filter */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentPage(1)
            }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="not_started">Not Started</option>
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading projects...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchProjects} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <Folder className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-600 mb-2">No projects available</p>
          <p className="text-gray-400 text-sm text-center max-w-md">
            Projects will appear here once you enroll in a course that has hands-on projects.
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && projects.length > 0 && (
        <>
          <div className="grid gap-4 mb-6">
            {paginatedProjects.length === 0 ? (
              <div className="p-8 text-center border border-gray-200 rounded-xl bg-white">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No projects found matching your filter.</p>
              </div>
            ) : (
              paginatedProjects.map((project) => {
                const statusInfo = getStatusDisplay(project.status)
                const StatusIcon = statusInfo.icon
                
                return (
                  <Link
                    key={project.project_id}
                    href={`/courses/${project.course_slug}/learn`}
                    className="block p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                            {project.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                        
                        <div className="flex gap-2 mb-3">
                          {project.required_skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-100">
                              {skill}
                            </span>
                          ))}
                          {project.required_skills.length > 4 && (
                            <span className="text-xs px-2 py-1 bg-gray-50 text-gray-400 rounded">
                              +{project.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {project.estimated_hours && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {project.estimated_hours}h estimated
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{project.course_title}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            Module: {project.module_title}
                          </span>
                        </div>
                        
                        {project.reviewer_feedback && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800">
                            <strong>Feedback:</strong> {project.reviewer_feedback}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                          {project.status === "not_started" ? "Start Project" : "Continue"}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + projectsPerPage, filteredProjects.length)} of{" "}
                {filteredProjects.length} projects
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`px-3 ${currentPage === page ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Info hint */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Project Exercises</h4>
            <p className="text-sm text-blue-700">
              Projects are hands-on exercises from your enrolled courses. Click on any project to navigate directly to the course
              where you can continue working on it with AI-powered assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
