"use client"

import { useState, useEffect } from "react"
import {
  Folder,
  BookOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Code2,
  Layers,
  ArrowRight,
  MessageSquare,
} from "lucide-react"
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

  // Map status to solid display format
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "approved":
        return {
          label: "Completed",
          badgeClass: "bg-[#16A34A] text-white",
          iconBoxClass: "bg-[#DCFCE7] text-[#15803D]",
          icon: CheckCircle2,
        }
      case "submitted":
        return {
          label: "Submitted",
          badgeClass: "bg-[#D97706] text-white",
          iconBoxClass: "bg-[#FEF3C7] text-[#B45309]",
          icon: Clock,
        }
      case "in_progress":
        return {
          label: "In Progress",
          badgeClass: "bg-[#2563EB] text-white",
          iconBoxClass: "bg-[#EBF2FF] text-[#2563EB]",
          icon: Clock,
        }
      case "rejected":
        return {
          label: "Needs Revision",
          badgeClass: "bg-[#DC2626] text-white",
          iconBoxClass: "bg-[#FEE2E2] text-[#B91C1C]",
          icon: XCircle,
        }
      default:
        return {
          label: "Not Started",
          badgeClass: "bg-gray-200 text-gray-700",
          iconBoxClass: "bg-[#F4F5F7] text-gray-600",
          icon: Code2,
        }
    }
  }

  // Filter projects
  const filteredProjects =
    filterStatus === "all"
      ? projects
      : projects.filter((p) => {
          if (filterStatus === "completed") return p.status === "approved"
          if (filterStatus === "in_progress")
            return p.status === "in_progress" || p.status === "submitted"
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

  const filterTabs = [
    { id: "all", label: "All Projects" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "not_started", label: "Not Started" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
          <p className="text-sm text-gray-500 mt-1">
            Hands-on portfolio projects from your enrolled courses
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchProjects}
          disabled={isLoading}
          className="text-gray-600 hover:text-gray-900 rounded-xl border-gray-200"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Three Solid Color Project Stat Cards */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#2563EB] text-white shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-100 mb-1">Total Projects</div>
              <div className="text-4xl font-bold tracking-tight">{totalCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#1D4ED8] flex items-center justify-center shrink-0">
              <Code2 className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#EA580C] text-white shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-orange-100 mb-1">In Progress</div>
              <div className="text-4xl font-bold tracking-tight">{inProgressCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#C2410C] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#16A34A] text-white shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-100 mb-1">Completed</div>
              <div className="text-4xl font-bold tracking-tight">{completedCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#15803D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Pill Bar */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => {
            const active = filterStatus === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.id)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-[#2563EB] text-white"
                    : "bg-[#F4F5F7] text-gray-600 hover:bg-gray-200/80"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
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
        <div className="flex flex-col items-center justify-center py-16 bg-[#F8F9FA] rounded-2xl border border-gray-200">
          <Folder className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-700 font-semibold mb-1">No projects available</p>
          <p className="text-gray-400 text-sm text-center max-w-md">
            Projects will appear here once you enroll in a course that has hands-on projects.
          </p>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && projects.length > 0 && (
        <>
          {paginatedProjects.length === 0 ? (
            <div className="p-10 text-center border border-gray-200 rounded-2xl bg-[#F8F9FA]">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium text-sm">
                No projects found matching your filter.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {paginatedProjects.map((project) => {
                const statusInfo = getStatusDisplay(project.status)
                const StatusIcon = statusInfo.icon

                return (
                  <Link
                    key={project.project_id}
                    href={`/dashboard/courses/${project.course_slug}/learn`}
                    className="group rounded-2xl border border-gray-200 bg-white p-6 hover:border-[#4E89FF] hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header: Icon + Course/Module Breadcrumb + Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${statusInfo.iconBoxClass}`}
                          >
                            <Code2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1 truncate">
                              <BookOpen className="w-3.5 h-3.5 shrink-0" />
                              {project.course_title}
                            </span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                              <Layers className="w-3 h-3 shrink-0" />
                              {project.module_title}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 ${statusInfo.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Project Title & Description */}
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-[#2563EB] transition-colors line-clamp-1">
                        {project.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>

                      {/* Skills Tags */}
                      {project.required_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {project.required_skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="text-[11px] font-medium px-2.5 py-1 bg-[#F4F5F7] text-gray-700 rounded-lg"
                            >
                              {skill}
                            </span>
                          ))}
                          {project.required_skills.length > 4 && (
                            <span className="text-[11px] font-medium px-2.5 py-1 bg-[#F4F5F7] text-gray-500 rounded-lg">
                              +{project.required_skills.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Micro-Milestones Progress Bar */}
                      {(() => {
                        const totalMilestones = project.milestones?.length ?? 3
                        const checkedCount = project.completed_milestones?.length ?? 0
                        const pct = totalMilestones > 0 ? Math.round((checkedCount / totalMilestones) * 100) : 0
                        const allChecked = totalMilestones > 0 && checkedCount >= totalMilestones
                        return (
                          <div className="mb-4 rounded-xl border border-gray-100 bg-[#F8FAFC] p-3">
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                              <span className="text-gray-700">Project Milestones</span>
                              <span className={allChecked ? "text-[#16A34A]" : "text-[#2563EB]"}>
                                {checkedCount} of {totalMilestones} milestones checked
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  allChecked ? "bg-[#16A34A]" : "bg-[#2563EB]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Reviewer Feedback Box */}
                      {project.reviewer_feedback && (
                        <div className="mb-4 p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="line-clamp-2">
                            <span className="font-bold">Mentor Feedback: </span>
                            {project.reviewer_feedback}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Action Bar */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        {project.estimated_hours ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>~{project.estimated_hours}h estimated</span>
                          </>
                        ) : (
                          <span>Hands-on Project</span>
                        )}
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] group-hover:bg-[#1D4ED8] rounded-xl transition-colors">
                        {project.status === "not_started" ? "Start Project" : "Open Project"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Showing {startIndex + 1}-
                {Math.min(startIndex + projectsPerPage, filteredProjects.length)} of{" "}
                {filteredProjects.length} projects
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 rounded-xl"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`px-3 rounded-xl ${
                      currentPage === page ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white" : ""
                    }`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
