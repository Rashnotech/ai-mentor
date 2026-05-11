"use client"

import { useState, use, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  ChevronLeft, 
  PanelLeft,
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
  HelpCircle,
  RotateCcw,
  XCircle,
  FileCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { studentCoursesApi, type LearningContentResponse, type ModuleContent, type LessonContent, type ProjectContent, type QuizContent, type QuizQuestion } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useUserStore } from "@/lib/stores/user-store"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
        className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-purple-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-all"
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
  onSelectItem: (id: string, type: "lesson" | "project" | "quiz") => void
}

function ModuleAccordion({ module, isExpanded, onToggle, activeItemId, onSelectItem }: ModuleAccordionProps) {
  const totalItems = module.lessons.length + module.projects.length + (module.quiz ? 1 : 0)
  const completedItems = module.lessons.filter(l => l.is_completed).length + 
                         module.projects.filter(p => p.is_completed).length +
                         (module.quiz?.is_completed ? 1 : 0)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-w-full">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            module.progress_percent === 100 ? "bg-green-100" : "bg-blue-100"
          }`}>
            {module.progress_percent === 100 ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <span className="text-xs font-bold text-blue-600">{module.order}</span>
            )}
          </div>
          <div className="text-left min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 wrap-break-word">
              {module.title}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1 wrap-break-word">
              {completedItems}/{totalItems} completed • {module.progress_percent}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden hidden md:block">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${module.progress_percent}%` }}
            />
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-2 border-t border-gray-100">
          {module.description && (
            <p className="text-xs text-gray-600 px-1 py-2 line-clamp-2 wrap-break-word">{module.description}</p>
          )}
          
          {module.lessons.map((lesson) => (
            <LessonCard
              key={`lesson-${lesson.lesson_id}`}
              lesson={lesson}
              isActive={activeItemId === `lesson-${lesson.lesson_id}`}
              onSelect={() => onSelectItem(`lesson-${lesson.lesson_id}`, "lesson")}
            />
          ))}

          {/* Quiz comes before Projects */}
          {module.quiz && module.quiz.questions.length > 0 && (
            <div
              onClick={() => onSelectItem(`quiz-${module.module_id}`, "quiz")}
              className={`p-3 rounded-xl border transition-all cursor-pointer max-w-full ${
                activeItemId === `quiz-${module.module_id}`
                  ? "border-amber-300 bg-amber-50 shadow-sm"
                  : module.quiz.is_completed
                  ? "border-green-200 bg-green-50/50"
                  : "border-gray-200 bg-white hover:border-amber-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    module.quiz.is_completed
                      ? "bg-green-100 text-green-600"
                      : activeItemId === `quiz-${module.module_id}`
                      ? "bg-amber-100 text-amber-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {module.quiz.is_completed ? <CheckCircle2 className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                      Quiz
                    </span>
                    {module.quiz.is_completed && (
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {module.quiz.score_percent}%
                      </span>
                    )}
                  </div>
                  <h4 className={`font-semibold mt-1 text-sm leading-snug wrap-break-word ${module.quiz.is_completed ? "text-green-700" : "text-gray-900"}`}>
                    Module Quiz
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {module.quiz.answered_count}/{module.quiz.total_questions} questions answered
                  </p>
                </div>
                {activeItemId === `quiz-${module.module_id}` && <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />}
              </div>
            </div>
          )}

          {/* Projects come after Quiz */}
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
  onNext: () => void
  hasNext: boolean
  isCompleting: boolean
  previewMode?: boolean
}

function LessonContentView({ lesson, onComplete, onNext, hasNext, isCompleting, previewMode = false }: LessonContentViewProps) {
  // Helper function to extract YouTube video ID from various URL formats
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
      /youtube\.com\/v\/([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`
      }
    }
    
    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
      return url
    }
    
    return null
  }

  const youtubeEmbedUrl = lesson.youtube_video_url ? getYouTubeEmbedUrl(lesson.youtube_video_url) : null
  const contentEmbedUrl = lesson.content_url ? getYouTubeEmbedUrl(lesson.content_url) : null
  const embedUrl = youtubeEmbedUrl || contentEmbedUrl

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Section - Title and Description at the Top */}
      <div className="prose prose-gray max-w-none">
        <h2 className="text-xl font-bold text-gray-900 mb-2 sm:text-2xl">{lesson.title}</h2>
        {lesson.description && (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 sm:text-lg">{lesson.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:gap-4 sm:text-sm">
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

      {/* Video Section - Embedded YouTube Player */}
      {embedUrl ? (
        <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={lesson.title}
          />
        </div>
      ) : lesson.content_url ? (
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
      ) : null}

      {/* Lesson Content/Overview Text */}
      {lesson.content && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Lesson Overview
          </h3>
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">{children}</h1>,
                table: ({ children }) => <table className="table-auto w-full border-collapse border border-gray-300">{children}</table>,
                thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                th: ({ children }) => <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">{children}</th>,
                tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
                td: ({ children }) => <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{children}</td>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-gray-700 leading-relaxed my-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                pre: ({ children }) => <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">{children}</blockquote>,
              }}
            >
              {lesson.content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Expected Outcomes */}
      {lesson.expected_outcomes && lesson.expected_outcomes.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            What You'll Learn
          </h3>
          <ul className="space-y-2">
            {lesson.expected_outcomes.map((outcome, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <ArrowRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* External Resources */}
      {lesson.external_resources && lesson.external_resources.length > 0 && (
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
            <ExternalLink className="w-5 h-5 text-purple-600" />
            External Resources
          </h3>
          <ul className="space-y-2">
            {lesson.external_resources.map((resource, idx) => (
              <li key={idx}>
                <a
                  href={resource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-700 hover:text-purple-900 hover:underline"
                >
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span className="break-all">{resource}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion and Navigation Buttons */}
      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!previewMode && !lesson.is_completed ? (
            <Button 
              onClick={onComplete} 
              className="bg-green-600 hover:bg-green-700"
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </Button>
          ) : !previewMode ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Lesson Completed</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Preview mode hides completion controls.</div>
          )}
        </div>
        
        {hasNext && (
          <Button 
            onClick={onNext} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!previewMode && !lesson.is_completed}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// PROJECT CONTENT VIEW
// ============================================

interface ProjectContentViewProps {
  project: ProjectContent
  onSubmit: (link: string) => Promise<void>
  onNext: () => void
  hasNext: boolean
  previewMode?: boolean
}

function ProjectContentView({ project, onSubmit, onNext, hasNext, previewMode = false }: ProjectContentViewProps) {
  const [linkValue, setLinkValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!linkValue.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(linkValue)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl border border-purple-100 bg-linear-to-r from-purple-50 to-blue-50 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 sm:h-12 sm:w-12">
            <Code2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Project
            </span>
            <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{project.title}</h2>
          </div>
        </div>
        
        {project.description && (
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="text-gray-600 leading-relaxed my-2">{children}</p>,
                table: ({ children }) => <table className="table-auto w-full border-collapse border border-gray-300">{children}</table>,
                thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                th: ({ children }) => <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">{children}</th>,
                tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
                td: ({ children }) => <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{children}</td>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mt-4 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-gray-600">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-gray-600">{children}</ol>,
                li: ({ children }) => <li className="text-gray-600">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                pre: ({ children }) => <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>,
              }}
            >
              {project.description}
            </ReactMarkdown>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 sm:gap-4 sm:text-sm">
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
          <h3 className="mb-2 font-semibold text-gray-900">Required Skills</h3>
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

      {previewMode ? (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Preview Mode</h3>
          <p className="text-sm text-gray-600">
            Students would normally see the project submission area here. In preview, submission controls are hidden.
          </p>
        </div>
      ) : !project.is_submitted ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Submit Your Project</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
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
              className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
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
        <div className="space-y-4">
          {/* Submission Status Card */}
          <div className={`p-4 rounded-xl border ${
            project.submission_status === 'approved' ? 'bg-green-50 border-green-200' :
            project.submission_status === 'rejected' ? 'bg-red-50 border-red-200' :
            project.submission_status === 'in_review' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="mb-2 flex items-center gap-2">
              {project.submission_status === 'approved' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : project.submission_status === 'rejected' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : project.submission_status === 'in_review' ? (
                <Clock className="w-5 h-5 text-yellow-600" />
              ) : (
                <FileCheck className="w-5 h-5 text-blue-600" />
              )}
              <span className={`font-medium ${
                project.submission_status === 'approved' ? 'text-green-700' :
                project.submission_status === 'rejected' ? 'text-red-700' :
                project.submission_status === 'in_review' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {project.submission_status === 'approved' ? 'Project Approved' :
                 project.submission_status === 'rejected' ? 'Revision Requested' :
                 project.submission_status === 'in_review' ? 'Under Review' :
                 'Submitted'}
              </span>
              {project.points_earned !== null && project.points_earned > 0 && (
                <span className="ml-auto text-sm font-semibold text-green-600">
                  +{project.points_earned} points
                </span>
              )}
            </div>
            
            {/* Submission URL */}
            {project.submission_url && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="shrink-0">Your submission:</span>
                <a 
                  href={project.submission_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  {project.submission_url}
                </a>
              </div>
            )}
            
            {/* Submitted timestamp */}
            {project.submitted_at && (
              <p className="text-xs text-gray-500 mt-2">
                Submitted on {new Date(project.submitted_at).toLocaleDateString()} at {new Date(project.submitted_at).toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Mentor Review Section */}
          {project.reviewer_feedback && (
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Mentor Feedback</p>
                  {project.reviewed_at && (
                    <p className="text-xs text-gray-500">
                      Reviewed on {new Date(project.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="pl-10">
                <div className="prose prose-sm prose-gray max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{project.reviewer_feedback}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      {hasNext && (
        <div className="border-t border-gray-200 pt-4">
          <Button 
            onClick={onNext} 
            className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
            disabled={!previewMode && !project.is_completed}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// QUIZ CONTENT VIEW
// ============================================

interface QuizContentViewProps {
  quiz: QuizContent
  moduleTitle: string
  onSubmitAnswer: (questionId: number, answer: string) => Promise<{
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
    points_earned: number
  }>
  onNext: () => void
  hasNext: boolean
  previewMode?: boolean
}

function QuizContentView({ quiz, moduleTitle, onSubmitAnswer, onNext, hasNext, previewMode = false }: QuizContentViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(quiz.is_completed)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastAnswerResult, setLastAnswerResult] = useState<{
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
  } | null>(null)
  const [localQuestions, setLocalQuestions] = useState(quiz.questions)

  const currentQuestion = localQuestions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === localQuestions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const result = await onSubmitAnswer(currentQuestion.question_id, selectedAnswer)
      
      // Update local state with the result
      setLastAnswerResult({
        is_correct: result.is_correct,
        correct_answer: result.correct_answer,
        explanation: result.explanation,
      })
      
      // Update the question in local state
      setLocalQuestions(prev => prev.map((q, idx) => 
        idx === currentQuestionIndex 
          ? {
              ...q,
              user_answer: selectedAnswer,
              is_answered: true,
              is_correct: result.is_correct,
              correct_answer: result.correct_answer,
              explanation: result.explanation,
            }
          : q
      ))
      
    } catch (error) {
      console.error("Failed to submit answer:", error)
      toast.error("Failed to submit answer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setLastAnswerResult(null)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1)
      setSelectedAnswer(null)
      setLastAnswerResult(null)
    }
  }

  // Calculate score from local questions
  const answeredQuestions = localQuestions.filter(q => q.is_answered)
  const correctAnswers = localQuestions.filter(q => q.is_correct)
  const localScorePercent = answeredQuestions.length > 0 
    ? Math.round((correctAnswers.length / localQuestions.length) * 100) 
    : quiz.score_percent

  if (!previewMode && (showResults || quiz.is_completed)) {
    const passPercentage = 70
    const passed = localScorePercent >= passPercentage

    return (
      <div className="space-y-6">
        <div className="p-6 bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Quiz
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">{moduleTitle} Quiz</h2>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
            passed ? "bg-green-100" : "bg-amber-100"
          }`}>
            <span className={`text-3xl font-bold ${passed ? "text-green-600" : "text-amber-600"}`}>
              {localScorePercent}%
            </span>
          </div>
          <h3 className={`text-xl font-bold mb-2 ${passed ? "text-green-700" : "text-amber-700"}`}>
            {passed ? "🎉 Congratulations! You Passed!" : "Almost There!"}
          </h3>
          <p className="text-gray-600">
            You got {correctAnswers.length} out of {localQuestions.length} questions correct.
          </p>
        </div>

        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Question Review</h3>
          {localQuestions.map((q, idx) => (
            <div 
              key={q.question_id}
              className={`p-4 rounded-xl border ${
                q.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  q.is_correct ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}>
                  {q.is_correct ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Q{idx + 1}: {q.question_text}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Your answer: <span className="font-medium">{q.user_answer || "Not answered"}</span>
                  </p>
                  {!q.is_correct && q.correct_answer && (
                    <p className="text-sm text-green-700 mt-1">
                      Correct answer: <span className="font-medium">{q.correct_answer}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">Explanation:</span> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowResults(false)
              setCurrentQuestionIndex(0)
              setLastAnswerResult(null)
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Review Questions
          </Button>

          {hasNext && (
            <Button 
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl border border-amber-100 bg-linear-to-r from-amber-50 to-orange-50 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 sm:h-12 sm:w-12">
            <HelpCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Quiz
            </span>
            <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{moduleTitle} Quiz</h2>
          </div>
        </div>
        <p className="text-sm text-gray-600 sm:text-base">
          Test your knowledge with {quiz.total_questions} questions.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Question {currentQuestionIndex + 1} of {quiz.total_questions}</span>
        <span>{quiz.answered_count} answered</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-amber-500 transition-all duration-300" 
          style={{ width: `${((currentQuestionIndex + 1) / quiz.total_questions) * 100}%` }}
        />
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            {currentQuestion.difficulty_level && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                currentQuestion.difficulty_level === 'easy' 
                  ? 'bg-green-100 text-green-700'
                  : currentQuestion.difficulty_level === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {currentQuestion.difficulty_level}
              </span>
            )}
            <span className="text-xs text-gray-400">{currentQuestion.points} points</span>
          </div>

          <h3 className="mb-6 text-base font-semibold text-gray-900 sm:text-lg">
            {currentQuestion.question_text}
          </h3>

          {/* Answer Options */}
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option || currentQuestion.user_answer === option
                const isAnswered = currentQuestion.is_answered
                const isCorrect = isAnswered && currentQuestion.is_correct && currentQuestion.user_answer === option

                return (
                  <button
                    key={idx}
                    onClick={() => !isAnswered && !previewMode && setSelectedAnswer(option)}
                    disabled={isAnswered || previewMode}
                    className={`w-full rounded-xl border p-3 text-left transition-all sm:p-4 ${
                      isAnswered
                        ? isCorrect
                          ? "border-green-300 bg-green-50"
                          : isSelected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 bg-gray-50 opacity-60"
                        : isSelected
                        ? "border-amber-300 bg-amber-50"
                        : "border-gray-200 hover:border-amber-200 hover:bg-amber-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isAnswered
                          ? isCorrect
                            ? "border-green-500 bg-green-500"
                            : isSelected
                            ? "border-red-500 bg-red-500"
                            : "border-gray-300"
                          : isSelected
                          ? "border-amber-500 bg-amber-500"
                          : "border-gray-300"
                      }`}>
                        {(isSelected || isCorrect) && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`font-medium ${
                        isAnswered && !isSelected ? "text-gray-500" : "text-gray-900"
                      }`}>
                        {option}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={selectedAnswer || currentQuestion.user_answer || ""}
              onChange={(e) => !currentQuestion.is_answered && !previewMode && setSelectedAnswer(e.target.value)}
              disabled={currentQuestion.is_answered || previewMode}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-25 disabled:bg-gray-50 disabled:text-gray-500"
            />
          )}

          {currentQuestion.is_answered && currentQuestion.explanation && (
            <div className={`mt-4 p-4 rounded-xl border ${
              currentQuestion.is_correct 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-2">
                {currentQuestion.is_correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${currentQuestion.is_correct ? "text-green-700" : "text-red-700"}`}>
                    {currentQuestion.is_correct ? "Correct!" : "Incorrect"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">Explanation:</span> {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Show result immediately after submission */}
          {lastAnswerResult && !currentQuestion.is_answered && (
            <div className={`mt-4 p-4 rounded-xl border ${
              lastAnswerResult.is_correct 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-2">
                {lastAnswerResult.is_correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${lastAnswerResult.is_correct ? "text-green-700" : "text-red-700"}`}>
                    {lastAnswerResult.is_correct ? "Correct!" : "Incorrect"}
                  </p>
                  {lastAnswerResult.explanation && (
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Explanation:</span> {lastAnswerResult.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          className="w-full sm:w-auto"
        >
          Previous
        </Button>
        
          {previewMode ? (
            hasNext ? (
              <Button
                onClick={() => {
                  if (isLastQuestion) {
                    onNext()
                  } else {
                    handleNextQuestion()
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
              >
                {isLastQuestion ? "Next" : "Next Question"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto" disabled>
                Preview Complete
              </Button>
            )
          ) : currentQuestion?.is_answered ? (
          <Button
            onClick={handleNextQuestion}
            className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
          >
            {isLastQuestion ? "View Results" : "Next Question"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || isSubmitting}
            className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Submit Answer
                <Check className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// LEARNING NAVIGATION PANEL
// ============================================

interface LearningNavigationPanelProps {
  courseContent: LearningContentResponse
  expandedModules: Set<number>
  activeItemId: string | null
  onToggleModule: (moduleId: number) => void
  onSelectItem: (itemId: string, type: "lesson" | "project" | "quiz") => void
  onClose?: () => void
}

function LearningNavigationPanel({
  courseContent,
  expandedModules,
  activeItemId,
  onToggleModule,
  onSelectItem,
  onClose,
}: LearningNavigationPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-linear-to-b from-white to-slate-50">
      <SheetHeader className="border-b border-gray-100 px-5 py-4 text-left">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SheetTitle className="text-base font-semibold text-gray-900">Course outline</SheetTitle>
            <SheetDescription className="text-xs text-gray-500">
              Browse modules without leaving the lesson view.
            </SheetDescription>
          </div>
          {onClose ? (
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-full">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600">Modules</p>
            <p className="text-sm font-semibold text-gray-900">{courseContent.modules.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">Lessons</p>
            <p className="text-sm font-semibold text-gray-900">{courseContent.progress.completed_lessons}/{courseContent.progress.total_lessons}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-600">Projects</p>
            <p className="text-sm font-semibold text-gray-900">{courseContent.progress.completed_projects}/{courseContent.progress.total_projects}</p>
          </div>
        </div>
      </SheetHeader>

      <div className="px-5 pt-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Overall progress</span>
            <span className="font-semibold text-gray-900">{courseContent.progress.overall_percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${courseContent.progress.overall_percent}%` }}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-5 pb-5 pt-4">
        <div className="space-y-3 pr-1">
          {courseContent.modules.map((module) => (
            <ModuleAccordion
              key={module.module_id}
              module={module}
              isExpanded={expandedModules.has(module.module_id)}
              onToggle={() => onToggleModule(module.module_id)}
              activeItemId={activeItemId}
              onSelectItem={(itemId, type) => {
                onSelectItem(itemId, type)
                onClose?.()
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT  
// ============================================

export default function LearningModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreviewMode = searchParams.get("preview") === "1" || searchParams.get("preview") === "true"
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [courseContent, setCourseContent] = useState<LearningContentResponse | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeItemType, setActiveItemType] = useState<"lesson" | "project" | "quiz" | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isModulePanelOpen, setIsModulePanelOpen] = useState(false)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await studentCoursesApi.getLearningContentBySlug(id, isPreviewMode ? { preview: true } : undefined)
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
            // Check for incomplete quiz
            if (module.quiz && !module.quiz.is_completed) {
              setActiveItemId(`quiz-${module.module_id}`)
              setActiveItemType("quiz")
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
  }, [id, router, isPreviewMode])

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

  const handleSelectItem = (itemId: string, type: "lesson" | "project" | "quiz") => {
    setActiveItemId(itemId)
    setActiveItemType(type)
  }

  const activeModule = courseContent
    ? courseContent.modules.find((module) => {
        if (!activeItemId) return false

        if (activeItemType === "quiz") {
          return activeItemId === `quiz-${module.module_id}`
        }

        if (activeItemType === "lesson") {
          return module.lessons.some((lesson) => activeItemId === `lesson-${lesson.lesson_id}`)
        }

        if (activeItemType === "project") {
          return module.projects.some((project) => activeItemId === `project-${project.project_id}`)
        }

        return false
      })
    : null

  const getActiveLesson = (): LessonContent | null => {
    if (!activeItemId || activeItemType !== "lesson" || !courseContent) return null
    const lessonId = parseInt(activeItemId.replace("lesson-", ""))
    for (const module of courseContent.modules) {
      const lesson = module.lessons.find(l => l.lesson_id === lessonId)
      if (lesson) return lesson
    }
    return null
  }

  const getActiveProject = (): { project: ProjectContent; moduleId: number } | null => {
    if (!activeItemId || activeItemType !== "project" || !courseContent) return null
    const projectId = parseInt(activeItemId.replace("project-", ""))
    for (const module of courseContent.modules) {
      const project = module.projects.find(p => p.project_id === projectId)
      if (project) return { project, moduleId: module.module_id }
    }
    return null
  }

  const getActiveQuiz = (): { quiz: QuizContent; moduleTitle: string } | null => {
    if (!activeItemId || activeItemType !== "quiz" || !courseContent) return null
    const moduleId = parseInt(activeItemId.replace("quiz-", ""))
    for (const module of courseContent.modules) {
      if (module.module_id === moduleId && module.quiz) {
        return { quiz: module.quiz, moduleTitle: module.title }
      }
    }
    return null
  }

  // Get the next item in the learning sequence (lessons -> quiz -> projects)
  const getNextItem = (): { id: string; type: "lesson" | "project" | "quiz"; moduleId: number } | null => {
    if (!courseContent || !activeItemId || !activeItemType) return null

    // Build a flat list of all items in order: lessons, quiz, projects (per module)
    const allItems: { id: string; type: "lesson" | "project" | "quiz"; moduleId: number }[] = []
    
    for (const module of courseContent.modules) {
      // Add lessons first
      for (const lesson of module.lessons) {
        allItems.push({ id: `lesson-${lesson.lesson_id}`, type: "lesson", moduleId: module.module_id })
      }
      // Add quiz (if exists)
      if (module.quiz && module.quiz.questions.length > 0) {
        allItems.push({ id: `quiz-${module.module_id}`, type: "quiz", moduleId: module.module_id })
      }
      // Add projects last
      for (const project of module.projects) {
        allItems.push({ id: `project-${project.project_id}`, type: "project", moduleId: module.module_id })
      }
    }

    // Find current item index
    const currentIndex = allItems.findIndex(item => item.id === activeItemId)
    if (currentIndex === -1 || currentIndex === allItems.length - 1) return null

    return allItems[currentIndex + 1]
  }

  const handleNext = () => {
    const nextItem = getNextItem()
    if (nextItem) {
      setActiveItemId(nextItem.id)
      setActiveItemType(nextItem.type)
      // Expand the module if it's different
      setExpandedModules(prev => {
        const next = new Set(prev)
        next.add(nextItem.moduleId)
        return next
      })
    }
  }

  const hasNextItem = (): boolean => {
    return getNextItem() !== null
  }

  const handleSubmitQuizAnswer = async (questionId: number, answer: string): Promise<{
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
    points_earned: number
  }> => {
    // Call the backend API to verify the answer
    const result = await studentCoursesApi.submitQuizAnswer(questionId, answer)
    
    // Update local state with the result
    if (courseContent && activeItemId) {
      const moduleId = parseInt(activeItemId.replace("quiz-", ""))
      const updatedModules = courseContent.modules.map(mod => {
        if (mod.module_id !== moduleId || !mod.quiz) return mod
        
        const updatedQuestions = mod.quiz.questions.map(q => 
          q.question_id === questionId 
            ? { 
                ...q, 
                user_answer: answer, 
                is_answered: true, 
                is_correct: result.is_correct,
                correct_answer: result.correct_answer,
                explanation: result.explanation,
              }
            : q
        )
        const answeredCount = updatedQuestions.filter(q => q.is_answered).length
        const correctCount = updatedQuestions.filter(q => q.is_correct).length
        const quizIsCompleted = answeredCount === mod.quiz.total_questions
        
        // Calculate progress including the updated quiz status
        const totalItems = mod.lessons.length + mod.projects.length + 1 // +1 for quiz
        const completedItems = mod.lessons.filter(l => l.is_completed).length +
                               mod.projects.filter(p => p.is_completed).length +
                               (quizIsCompleted ? 1 : 0)
        
        return {
          ...mod,
          progress_percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          quiz: {
            ...mod.quiz,
            questions: updatedQuestions,
            answered_count: answeredCount,
            correct_count: correctCount,
            is_completed: quizIsCompleted,
            score_percent: Math.round((correctCount / mod.quiz.total_questions) * 100),
          }
        }
      })
      
      setCourseContent({
        ...courseContent,
        modules: updatedModules,
      })
    }
    
    return result
  }

  const handleCompleteLesson = async () => {
    if (!courseContent || !activeItemId) return
    
    const lessonId = parseInt(activeItemId.replace("lesson-", ""))
    setIsCompleting(true)
    
    try {
      // Call the backend API to mark the lesson as complete
      await studentCoursesApi.markLessonComplete(lessonId, 0)
      
      toast.success("Lesson marked as complete!")
      
      // Update local state
      const updatedModules = courseContent.modules.map(mod => {
        const totalItems = mod.lessons.length + mod.projects.length + (mod.quiz ? 1 : 0)
        const completedItems = mod.lessons.filter(l => l.is_completed || l.lesson_id === lessonId).length +
                               mod.projects.filter(p => p.is_completed).length +
                               (mod.quiz?.is_completed ? 1 : 0)
        return {
          ...mod,
          lessons: mod.lessons.map(l => 
            l.lesson_id === lessonId ? { ...l, is_completed: true } : l
          ),
          progress_percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        }
      })
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
    } catch (error) {
      console.error("Failed to mark lesson as complete:", error)
      toast.error("Failed to mark lesson as complete. Please try again.")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSubmitProject = async (link: string) => {
    if (!courseContent || !activeItemId) return
    
    const projectId = parseInt(activeItemId.replace("project-", ""))
    
    // Find the module_id for this project
    let moduleId: number | null = null
    for (const mod of courseContent.modules) {
      if (mod.projects.some(p => p.project_id === projectId)) {
        moduleId = mod.module_id
        break
      }
    }
    
    if (!moduleId) {
      toast.error("Could not find module for this project")
      return
    }
    
    try {
      // Call the backend API to submit the project
      await studentCoursesApi.submitProject(projectId, moduleId, link)
      
      toast.success("Project submitted successfully!")
      
      // Update local state - include the submission_url and new status fields
      const updatedModules = courseContent.modules.map(mod => {
        const totalItems = mod.lessons.length + mod.projects.length + (mod.quiz ? 1 : 0)
        const completedItems = mod.lessons.filter(l => l.is_completed).length +
                               mod.projects.filter(p => p.is_completed || p.project_id === projectId).length +
                               (mod.quiz?.is_completed ? 1 : 0)
        return {
          ...mod,
          projects: mod.projects.map(p => 
            p.project_id === projectId ? { 
              ...p, 
              is_completed: true, 
              is_submitted: true,
              submission_url: link,
              submission_status: "submitted" as const,
              submitted_at: new Date().toISOString()
            } : p
          ),
          progress_percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        }
      })
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
    } catch (error) {
      console.error("Failed to submit project:", error)
      toast.error("Failed to submit project. Please try again.")
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
  const activeQuiz = getActiveQuiz()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#f1f5f9_42%,#e2e8f0_100%)] font-sans text-gray-900">
      <nav className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href={`/courses/${id}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {courseContent.path.title}
              </p>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                  {courseContent.course.title}
                </h1>
                {isPreviewMode && (
                  <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:inline-flex">
                    Preview
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Sheet open={isModulePanelOpen} onOpenChange={setIsModulePanelOpen}>
              <Button
                variant="outline"
                onClick={() => setIsModulePanelOpen(true)}
                className="hidden border-gray-200 bg-white/90 shadow-none sm:inline-flex"
              >
                <PanelLeft className="w-4 h-4" />
                Modules
              </Button>
              <SheetContent side="left" className="w-full border-r-0 p-0 sm:max-w-md">
                {courseContent && (
                  <LearningNavigationPanel
                    courseContent={courseContent}
                    expandedModules={expandedModules}
                    activeItemId={activeItemId}
                    onToggleModule={handleToggleModule}
                    onSelectItem={handleSelectItem}
                    onClose={() => setIsModulePanelOpen(false)}
                  />
                )}
              </SheetContent>
            </Sheet>

            <div className="hidden items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm md:flex">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Progress</span>
              <span className="text-sm font-semibold text-gray-900">{courseContent.progress.overall_percent}%</span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${courseContent.progress.overall_percent}%` }}
                />
              </div>
            </div>
            <UserAvatarDropdown />
          </div>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Learning space</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-gray-950 sm:text-xl">
                  Focus on the lesson, keep the curriculum one tap away.
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-600 sm:text-sm">
                  A cleaner course view with the module list tucked into a toggleable panel so the content stays centered and easy to scan.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModulePanelOpen(true)}
                  className="border-gray-200 bg-white shadow-none sm:hidden"
                >
                  <PanelLeft className="w-4 h-4" />
                  Modules
                </Button>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Current item</p>
                  <p className="mt-1 text-xs font-semibold text-gray-900">
                    {activeItemType ? activeItemType.charAt(0).toUpperCase() + activeItemType.slice(1) : "Start here"}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {activeModule ? activeModule.title : "Select a module from the panel"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Lessons</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {courseContent.progress.completed_lessons}
                  <span className="text-sm font-medium text-gray-500"> / {courseContent.progress.total_lessons}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Projects</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {courseContent.progress.completed_projects}
                  <span className="text-sm font-medium text-gray-500"> / {courseContent.progress.total_projects}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Completion</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">{courseContent.progress.overall_percent}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
            {activeLesson && (
              <LessonContentView
                lesson={activeLesson}
                onComplete={handleCompleteLesson}
                onNext={handleNext}
                hasNext={hasNextItem()}
                isCompleting={isCompleting}
                previewMode={isPreviewMode}
              />
            )}

            {activeProject && (
              <ProjectContentView
                project={activeProject.project}
                onSubmit={handleSubmitProject}
                onNext={handleNext}
                hasNext={hasNextItem()}
                previewMode={isPreviewMode}
              />
            )}

            {activeQuiz && (
              <QuizContentView
                quiz={activeQuiz.quiz}
                moduleTitle={activeQuiz.moduleTitle}
                onSubmitAnswer={handleSubmitQuizAnswer}
                onNext={handleNext}
                hasNext={hasNextItem()}
                previewMode={isPreviewMode}
              />
            )}

            {!activeLesson && !activeProject?.project && !activeQuiz && (
              <div className="flex min-h-105 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-6 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Choose a lesson, project, or quiz
                </h3>
                <p className="max-w-md text-sm leading-6 text-gray-500">
                  Open the module panel to navigate the curriculum. The selected item will load here with minimal distractions.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsModulePanelOpen(true)}
                  className="mt-5 border-gray-200 bg-white"
                >
                  <PanelLeft className="w-4 h-4" />
                  Open modules
                </Button>
              </div>
            )}
          </div>

          {courseContent.progress.overall_percent === 100 && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-emerald-800">Course completed</h3>
              <p className="mb-4 text-emerald-700">
                You have completed all lessons and projects in this course.
              </p>
              <Link href="/dashboard/courses">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Back to My Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
