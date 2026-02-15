"use client"

import { useState, use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown,
  ExternalLink,
  Link2,
  Check,
  AlertCircle,
  BookOpen,
  Code2,
  Loader2,
  LogOut,
  User,
  LayoutDashboard,
  Clock,
  Video,
  FileCode2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { studentCoursesApi, type LearningContentResponse, type ModuleContent, type LessonContent, type ProjectContent } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useUserStore } from "@/lib/stores/user-store"

// ============================================
// USER AVATAR DROPDOWN COMPONENT
// ============================================

function UserAvatarDropdown() {
  const [showMenu, setShowMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()
  const user = useUserStore((state) => state.user)

  const userInitials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setShowMenu(false)
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to logout. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-all"
      >
        {userInitials}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm text-gray-900">{user?.full_name || "User"}</p>
              <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setShowMenu(false)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={() => setShowMenu(false)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3"
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 border-t border-gray-100 mt-1 pt-2 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// LESSON CARD COMPONENT
// ============================================

interface LessonCardProps {
  lesson: LessonContent
  isActive: boolean
  onSelect: () => void
}

function LessonCard({ lesson, isActive, onSelect }: LessonCardProps) {
  const getContentIcon = () => {
    switch (lesson.content_type?.toLowerCase()) {
      case "video":
        return <Video className="w-5 h-5" />
      case "article":
      case "text":
        return <FileText className="w-5 h-5" />
      case "code":
      case "exercise":
        return <FileCode2 className="w-5 h-5" />
      default:
        return <BookOpen className="w-5 h-5" />
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "border-blue-300 bg-blue-50 shadow-sm"
          : lesson.is_completed
          ? "border-green-200 bg-green-50/50"
          : "border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            lesson.is_completed
              ? "bg-green-100 text-green-600"
              : isActive
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {lesson.is_completed ? <CheckCircle2 className="w-5 h-5" /> : getContentIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${lesson.is_completed ? "text-green-700" : "text-gray-900"}`}>
            {lesson.title}
          </h4>
          {lesson.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{lesson.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {lesson.content_type && (
              <span className="capitalize">{lesson.content_type}</span>
            )}
            {lesson.estimated_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.estimated_minutes} min
              </span>
            )}
          </div>
        </div>
        {isActive && <ArrowRight className="w-5 h-5 text-blue-500 shrink-0" />}
      </div>
    </div>
  )
}

// ============================================
// PROJECT CARD COMPONENT
// ============================================

interface ProjectCardProps {
  project: ProjectContent
  isActive: boolean
  onSelect: () => void
}

function ProjectCard({ project, isActive, onSelect }: ProjectCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "border-purple-300 bg-purple-50 shadow-sm"
          : project.is_completed
          ? "border-green-200 bg-green-50/50"
          : "border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            project.is_completed
              ? "bg-green-100 text-green-600"
              : isActive
              ? "bg-purple-100 text-purple-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {project.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              Project
            </span>
            {project.is_completed && (
              <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded">
                Completed
              </span>
            )}
          </div>
          <h4 className={`font-semibold mt-1 ${project.is_completed ? "text-green-700" : "text-gray-900"}`}>
            {project.title}
          </h4>
          {project.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {project.estimated_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{project.estimated_hours}h
              </span>
            )}
            {project.starter_repo_url && (
              <a
                href={project.starter_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-500 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Starter Code
              </a>
            )}
          </div>
        </div>
        {isActive && <ArrowRight className="w-5 h-5 text-purple-500 shrink-0" />}
      </div>
    </div>
  )
}

// ============================================
// MODULE ACCORDION COMPONENT
// ============================================

interface ModuleAccordionProps {
  module: ModuleContent
  isExpanded: boolean
  onToggle: () => void
  activeItemId: string | null
  onSelectItem: (id: string, type: "lesson" | "project") => void
}

function ModuleAccordion({ module, isExpanded, onToggle, activeItemId, onSelectItem }: ModuleAccordionProps) {
  const totalItems = module.lessons.length + module.projects.length
  const completedItems = module.lessons.filter(l => l.is_completed).length + 
                         module.projects.filter(p => p.is_completed).length

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            module.progress_percent === 100 ? "bg-green-100" : "bg-blue-100"
          }`}>
            {module.progress_percent === 100 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <span className="text-sm font-bold text-blue-600">{module.order}</span>
            )}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{module.title}</h3>
            <p className="text-sm text-gray-500">
              {completedItems}/{totalItems} completed • {module.progress_percent}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${module.progress_percent}%` }}
            />
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-gray-100">
          {module.description && (
            <p className="text-sm text-gray-600 px-1 py-2">{module.description}</p>
          )}
          
          {module.lessons.map((lesson) => (
            <LessonCard
              key={`lesson-${lesson.lesson_id}`}
              lesson={lesson}
              isActive={activeItemId === `lesson-${lesson.lesson_id}`}
              onSelect={() => onSelectItem(`lesson-${lesson.lesson_id}`, "lesson")}
            />
          ))}

          {module.projects.map((project) => (
            <ProjectCard
              key={`project-${project.project_id}`}
              project={project}
              isActive={activeItemId === `project-${project.project_id}`}
              onSelect={() => onSelectItem(`project-${project.project_id}`, "project")}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// LESSON CONTENT VIEW
// ============================================

interface LessonContentViewProps {
  lesson: LessonContent
  onComplete: () => void
}

function LessonContentView({ lesson, onComplete }: LessonContentViewProps) {
  return (
    <div className="space-y-6">
      {lesson.content_url ? (
        <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
          {lesson.content_type?.toLowerCase() === "video" ? (
            <iframe
              src={lesson.content_url}
              className="w-full h-full"
              allowFullScreen
              title={lesson.title}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <a
                href={lesson.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white flex items-center gap-2 hover:underline"
              >
                <ExternalLink className="w-5 h-5" />
                Open Content
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Content coming soon</p>
          </div>
        </div>
      )}

      <div className="prose prose-gray max-w-none">
        <h2 className="text-2xl font-bold text-gray-900">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-gray-600 text-lg leading-relaxed">{lesson.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
          {lesson.content_type && (
            <span className="flex items-center gap-1 capitalize">
              <FileText className="w-4 h-4" />
              {lesson.content_type}
            </span>
          )}
          {lesson.estimated_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {lesson.estimated_minutes} minutes
            </span>
          )}
        </div>
      </div>

      {!lesson.is_completed && (
        <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark as Complete
        </Button>
      )}

      {lesson.is_completed && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Lesson Completed</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// PROJECT CONTENT VIEW
// ============================================

interface ProjectContentViewProps {
  project: ProjectContent
  onSubmit: (link: string) => void
}

function ProjectContentView({ project, onSubmit }: ProjectContentViewProps) {
  const [linkValue, setLinkValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    if (!linkValue.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      onSubmit(linkValue)
      setIsSubmitting(false)
      toast.success("Project submitted successfully!")
    }, 500)
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Code2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              Project
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">{project.title}</h2>
          </div>
        </div>
        
        {project.description && (
          <p className="text-gray-600 leading-relaxed">{project.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
          {project.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Estimated: ~{project.estimated_hours} hours
            </span>
          )}
          {project.starter_repo_url && (
            <a
              href={project.starter_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Starter Code
            </a>
          )}
        </div>
      </div>

      {project.required_skills && project.required_skills.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Required Skills</h3>
          <div className="flex flex-wrap gap-2">
            {project.required_skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {!project.is_completed ? (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Submit Your Project</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://github.com/username/project"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!linkValue.trim() || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Submit
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Paste the link to your GitHub repository, CodeSandbox, or live demo.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-green-600 p-4 bg-green-50 rounded-xl">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Project Completed</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT  
// ============================================

export default function LearningModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [courseContent, setCourseContent] = useState<LearningContentResponse | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeItemType, setActiveItemType] = useState<"lesson" | "project" | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await studentCoursesApi.getLearningContentBySlug(id)
        setCourseContent(content)
        setIsEnrolled(true)
        
        if (content.modules.length > 0) {
          setExpandedModules(new Set([content.modules[0].module_id]))
          
          for (const module of content.modules) {
            const firstIncompleteLesson = module.lessons.find(l => !l.is_completed)
            if (firstIncompleteLesson) {
              setActiveItemId(`lesson-${firstIncompleteLesson.lesson_id}`)
              setActiveItemType("lesson")
              break
            }
            const firstIncompleteProject = module.projects.find(p => !p.is_completed)
            if (firstIncompleteProject) {
              setActiveItemId(`project-${firstIncompleteProject.project_id}`)
              setActiveItemType("project")
              break
            }
          }
        }
      } catch (error: unknown) {
        console.error("Failed to fetch course content:", error)
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 403) {
          toast.error("You are not enrolled in this course")
        } else {
          toast.error("Failed to load course content")
        }
        router.push(`/courses/${id}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [id, router])

  const handleToggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const handleSelectItem = (itemId: string, type: "lesson" | "project") => {
    setActiveItemId(itemId)
    setActiveItemType(type)
  }

  const getActiveLesson = (): LessonContent | null => {
    if (!activeItemId || activeItemType !== "lesson" || !courseContent) return null
    const lessonId = parseInt(activeItemId.replace("lesson-", ""))
    for (const module of courseContent.modules) {
      const lesson = module.lessons.find(l => l.lesson_id === lessonId)
      if (lesson) return lesson
    }
    return null
  }

  const getActiveProject = (): ProjectContent | null => {
    if (!activeItemId || activeItemType !== "project" || !courseContent) return null
    const projectId = parseInt(activeItemId.replace("project-", ""))
    for (const module of courseContent.modules) {
      const project = module.projects.find(p => p.project_id === projectId)
      if (project) return project
    }
    return null
  }

  const handleCompleteLesson = () => {
    toast.success("Lesson marked as complete!")
    if (courseContent && activeItemId) {
      const lessonId = parseInt(activeItemId.replace("lesson-", ""))
      const updatedModules = courseContent.modules.map(mod => ({
        ...mod,
        lessons: mod.lessons.map(l => 
          l.lesson_id === lessonId ? { ...l, is_completed: true } : l
        ),
        progress_percent: Math.round(
          ((mod.lessons.filter(l => l.is_completed || l.lesson_id === lessonId).length +
            mod.projects.filter(p => p.is_completed).length) /
            (mod.lessons.length + mod.projects.length)) * 100
        )
      }))
      setCourseContent({
        ...courseContent,
        modules: updatedModules,
        progress: {
          ...courseContent.progress,
          completed_lessons: courseContent.progress.completed_lessons + 1,
          overall_percent: Math.round(
            ((courseContent.progress.completed_lessons + 1 + courseContent.progress.completed_projects) /
              (courseContent.progress.total_lessons + courseContent.progress.total_projects)) * 100
          )
        }
      })
    }
  }

  const handleSubmitProject = (link: string) => {
    console.log("Submitting project with link:", link)
    if (courseContent && activeItemId) {
      const projectId = parseInt(activeItemId.replace("project-", ""))
      const updatedModules = courseContent.modules.map(mod => ({
        ...mod,
        projects: mod.projects.map(p => 
          p.project_id === projectId ? { ...p, is_completed: true } : p
        ),
        progress_percent: Math.round(
          ((mod.lessons.filter(l => l.is_completed).length +
            mod.projects.filter(p => p.is_completed || p.project_id === projectId).length) /
            (mod.lessons.length + mod.projects.length)) * 100
        )
      }))
      setCourseContent({
        ...courseContent,
        modules: updatedModules,
        progress: {
          ...courseContent.progress,
          completed_projects: courseContent.progress.completed_projects + 1,
          overall_percent: Math.round(
            ((courseContent.progress.completed_lessons + courseContent.progress.completed_projects + 1) /
              (courseContent.progress.total_lessons + courseContent.progress.total_projects)) * 100
          )
        }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    )
  }

  if (!isEnrolled || !courseContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">You are not enrolled in this course</p>
          <p className="text-gray-400 text-sm">Redirecting to course page...</p>
        </div>
      </div>
    )
  }

  const activeLesson = getActiveLesson()
  const activeProject = getActiveProject()

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/courses/${id}`}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {courseContent.path.title}
              </p>
              <h1 className="text-sm font-bold text-gray-900 line-clamp-1">
                {courseContent.course.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-gray-500">
                Progress: {courseContent.progress.overall_percent}%
              </span>
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${courseContent.progress.overall_percent}%` }}
                />
              </div>
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="p-4 bg-white rounded-xl border border-gray-200 mb-4">
              <h2 className="font-semibold text-gray-900 mb-2">Course Progress</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{courseContent.progress.completed_lessons}/{courseContent.progress.total_lessons} Lessons</span>
                <span>{courseContent.progress.completed_projects}/{courseContent.progress.total_projects} Projects</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full bg-green-500 transition-all duration-300" 
                  style={{ width: `${courseContent.progress.overall_percent}%` }}
                />
              </div>
            </div>

            {courseContent.modules.map((module) => (
              <ModuleAccordion
                key={module.module_id}
                module={module}
                isExpanded={expandedModules.has(module.module_id)}
                onToggle={() => handleToggleModule(module.module_id)}
                activeItemId={activeItemId}
                onSelectItem={handleSelectItem}
              />
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {activeLesson && (
                <LessonContentView
                  lesson={activeLesson}
                  onComplete={handleCompleteLesson}
                />
              )}

              {activeProject && (
                <ProjectContentView
                  project={activeProject}
                  onSubmit={handleSubmitProject}
                />
              )}

              {!activeLesson && !activeProject && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Select a lesson or project
                  </h3>
                  <p className="text-gray-400">
                    Choose a lesson or project from the sidebar to begin learning.
                  </p>
                </div>
              )}
            </div>

            {courseContent.progress.overall_percent === 100 && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">🎉 Course Completed!</h3>
                <p className="text-green-700 mb-4">
                  Congratulations! You have completed all lessons and projects.
                </p>
                <Link href="/dashboard/courses">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Back to My Courses
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

  if (quizCompleted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Completed!</h3>
        <p className="text-gray-600">You can now proceed to the tasks below.</p>
      </div>
    )
  }

  if (showResult) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              passed ? "bg-green-100" : "bg-amber-100"
            }`}>
              <span className={`text-2xl font-bold ${passed ? "text-green-600" : "text-amber-600"}`}>
                {Math.round(scorePercentage)}%
              </span>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${passed ? "text-green-700" : "text-amber-700"}`}>
              {passed ? "Congratulations! You Passed!" : "Almost There!"}
            </h3>
            <p className="text-gray-600">
              You got {correctCount} out of {totalQuestions} questions correct.
            </p>
          </div>

          {/* Results breakdown */}
          <div className="space-y-3 mb-6">
            {QUIZ_QUESTIONS.map((q, idx) => {
              const userAnswer = selectedAnswers[idx]
              const isCorrect = userAnswer === q.correctAnswer
              return (
                <div key={q.id} className={`p-3 rounded-lg border ${
                  isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      <p className={`text-xs mt-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                        {isCorrect ? "Correct" : `Correct answer: ${q.options[q.correctAnswer]}`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {passed ? (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleCompleteQuiz}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continue to Tasks
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 text-center">
                You need at least {passPercentage}% to proceed. Please review and try again.
              </p>
              <Button 
                className="w-full"
                onClick={() => {
                  setSelectedAnswers({})
                  setCurrentQuestion(0)
                  setShowResult(false)
                }}
              >
                Retake Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-500">
            {answeredCount} answered
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-lg mb-4">{question.question}</CardTitle>
        
        <RadioGroup 
          value={selectedAnswers[currentQuestion]?.toString() || ""} 
          onValueChange={(val) => handleSelectAnswer(parseInt(val))}
          className="space-y-3"
        >
          {question.options.map((option, idx) => (
            <div
              key={idx}
              className={`flex items-center space-x-2 border p-4 rounded-lg transition-colors cursor-pointer ${
                selectedAnswers[currentQuestion] === idx 
                  ? "bg-blue-50 border-blue-300" 
                  : "hover:bg-gray-50 border-gray-200"
              }`}
            >
              <RadioGroupItem value={idx.toString()} id={`q${currentQuestion}-opt${idx}`} />
              <Label htmlFor={`q${currentQuestion}-opt${idx}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] === undefined}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {currentQuestion === totalQuestions - 1 ? "Submit Quiz" : "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// TASK CARD COMPONENT
// ============================================

interface TaskCardProps {
  task: Task
  isLocked: boolean
  isActive: boolean
  onSubmitLink: (taskId: number, link: string) => void
  onSelect: () => void
}

function TaskCard({ task, isLocked, isActive, onSubmitLink, onSelect }: TaskCardProps) {
  const [linkValue, setLinkValue] = useState(task.submittedLink || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const handleSubmit = () => {
    if (!linkValue.trim()) return
    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      onSubmitLink(task.id, linkValue)
      setIsSubmitting(false)
    }, 500)
  }

  if (isLocked) {
    return (
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-500">{task.title}</h4>
            <p className="text-sm text-gray-400">Complete the quiz to unlock</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`rounded-xl border-2 transition-all ${
        task.isCompleted 
          ? "border-green-200 bg-green-50" 
          : isActive 
            ? "border-blue-300 bg-white shadow-md" 
            : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Task Header */}
      <button
        onClick={onSelect}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            task.isCompleted 
              ? "bg-green-500 text-white" 
              : isActive 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-600"
          }`}>
            {task.isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <span className="font-bold">{task.id}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-semibold ${task.isCompleted ? "text-green-800" : "text-gray-900"}`}>
                {task.title}
              </h4>
              {task.isCompleted && (
                <span className="text-xs px-2 py-0.5 bg-green-200 text-green-700 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{task.description}</p>
          </div>
          <div className="text-sm text-gray-400">{task.estimatedTime}</div>
        </div>
      </button>

      {/* Expanded Content */}
      {isActive && !task.isCompleted && (
        <div className="px-4 pb-4 border-t border-gray-100 mt-2 pt-4">
          {/* Instructions Toggle */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-4"
          >
            <Clipboard className="w-4 h-4" />
            {showInstructions ? "Hide Instructions" : "View Instructions"}
            <ChevronRight className={`w-4 h-4 transition-transform ${showInstructions ? "rotate-90" : ""}`} />
          </button>

          {showInstructions && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h5 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Step-by-Step Instructions
              </h5>
              <ol className="space-y-2 mb-4">
                {task.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {idx + 1}
                    </span>
                    {instruction}
                  </li>
                ))}
              </ol>
              
              {task.tips.length > 0 && (
                <div className="pt-3 border-t border-blue-200">
                  <h6 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
                    <Code2 className="w-4 h-4" />
                    Pro Tips
                  </h6>
                  <ul className="space-y-1">
                    {task.tips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-blue-700 flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Submit Link */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Submit Your Solution
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!linkValue.trim() || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Submit
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Paste the link to your GitHub repository, CodeSandbox, or live demo.
            </p>
          </div>
        </div>
      )}

      {/* Completed State */}
      {task.isCompleted && task.submittedLink && (
        <div className="px-4 pb-4 border-t border-green-100 mt-2 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">Solution submitted</span>
            <a
              href={task.submittedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View Submission
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function LearningModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(MODULE_TASKS)
  const [activeTaskId, setActiveTaskId] = useState<number | null>(1)

  const completedTasks = tasks.filter(t => t.isCompleted).length
  const progress = quizCompleted 
    ? Math.round(((completedTasks + 1) / (tasks.length + 1)) * 100) 
    : 0

  // Check enrollment status on mount
  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        const status = await studentCoursesApi.checkEnrollmentBySlug(id)
        if (status.is_enrolled) {
          setIsEnrolled(true)
        } else {
          toast.error("You are not enrolled in this course")
          router.push(`/courses/${id}`)
        }
      } catch (error) {
        console.error("Failed to check enrollment:", error)
        toast.error("Please enroll in this course to access the learning content")
        router.push(`/courses/${id}`)
      } finally {
        setIsCheckingEnrollment(false)
      }
    }

    checkEnrollment()
  }, [id, router])

  const handleQuizComplete = () => {
    setQuizCompleted(true)
  }

  const handleSubmitLink = (taskId: number, link: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, submittedLink: link, isCompleted: true }
        : t
    ))
    // Move to next task
    const nextTask = tasks.find(t => t.id > taskId && !t.isCompleted)
    if (nextTask) {
      setActiveTaskId(nextTask.id)
    }
  }

  // Show loading while checking enrollment
  if (isCheckingEnrollment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Verifying enrollment...</p>
        </div>
      </div>
    )
  }

  // Don't render if not enrolled (will redirect)
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">You are not enrolled in this course</p>
          <p className="text-gray-400 text-sm">Redirecting to course page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/courses/${id}`}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Module 1 • Lesson 3</p>
              <h1 className="text-sm font-bold text-gray-900">Build a Responsive Portfolio</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">Progress: {progress}%</span>
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Video / Content Section */}
        <div className="mb-10 space-y-6">
          {/* Video Player Placeholder */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
            <img
              src="/placeholder.svg?height=720&width=1280&text=Lesson+Video"
              alt="Video Content"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-xl">
                <PlayCircle className="w-8 h-8 fill-current" />
              </button>
            </div>
          </div>

          {/* Lesson Description */}
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900">Before you start coding...</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              In this project, you will build a responsive personal portfolio website. This is a crucial step in your
              journey as a developer because it gives you a platform to showcase your work.
            </p>

            <div className="not-prose grid gap-4 mt-6">
              <a
                href="#"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group bg-white"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">A Complete Guide to Flexbox</h4>
                  <p className="text-sm text-gray-500">CSS-Tricks Article • 10 min read</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
              <a
                href="#"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group bg-white"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <PlayCircle className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">CSS Grid vs Flexbox</h4>
                  <p className="text-sm text-gray-500">Video Tutorial • 15 min watch</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-purple-600" />
              </a>
            </div>
          </div>
        </div>

        {/* Quiz Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Knowledge Check</h2>
            {quizCompleted && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Passed
              </span>
            )}
          </div>
          
          <p className="text-gray-600 mb-6">
            Complete this quiz to unlock the project tasks. You need 75% or higher to pass.
          </p>

          <QuizSection onComplete={handleQuizComplete} />
        </div>

        {/* Tasks Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Project Tasks</h2>
            </div>
            <span className="text-sm text-gray-500">
              {completedTasks} of {tasks.length} completed
            </span>
          </div>

          {!quizCompleted && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Tasks Locked</h4>
                <p className="text-sm text-amber-700">
                  Complete the knowledge check quiz above to unlock the project tasks.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isLocked={!quizCompleted}
                isActive={activeTaskId === task.id}
                onSubmitLink={handleSubmitLink}
                onSelect={() => setActiveTaskId(task.id)}
              />
            ))}
          </div>
        </div>

        {/* Completion Banner */}
        {quizCompleted && completedTasks === tasks.length && (
          <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">🎉 Module Completed!</h3>
            <p className="text-green-700 mb-4">
              Congratulations! You've completed all tasks in this module.
            </p>
            <Link href={`/courses/${id}`}>
              <Button className="bg-green-600 hover:bg-green-700">
                Continue to Next Module
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
