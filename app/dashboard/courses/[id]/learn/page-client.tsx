"use client"

import { useState, use, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
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
  User,
  Clock,
  Video,
  FileCode2,
  HelpCircle,
  RotateCcw,
  XCircle,
  FileCheck,
  Lock,
  Layers,
  PanelRightOpen,
  Volume2,
  Pause,
  Square,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  studentCoursesApi,
  type LearningContentResponse,
  type ModuleContent,
  type LessonContent,
  type ProjectContent,
  type QuizContent,
  type StudentCourseResponse,
  type GitHubPrecheckResponse,
} from "@/lib/api"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ProjectDefenseInterview } from "./_components/project-defense-interview"

// ============================================
// LESSON CONTENT VIEW
// ============================================

interface LessonContentViewProps {
  courseTitle: string
  moduleOrder: number
  lesson: LessonContent
  onComplete: () => void
  onNext: () => void
  hasNext: boolean
  isCompleting: boolean
  previewMode?: boolean
}

function LessonContentView({
  courseTitle,
  moduleOrder,
  lesson,
  onComplete,
  onNext,
  hasNext,
  isCompleting,
  previewMode = false,
}: LessonContentViewProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const overviewSpeechText = [lesson.title, lesson.description, lesson.content]
    .filter(Boolean)
    .join(". ")
    .trim()

  useEffect(() => {
    // Reset audio player state when switching lessons or voice persona
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAudio(false)
    setIsGeneratingAudio(false)
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [lesson.lesson_id, selectedVoice])

  const handleToggleOverviewAudio = async () => {
    if (!overviewSpeechText) {
      toast.error("No overview text available to read")
      return
    }

    // If audio is already loaded, toggle play/pause
    if (audioUrl && audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause()
        setIsPlayingAudio(false)
      } else {
        await audioRef.current.play()
        setIsPlayingAudio(true)
      }
      return
    }

    setIsGeneratingAudio(true)
    try {
      const audioBlob = await studentCoursesApi.synthesizeLessonOverviewSpeech(
        overviewSpeechText,
        selectedVoice
      )
      const objectUrl = URL.createObjectURL(audioBlob)
      setAudioUrl(objectUrl)
      const audio = new Audio(objectUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlayingAudio(false)
      audio.onpause = () => setIsPlayingAudio(false)
      audio.onplay = () => setIsPlayingAudio(true)
      await audio.play()
      setIsPlayingAudio(true)
    } catch (error: any) {
      console.error("Failed to generate overview audio:", error)
      const detail = error?.response?.data?.detail || "Failed to generate audio overview"
      toast.error(detail)
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleStopOverviewAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlayingAudio(false)
    }
  }

  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
      /youtube\.com\/v\/([\w-]{11})/,
      /youtube\.com\/shorts\/([\w-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`
      }
    }

    if (url.includes("youtube.com/embed/")) {
      return url
    }

    return null
  }

  const youtubeEmbedUrl = lesson.youtube_video_url ? getYouTubeEmbedUrl(lesson.youtube_video_url) : null
  const contentEmbedUrl = lesson.content_url ? getYouTubeEmbedUrl(lesson.content_url) : null
  const embedUrl = youtubeEmbedUrl || contentEmbedUrl

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Course Title & Chapter Header (Matching Reference Image) */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{courseTitle}</h2>
        <p className="mt-1 text-xs font-medium text-gray-400 sm:text-sm">
          Chapter {moduleOrder} - {lesson.title}
        </p>
      </div>

      {/* Video Player / Media Stage */}
      {embedUrl ? (
        <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative shadow-sm border border-gray-200">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={lesson.title}
          />
        </div>
      ) : lesson.content_url ? (
        <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden relative shadow-sm border border-gray-200">
          {lesson.content_type?.toLowerCase() === "video" ? (
            <iframe
              src={lesson.content_url}
              className="w-full h-full"
              allowFullScreen
              title={lesson.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center mb-3 shadow-md">
                <PlayCircle className="w-7 h-7" />
              </div>
              <p className="font-semibold text-base mb-2">{lesson.title}</p>
              <a
                href={lesson.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Lesson Resource
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {lesson.content_type || "Reading Lesson"}
              </p>
              <h3 className="text-base font-bold text-gray-900 truncate">{lesson.title}</h3>
            </div>
          </div>
          {lesson.estimated_minutes && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 shrink-0">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {lesson.estimated_minutes} min
            </span>
          )}
        </div>
      )}

      {/* Overview Section */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900 sm:text-lg">Overview</h3>
            {(lesson.description || lesson.content) && (
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  disabled={isGeneratingAudio}
                  aria-label="Select narrator voice"
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="en-US-AriaNeural">Aria (US Female)</option>
                  <option value="en-US-ChristopherNeural">Christopher (US Male)</option>
                  <option value="en-NG-EzinneNeural">Ezinne (NG Female)</option>
                  <option value="en-NG-AbeoNeural">Abeo (NG Male)</option>
                  <option value="en-GB-SoniaNeural">Sonia (UK Female)</option>
                  <option value="en-GB-RyanNeural">Ryan (UK Male)</option>
                </select>
                <button
                  type="button"
                  onClick={handleToggleOverviewAudio}
                  disabled={isGeneratingAudio}
                  aria-label={isPlayingAudio ? "Pause audio overview" : "Listen to overview"}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                    isPlayingAudio
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#EBF2FF] hover:bg-[#DCE8FF] text-[#2563EB]"
                  }`}
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Audio...</span>
                    </>
                  ) : isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Audio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen to Overview</span>
                    </>
                  )}
                </button>
                {audioUrl && isPlayingAudio && (
                  <button
                    type="button"
                    onClick={handleStopOverviewAudio}
                    aria-label="Stop audio overview"
                    title="Stop audio"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {lesson.content_type && (
              <span className="flex items-center gap-1 capitalize">
                <FileText className="w-3.5 h-3.5" />
                {lesson.content_type}
              </span>
            )}
            {lesson.estimated_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {lesson.estimated_minutes} min
              </span>
            )}
          </div>
        </div>

        {lesson.description && (
          <p className="text-sm leading-relaxed text-gray-500">{lesson.description}</p>
        )}

        {lesson.content && (
          <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-600">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-5 mb-2">{children}</h1>,
                table: ({ children }) => <table className="table-auto w-full border-collapse border border-gray-300 my-3">{children}</table>,
                thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                th: ({ children }) => <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">{children}</th>,
                tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
                td: ({ children }) => <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{children}</td>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-gray-600 leading-relaxed my-2.5">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 my-2.5 text-gray-600">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-gray-600">{children}</ol>,
                li: ({ children }) => <li className="text-gray-600">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-3 text-xs">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-3">{children}</blockquote>,
              }}
            >
              {lesson.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Expected Outcomes */}
      {lesson.expected_outcomes && lesson.expected_outcomes.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-[#F2F7FF] p-4 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            What You&apos;ll Learn
          </h4>
          <ul className="space-y-2">
            {lesson.expected_outcomes.map((outcome, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* External Resources */}
      {lesson.external_resources && lesson.external_resources.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            External Resources
          </h4>
          <ul className="space-y-2">
            {lesson.external_resources.map((resource, idx) => (
              <li key={idx}>
                <a
                  href={resource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span className="break-all">{resource}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion and Navigation Action Bar */}
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!previewMode && !lesson.is_completed ? (
            <Button
              onClick={onComplete}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5"
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
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Lesson Completed</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Preview mode hides completion controls.</div>
          )}
        </div>

        {hasNext && (
          <Button
            onClick={onNext}
            className="bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl px-6"
            disabled={!previewMode && !lesson.is_completed}
          >
            Next Lesson
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
  courseTitle: string
  moduleOrder: number
  project: ProjectContent
  onSubmit: (link: string) => Promise<void>
  onToggleMilestone: (projectId: number, moduleId: number, milestoneId: string, completed: boolean) => Promise<void>
  onNext: () => void
  hasNext: boolean
  previewMode?: boolean
}

function ProjectContentView({
  courseTitle,
  moduleOrder,
  project,
  onSubmit,
  onToggleMilestone,
  onNext,
  hasNext,
  previewMode = false,
}: ProjectContentViewProps) {
  const [linkValue, setLinkValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [togglingMilestoneId, setTogglingMilestoneId] = useState<string | null>(null)
  const [isCheckingRepo, setIsCheckingRepo] = useState(false)
  const [precheckReport, setPrecheckReport] = useState<GitHubPrecheckResponse | null>(null)

  useEffect(() => {
    setPrecheckReport(null)
    setLinkValue("")
    setIsEditing(false)
  }, [project.project_id])

  const milestones = project.milestones && project.milestones.length > 0
    ? project.milestones
    : [
        {
          id: "m1",
          title: "Milestone 1: Setup & Data Model",
          description: "Initialize your repository, configure dependencies, and create the core folder structure or schema stubs.",
          order: 1,
        },
        {
          id: "m2",
          title: "Milestone 2: Core Logic",
          description: "Implement the main project features, wire up validation or state flow, and verify happy-path behavior.",
          order: 2,
        },
        {
          id: "m3",
          title: "Milestone 3: Edge Cases & GitHub Readiness",
          description: "Handle error cases, add a clear README with setup steps, and push clean commits to a public GitHub repo.",
          order: 3,
        },
      ]
  const completedMilestoneIds = project.completed_milestones ?? []
  const checkedCount = milestones.filter((m) => completedMilestoneIds.includes(m.id)).length
  const milestonePct = milestones.length > 0 ? Math.round((checkedCount / milestones.length) * 100) : 0

  const handleToggle = async (milestoneId: string, currentlyChecked: boolean) => {
    if (previewMode || togglingMilestoneId) return
    setTogglingMilestoneId(milestoneId)
    try {
      await onToggleMilestone(project.project_id, project.module_id, milestoneId, !currentlyChecked)
    } finally {
      setTogglingMilestoneId(null)
    }
  }

  const handleRunPrecheck = async (targetUrl?: string) => {
    const urlToCheck = (targetUrl ?? linkValue).trim()
    if (!urlToCheck) return
    setIsCheckingRepo(true)
    try {
      const report = await studentCoursesApi.precheckProjectRepo(project.project_id, urlToCheck)
      setPrecheckReport(report)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || "Failed to run repository pre-check"
      toast.error(errorMsg)
    } finally {
      setIsCheckingRepo(false)
    }
  }

  const handleSubmit = async () => {
    if (!linkValue.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(linkValue)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUrl = async () => {
    if (!editValue.trim()) return
    setIsUpdating(true)
    try {
      await studentCoursesApi.updateProjectSubmissionUrl(
        project.submission_id,
        editValue.trim(),
        project.module_id
      )
      toast.success("Project link updated successfully!")
      setIsEditing(false)
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || "Failed to update project link"
      toast.error(errorMsg)
      console.error("Error updating project URL:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{courseTitle}</h2>
        <p className="mt-1 text-xs font-medium text-gray-400 sm:text-sm">
          Chapter {moduleOrder} - Project: {project.title}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-[#F8F9FA] p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              Hands-On Project
            </span>
            <h3 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">{project.title}</h3>
          </div>
        </div>

        {project.description && (
          <div className="prose prose-gray max-w-none text-sm">
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
                h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-gray-600">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-gray-600">{children}</ol>,
                li: ({ children }) => <li className="text-gray-600">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-blue-700">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-3 text-xs">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>,
              }}
            >
              {project.description}
            </ReactMarkdown>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {project.estimated_hours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Estimated: ~{project.estimated_hours} hours
            </span>
          )}
          {project.starter_repo_url && (
            <a
              href={project.starter_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Starter Code
            </a>
          )}
        </div>
      </div>

      {project.required_skills && project.required_skills.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">Required Skills</h4>
          <div className="flex flex-wrap gap-2">
            {project.required_skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Progressive Micro-Milestones Checklist */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Project Micro-Milestones</h4>
            <p className="text-xs text-gray-500">
              Check off each milestone as you build to track your progress and earn +5 XP per step.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
              checkedCount >= milestones.length
                ? "bg-[#16A34A] text-white"
                : "bg-[#2563EB] text-white"
            }`}
          >
            {checkedCount} of {milestones.length} milestones checked
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              checkedCount >= milestones.length ? "bg-[#16A34A]" : "bg-[#2563EB]"
            }`}
            style={{ width: `${milestonePct}%` }}
          />
        </div>

        <div className="space-y-2.5">
          {milestones.map((milestone) => {
            const isChecked = completedMilestoneIds.includes(milestone.id)
            const isBusy = togglingMilestoneId === milestone.id
            return (
              <button
                key={milestone.id}
                type="button"
                disabled={previewMode || isBusy}
                onClick={() => handleToggle(milestone.id, isChecked)}
                className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  isChecked
                    ? "bg-[#F0FDF4] border-[#BBF7D0]"
                    : "bg-[#F8FAFC] border-gray-200 hover:border-[#2563EB]"
                } disabled:opacity-70`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? "bg-[#16A34A] border-[#16A34A] text-white"
                      : "bg-white border-gray-300 text-transparent"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      isChecked ? "text-[#166534] line-through" : "text-gray-900"
                    }`}
                  >
                    {milestone.title}
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      {milestone.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {previewMode ? (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">Preview Mode</h4>
          <p className="text-xs text-gray-600">
            Students would normally see the project submission area here. In preview, submission controls are hidden.
          </p>
        </div>
      ) : !project.is_submitted ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Submit Your Project</h4>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Link2 className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRunPrecheck()}
                disabled={!linkValue.trim() || isCheckingRepo}
                className="w-full border-[#2563EB] text-[#2563EB] hover:bg-blue-50 rounded-xl px-4 sm:w-auto"
              >
                {isCheckingRepo ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                )}
                Pre-Check Repo
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!linkValue.trim() || isSubmitting}
                className="w-full bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl px-6 sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Submit
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Paste your public GitHub repository URL and click Pre-Check Repo for instant readiness feedback before mentor review.
            </p>
          </div>

          {precheckReport && (
            <div
              className={`rounded-xl border p-4 ${
                precheckReport.readiness_status === "ready"
                  ? "bg-[#F0FDF4] border-[#BBF7D0]"
                  : precheckReport.readiness_status === "needs_attention"
                  ? "bg-[#FFFBEB] border-[#FDE68A]"
                  : "bg-[#FEF2F2] border-[#FECACA]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {precheckReport.readiness_status === "ready" ? (
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  ) : precheckReport.readiness_status === "needs_attention" ? (
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                  )}
                  <span className="text-xs font-bold text-gray-900">
                    GitHub Pre-Flight Check
                    {precheckReport.repo_full_name ? ` — ${precheckReport.repo_full_name}` : ""}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold text-white ${
                    precheckReport.readiness_status === "ready"
                      ? "bg-[#16A34A]"
                      : precheckReport.readiness_status === "needs_attention"
                      ? "bg-[#EA580C]"
                      : "bg-[#DC2626]"
                  }`}
                >
                  {precheckReport.readiness_status === "ready"
                    ? "Ready to Submit"
                    : precheckReport.readiness_status === "needs_attention"
                    ? "Needs Attention"
                    : "Blocked"}
                </span>
              </div>

              <p className="text-xs text-gray-700 mb-2.5">{precheckReport.summary}</p>

              <ul className="space-y-1.5 text-xs text-gray-800 list-disc list-inside">
                {precheckReport.bullets.map((bullet, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>

              {precheckReport.detected_stack.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {precheckReport.detected_stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] font-medium text-gray-700"
                    >
                      {tech}
                    </span>
                  ))}
                  {precheckReport.file_count > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] font-medium text-gray-500">
                      {precheckReport.file_count} files
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl border ${
              project.submission_status === "approved"
                ? "bg-green-50 border-green-200"
                : project.submission_status === "rejected"
                ? "bg-red-50 border-red-200"
                : project.submission_status === "in_review"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {project.submission_status === "approved" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : project.submission_status === "rejected" ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : project.submission_status === "in_review" ? (
                  <Clock className="w-5 h-5 text-yellow-600" />
                ) : (
                  <FileCheck className="w-5 h-5 text-blue-600" />
                )}
                <span
                  className={`font-medium text-sm ${
                    project.submission_status === "approved"
                      ? "text-green-700"
                      : project.submission_status === "rejected"
                      ? "text-red-700"
                      : project.submission_status === "in_review"
                      ? "text-yellow-700"
                      : "text-blue-700"
                  }`}
                >
                  {project.submission_status === "approved"
                    ? "Project Approved"
                    : project.submission_status === "rejected"
                    ? "Revision Requested"
                    : project.submission_status === "in_review"
                    ? "Under Review"
                    : "Submitted"}
                </span>
              </div>
              {project.points_earned !== null && project.points_earned > 0 && (
                <span className="text-sm font-semibold text-green-600">
                  +{project.points_earned} points
                </span>
              )}
            </div>

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

            {project.submitted_at && (
              <p className="text-xs text-gray-500 mt-2">
                Submitted on {new Date(project.submitted_at).toLocaleDateString()} at{" "}
                {new Date(project.submitted_at).toLocaleTimeString()}
              </p>
            )}

            {project.reviewed_at && (
              <p className="text-xs text-gray-600 mt-3 p-2 bg-gray-100 rounded flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                This submission has been reviewed and cannot be updated.
              </p>
            )}
          </div>

          {project.reviewer_feedback && (
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
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
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.reviewer_feedback}</p>
              </div>
            </div>
          )}

          {!project.reviewed_at && project.is_submitted && (
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              {isEditing ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 text-sm">Update Your Submission Link</h4>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="https://github.com/username/project"
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateUrl}
                      disabled={!editValue.trim() || isUpdating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Update Link
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false)
                        setEditValue("")
                      }}
                      disabled={isUpdating}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-600">
                    Need to fix something? You can update your submission link before it&apos;s reviewed.
                  </p>
                  <Button
                    onClick={() => {
                      setEditValue(project.submission_url || "")
                      setIsEditing(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    Edit Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 1: Project Defense Interview at the end of each project */}
      <ProjectDefenseInterview project={project} previewMode={previewMode} />

      {hasNext && (
        <div className="border-t border-gray-100 pt-4 flex justify-end">
          <Button
            onClick={onNext}
            className="w-full bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl px-6 sm:w-auto"
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
  courseTitle: string
  moduleOrder: number
  quiz: QuizContent
  moduleTitle: string
  onSubmitAnswer: (
    questionId: number,
    answer: string
  ) => Promise<{
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
    points_earned: number
  }>
  onNext: () => void
  hasNext: boolean
  previewMode?: boolean
}

function QuizMarkdown({
  content,
  className = "",
  inline = false,
}: {
  content: string
  className?: string
  inline?: boolean
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) =>
            inline ? <span>{children}</span> : <p className="my-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ className, children }) => {
            const isInline = !className
            return isInline ? (
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-blue-700">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-3 text-sm text-gray-100">
              {children}
            </pre>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-gray-300 pl-4 italic text-gray-600">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function QuizContentView({
  courseTitle,
  moduleOrder,
  quiz,
  moduleTitle,
  onSubmitAnswer,
  onNext,
  hasNext,
  previewMode = false,
}: QuizContentViewProps) {
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

      setLastAnswerResult({
        is_correct: result.is_correct,
        correct_answer: result.correct_answer,
        explanation: result.explanation,
      })

      setLocalQuestions((prev) =>
        prev.map((q, idx) =>
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
        )
      )
    } catch (error) {
      console.error("Failed to submit answer:", error)
      toast.error("Failed to submit answer. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setSelectedAnswer(null)
      setLastAnswerResult(null)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex((prev) => prev - 1)
      setSelectedAnswer(null)
      setLastAnswerResult(null)
    }
  }

  const answeredQuestions = localQuestions.filter((q) => q.is_answered)
  const correctAnswers = localQuestions.filter((q) => q.is_correct)
  const localScorePercent =
    answeredQuestions.length > 0
      ? Math.round((correctAnswers.length / localQuestions.length) * 100)
      : quiz.score_percent

  if (!previewMode && (showResults || quiz.is_completed)) {
    const passPercentage = 70
    const passed = localScorePercent >= passPercentage

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{courseTitle}</h2>
          <p className="mt-1 text-xs font-medium text-gray-400 sm:text-sm">
            Chapter {moduleOrder} - {moduleTitle} Quiz
          </p>
        </div>

        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 ${
              passed ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            <span className={`text-2xl font-bold ${passed ? "text-green-600" : "text-amber-600"}`}>
              {localScorePercent}%
            </span>
          </div>
          <h3 className={`text-lg font-bold mb-1 ${passed ? "text-green-700" : "text-amber-700"}`}>
            {passed ? "Congratulations! You Passed!" : "Almost There!"}
          </h3>
          <p className="text-sm text-gray-600">
            You got {correctAnswers.length} out of {localQuestions.length} questions correct.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 text-sm">Question Review</h4>
          {localQuestions.map((q, idx) => (
            <div
              key={q.question_id}
              className={`p-4 rounded-xl border ${
                q.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    q.is_correct ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {q.is_correct ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">
                    <span>Q{idx + 1}: </span>
                    <QuizMarkdown content={q.question_text} inline className="inline" />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span>Your answer: </span>
                    {q.user_answer ? (
                      <QuizMarkdown content={q.user_answer} inline className="inline font-medium" />
                    ) : (
                      <span className="font-medium">Not answered</span>
                    )}
                  </div>
                  {!q.is_correct && q.correct_answer && (
                    <div className="text-xs text-green-700 mt-1">
                      <span>Correct answer: </span>
                      <QuizMarkdown content={q.correct_answer} inline className="inline font-medium" />
                    </div>
                  )}
                  {q.explanation && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-xs font-semibold text-blue-800">Explanation:</span>
                      <QuizMarkdown content={q.explanation} className="mt-1 text-xs text-blue-800" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
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
            <Button onClick={onNext} className="bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{courseTitle}</h2>
        <p className="mt-1 text-xs font-medium text-gray-400 sm:text-sm">
          Chapter {moduleOrder} - {moduleTitle} Quiz
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Question {currentQuestionIndex + 1} of {quiz.total_questions}
        </span>
        <span>{quiz.answered_count} answered</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / quiz.total_questions) * 100}%` }}
        />
      </div>

      {currentQuestion && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            {currentQuestion.difficulty_level && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  currentQuestion.difficulty_level === "easy"
                    ? "bg-green-100 text-green-700"
                    : currentQuestion.difficulty_level === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {currentQuestion.difficulty_level}
              </span>
            )}
            <span className="text-xs text-gray-400">{currentQuestion.points} points</span>
          </div>

          <QuizMarkdown
            content={currentQuestion.question_text}
            className="mb-5 text-base font-semibold text-gray-900"
          />

          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option || currentQuestion.user_answer === option
                const isAnswered = currentQuestion.is_answered
                const isCorrect =
                  isAnswered && currentQuestion.is_correct && currentQuestion.user_answer === option

                return (
                  <button
                    key={idx}
                    onClick={() => !isAnswered && !previewMode && setSelectedAnswer(option)}
                    disabled={isAnswered || previewMode}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                      isAnswered
                        ? isCorrect
                          ? "border-green-300 bg-green-50"
                          : isSelected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 bg-gray-50 opacity-60"
                        : isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isAnswered
                            ? isCorrect
                              ? "border-green-500 bg-green-500"
                              : isSelected
                              ? "border-red-500 bg-red-500"
                              : "border-gray-300"
                            : isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {(isSelected || isCorrect) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <QuizMarkdown
                        content={option}
                        inline
                        className={`text-sm font-medium ${
                          isAnswered && !isSelected ? "text-gray-500" : "text-gray-900"
                        }`}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={selectedAnswer || currentQuestion.user_answer || ""}
              onChange={(e) =>
                !currentQuestion.is_answered && !previewMode && setSelectedAnswer(e.target.value)
              }
              disabled={currentQuestion.is_answered || previewMode}
              placeholder="Type your answer here..."
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-25 disabled:bg-gray-50 disabled:text-gray-500 text-sm"
            />
          )}

          {currentQuestion.is_answered && currentQuestion.explanation && (
            <div
              className={`mt-4 p-4 rounded-xl border ${
                currentQuestion.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {currentQuestion.is_correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      currentQuestion.is_correct ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {currentQuestion.is_correct ? "Correct!" : "Incorrect"}
                  </p>
                  <div className="text-xs text-gray-700 mt-1">
                    <span className="font-medium">Explanation:</span>
                    <QuizMarkdown content={currentQuestion.explanation} className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {lastAnswerResult && !currentQuestion.is_answered && (
            <div
              className={`mt-4 p-4 rounded-xl border ${
                lastAnswerResult.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {lastAnswerResult.is_correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-semibold text-sm ${
                      lastAnswerResult.is_correct ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {lastAnswerResult.is_correct ? "Correct!" : "Incorrect"}
                  </p>
                  {lastAnswerResult.explanation && (
                    <div className="text-xs text-gray-700 mt-1">
                      <span className="font-medium">Explanation:</span>
                      <QuizMarkdown content={lastAnswerResult.explanation} className="mt-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          className="w-full sm:w-auto rounded-xl"
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
              className="w-full bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl sm:w-auto"
            >
              {isLastQuestion ? "Next" : "Next Question"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button className="w-full bg-[#4E89FF] text-white rounded-xl sm:w-auto" disabled>
              Preview Complete
            </Button>
          )
        ) : currentQuestion?.is_answered ? (
          <Button
            onClick={handleNextQuestion}
            className="w-full bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl sm:w-auto"
          >
            {isLastQuestion ? "View Results" : "Next Question"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || isSubmitting}
            className="w-full bg-[#4E89FF] hover:bg-blue-600 text-white rounded-xl sm:w-auto"
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
// FOCUSED RIGHT-HAND MODULE & LESSON PANEL
// ============================================

interface FocusedModuleRailProps {
  courseContent: LearningContentResponse
  activeModule: ModuleContent | null
  activeItemId: string | null
  isOtherModulesOpen: boolean
  onToggleOtherModules: () => void
  onSelectModule: (module: ModuleContent) => void
  onSelectItem: (itemId: string, type: "lesson" | "project" | "quiz") => void
  otherCourses: StudentCourseResponse[]
  onCloseMobile?: () => void
}

function FocusedModuleRail({
  courseContent,
  activeModule,
  activeItemId,
  isOtherModulesOpen,
  onToggleOtherModules,
  onSelectModule,
  onSelectItem,
  otherCourses,
  onCloseMobile,
}: FocusedModuleRailProps) {
  const currentModule = activeModule || courseContent.modules[0] || null
  const currentModuleIndex = currentModule
    ? courseContent.modules.findIndex((m) => m.module_id === currentModule.module_id)
    : -1
  const nextModule =
    currentModuleIndex >= 0 && currentModuleIndex < courseContent.modules.length - 1
      ? courseContent.modules[currentModuleIndex + 1]
      : null

  const otherModules = courseContent.modules.filter(
    (m) => !currentModule || m.module_id !== currentModule.module_id
  )

  return (
    <div className="space-y-7">
      {/* Class Chapter / Active Module Section */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900">Class Chapter</h3>
          {otherModules.length > 0 && (
            <button
              type="button"
              onClick={onToggleOtherModules}
              className="text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {isOtherModulesOpen ? "Hide all" : "See all"}
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          {nextModule
            ? `Next Chapter ${nextModule.order} - ${nextModule.title}`
            : `${courseContent.progress.overall_percent}% overall course progress`}
        </p>

        {/* Active Module Card: Displays ONLY the active module and its lessons */}
        {currentModule && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-[#4E89FF]/20 bg-[#F3F8FF] transition-all duration-300">
            {/* Active Module Blue Pill Header */}
            <div className="bg-[#4E89FF] px-4 py-3.5 text-white flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#4E89FF] text-xs font-bold flex items-center justify-center shrink-0">
                {currentModule.order}
              </span>
              <span className="text-xs font-semibold leading-snug truncate flex-1">
                {currentModule.title}
              </span>
            </div>

            {/* Active Module Lessons List (Only lessons/items for this active module) */}
            <div className="divide-y divide-[#E4EEFF]">
              {currentModule.lessons.map((lesson) => {
                const itemId = `lesson-${lesson.lesson_id}`
                const isActive = activeItemId === itemId
                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => {
                      onSelectItem(itemId, "lesson")
                      onCloseMobile?.()
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#E6F0FF] text-[#2563EB] font-semibold"
                        : "hover:bg-[#EBF3FF] text-gray-600 font-medium"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        lesson.is_completed
                          ? "text-[#4E89FF]"
                          : isActive
                          ? "text-[#2563EB]"
                          : "text-gray-400"
                      }`}
                    />
                    <span className="text-xs leading-snug break-words flex-1">
                      {lesson.title}
                    </span>
                  </button>
                )
              })}

              {currentModule.quiz && currentModule.quiz.questions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectItem(`quiz-${currentModule.module_id}`, "quiz")
                    onCloseMobile?.()
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                    activeItemId === `quiz-${currentModule.module_id}`
                      ? "bg-[#E6F0FF] text-[#2563EB] font-semibold"
                      : "hover:bg-[#EBF3FF] text-gray-600 font-medium"
                  }`}
                >
                  <HelpCircle
                    className={`w-4 h-4 shrink-0 ${
                      currentModule.quiz.is_completed ? "text-[#4E89FF]" : "text-amber-500"
                    }`}
                  />
                  <span className="text-xs leading-snug flex-1">Module Quiz</span>
                  {currentModule.quiz.is_completed && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {currentModule.quiz.score_percent}%
                    </span>
                  )}
                </button>
              )}

              {currentModule.projects.map((project) => {
                const itemId = `project-${project.project_id}`
                const isActive = activeItemId === itemId
                return (
                  <button
                    key={itemId}
                    type="button"
                    onClick={() => {
                      onSelectItem(itemId, "project")
                      onCloseMobile?.()
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#E6F0FF] text-[#2563EB] font-semibold"
                        : "hover:bg-[#EBF3FF] text-gray-600 font-medium"
                    }`}
                  >
                    <Code2
                      className={`w-4 h-4 shrink-0 ${
                        project.is_completed ? "text-[#4E89FF]" : "text-gray-400"
                      }`}
                    />
                    <span className="text-xs leading-snug break-words flex-1">
                      Project: {project.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom Collapsible Module Switcher for Accessibility */}
        {otherModules.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onToggleOtherModules}
              aria-expanded={isOtherModulesOpen}
              aria-controls="collapsible-course-modules"
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F4F5F7] hover:bg-gray-200/70 text-gray-700 text-xs font-semibold transition-all duration-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4E89FF]" />
                {isOtherModulesOpen
                  ? "Collapse other modules"
                  : `Browse all modules (${otherModules.length} more)`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                  isOtherModulesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOtherModulesOpen && (
              <div
                id="collapsible-course-modules"
                className="mt-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                {otherModules.map((mod) => {
                  const isCompleted = mod.progress_percent === 100
                  const isPrior = currentModule ? mod.order < currentModule.order : false
                  return (
                    <button
                      key={mod.module_id}
                      type="button"
                      onClick={() => {
                        onSelectModule(mod)
                        onCloseMobile?.()
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-left flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer ${
                        isCompleted || isPrior
                          ? "bg-[#BFD8FF] hover:bg-[#add0ff] text-[#2B59A2]"
                          : "bg-[#9FA6B9] hover:bg-[#8f97ac] text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                            isCompleted || isPrior
                              ? "bg-[#D9E8FF] text-[#2B59A2]"
                              : "bg-white text-[#6B7280]"
                          }`}
                        >
                          {mod.order}
                        </span>
                        <span className="text-xs font-medium truncate">{mod.title}</span>
                      </div>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2B59A2]" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 opacity-75" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Other Class / Your Other Class Progress */}
      {otherCourses.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Other class</h3>
          <p className="mt-0.5 text-xs text-gray-400">Your other class progress</p>

          <div className="mt-4 space-y-3.5">
            {otherCourses.slice(0, 2).map((course) => (
              <Link
                key={course.course_id}
                href={`/dashboard/courses/${course.slug}/learn`}
                className="flex items-center gap-3.5 p-2.5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-[#F9FBFF] transition-all group"
              >
                <div className="w-24 h-18 rounded-xl bg-gray-100 overflow-hidden relative shrink-0 flex items-center justify-center">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-xs">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {course.completed_modules} of {course.total_modules} course progress
                  </p>
                  <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4E89FF] rounded-full transition-all duration-300"
                      style={{ width: `${course.progress_percent}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN IN-DASHBOARD LEARNING PAGE
// ============================================

export default function DashboardLearningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreviewMode = searchParams.get("preview") === "1" || searchParams.get("preview") === "true"

  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [courseContent, setCourseContent] = useState<LearningContentResponse | null>(null)
  const [otherCourses, setOtherCourses] = useState<StudentCourseResponse[]>([])
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeItemType, setActiveItemType] = useState<"lesson" | "project" | "quiz" | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isOtherModulesOpen, setIsOtherModulesOpen] = useState(false)
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false)
  const mainStageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await studentCoursesApi.getLearningContentBySlug(
          id,
          isPreviewMode ? { preview: true } : undefined
        )
        setCourseContent(content)
        setIsEnrolled(true)

        if (content.modules.length > 0) {
          let selected = false
          for (const mod of content.modules) {
            const firstIncompleteLesson = mod.lessons.find((l) => !l.is_completed)
            if (firstIncompleteLesson) {
              setActiveItemId(`lesson-${firstIncompleteLesson.lesson_id}`)
              setActiveItemType("lesson")
              selected = true
              break
            }
            if (mod.quiz && !mod.quiz.is_completed && mod.quiz.questions.length > 0) {
              setActiveItemId(`quiz-${mod.module_id}`)
              setActiveItemType("quiz")
              selected = true
              break
            }
            const firstIncompleteProject = mod.projects.find((p) => !p.is_completed)
            if (firstIncompleteProject) {
              setActiveItemId(`project-${firstIncompleteProject.project_id}`)
              setActiveItemType("project")
              selected = true
              break
            }
          }

          if (!selected) {
            const firstMod = content.modules[0]
            if (firstMod.lessons.length > 0) {
              setActiveItemId(`lesson-${firstMod.lessons[0].lesson_id}`)
              setActiveItemType("lesson")
            } else if (firstMod.quiz && firstMod.quiz.questions.length > 0) {
              setActiveItemId(`quiz-${firstMod.module_id}`)
              setActiveItemType("quiz")
            } else if (firstMod.projects.length > 0) {
              setActiveItemId(`project-${firstMod.projects[0].project_id}`)
              setActiveItemType("project")
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

  useEffect(() => {
    studentCoursesApi
      .getMyCourses()
      .then((res) => {
        setOtherCourses(res.enrolled.filter((c) => c.slug !== id))
      })
      .catch(() => {
        // Non-blocking if other courses fail to load
      })
  }, [id])

  useEffect(() => {
    if (!activeItemId) return
    mainStageRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [activeItemId])

  const handleSelectItem = (itemId: string, type: "lesson" | "project" | "quiz") => {
    setActiveItemId(itemId)
    setActiveItemType(type)
  }

  const handleSelectModule = (mod: ModuleContent) => {
    if (mod.lessons.length > 0) {
      setActiveItemId(`lesson-${mod.lessons[0].lesson_id}`)
      setActiveItemType("lesson")
    } else if (mod.quiz && mod.quiz.questions.length > 0) {
      setActiveItemId(`quiz-${mod.module_id}`)
      setActiveItemType("quiz")
    } else if (mod.projects.length > 0) {
      setActiveItemId(`project-${mod.projects[0].project_id}`)
      setActiveItemType("project")
    }
    setIsOtherModulesOpen(false)
  }

  const activeModule = courseContent
    ? courseContent.modules.find((mod) => {
        if (!activeItemId) return false
        if (activeItemType === "quiz") return activeItemId === `quiz-${mod.module_id}`
        if (activeItemType === "lesson")
          return mod.lessons.some((l) => activeItemId === `lesson-${l.lesson_id}`)
        if (activeItemType === "project")
          return mod.projects.some((p) => activeItemId === `project-${p.project_id}`)
        return false
      }) || courseContent.modules[0] || null
    : null

  const getActiveLesson = (): LessonContent | null => {
    if (!activeItemId || activeItemType !== "lesson" || !courseContent) return null
    const lessonId = parseInt(activeItemId.replace("lesson-", ""))
    for (const mod of courseContent.modules) {
      const lesson = mod.lessons.find((l) => l.lesson_id === lessonId)
      if (lesson) return lesson
    }
    return null
  }

  const getActiveProject = (): { project: ProjectContent; moduleId: number } | null => {
    if (!activeItemId || activeItemType !== "project" || !courseContent) return null
    const projectId = parseInt(activeItemId.replace("project-", ""))
    for (const mod of courseContent.modules) {
      const project = mod.projects.find((p) => p.project_id === projectId)
      if (project) return { project, moduleId: mod.module_id }
    }
    return null
  }

  const getActiveQuiz = (): { quiz: QuizContent; moduleTitle: string } | null => {
    if (!activeItemId || activeItemType !== "quiz" || !courseContent) return null
    const moduleId = parseInt(activeItemId.replace("quiz-", ""))
    for (const mod of courseContent.modules) {
      if (mod.module_id === moduleId && mod.quiz) {
        return { quiz: mod.quiz, moduleTitle: mod.title }
      }
    }
    return null
  }

  const getNextItem = (): { id: string; type: "lesson" | "project" | "quiz"; moduleId: number } | null => {
    if (!courseContent || !activeItemId || !activeItemType) return null

    const allItems: { id: string; type: "lesson" | "project" | "quiz"; moduleId: number }[] = []

    for (const mod of courseContent.modules) {
      for (const lesson of mod.lessons) {
        allItems.push({ id: `lesson-${lesson.lesson_id}`, type: "lesson", moduleId: mod.module_id })
      }
      if (mod.quiz && mod.quiz.questions.length > 0) {
        allItems.push({ id: `quiz-${mod.module_id}`, type: "quiz", moduleId: mod.module_id })
      }
      for (const project of mod.projects) {
        allItems.push({ id: `project-${project.project_id}`, type: "project", moduleId: mod.module_id })
      }
    }

    const currentIndex = allItems.findIndex((item) => item.id === activeItemId)
    if (currentIndex === -1 || currentIndex === allItems.length - 1) return null

    return allItems[currentIndex + 1]
  }

  const handleNext = () => {
    const nextItem = getNextItem()
    if (nextItem) {
      setActiveItemId(nextItem.id)
      setActiveItemType(nextItem.type)
    }
  }

  const hasNextItem = (): boolean => getNextItem() !== null

  const handleSubmitQuizAnswer = async (
    questionId: number,
    answer: string
  ): Promise<{
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
    points_earned: number
  }> => {
    const result = await studentCoursesApi.submitQuizAnswer(questionId, answer)

    if (courseContent && activeItemId) {
      const moduleId = parseInt(activeItemId.replace("quiz-", ""))
      const updatedModules = courseContent.modules.map((mod) => {
        if (mod.module_id !== moduleId || !mod.quiz) return mod

        const updatedQuestions = mod.quiz.questions.map((q) =>
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
        const answeredCount = updatedQuestions.filter((q) => q.is_answered).length
        const correctCount = updatedQuestions.filter((q) => q.is_correct).length
        const quizIsCompleted = answeredCount === mod.quiz.total_questions

        const totalItems = mod.lessons.length + mod.projects.length + 1
        const completedItems =
          mod.lessons.filter((l) => l.is_completed).length +
          mod.projects.filter((p) => p.is_completed).length +
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
          },
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
      await studentCoursesApi.markLessonComplete(lessonId, 0)
      toast.success("Lesson marked as complete!")

      const updatedModules = courseContent.modules.map((mod) => {
        const totalItems = mod.lessons.length + mod.projects.length + (mod.quiz ? 1 : 0)
        const completedItems =
          mod.lessons.filter((l) => l.is_completed || l.lesson_id === lessonId).length +
          mod.projects.filter((p) => p.is_completed).length +
          (mod.quiz?.is_completed ? 1 : 0)
        return {
          ...mod,
          lessons: mod.lessons.map((l) =>
            l.lesson_id === lessonId ? { ...l, is_completed: true } : l
          ),
          progress_percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        }
      })
      setCourseContent({
        ...courseContent,
        modules: updatedModules,
        progress: {
          ...courseContent.progress,
          completed_lessons: courseContent.progress.completed_lessons + 1,
          overall_percent: Math.round(
            ((courseContent.progress.completed_lessons +
              1 +
              courseContent.progress.completed_projects) /
              (courseContent.progress.total_lessons + courseContent.progress.total_projects)) *
              100
          ),
        },
      })
    } catch (error) {
      console.error("Failed to mark lesson as complete:", error)
      toast.error("Failed to mark lesson as complete. Please try again.")
    } finally {
      setIsCompleting(false)
    }
  }

  const handleToggleProjectMilestone = async (
    projectId: number,
    moduleId: number,
    milestoneId: string,
    completed: boolean
  ) => {
    if (!courseContent) return
    try {
      const res = await studentCoursesApi.toggleProjectMilestone(
        projectId,
        moduleId,
        milestoneId,
        completed
      )
      setCourseContent({
        ...courseContent,
        modules: courseContent.modules.map((mod) => ({
          ...mod,
          projects: mod.projects.map((p) =>
            p.project_id === projectId
              ? { ...p, completed_milestones: res.completed_milestones }
              : p
          ),
        })),
      })
      if (res.xp_awarded > 0) {
        toast.success(`Milestone completed! +${res.xp_awarded} XP`)
      }
    } catch (error) {
      console.error("Failed to toggle project milestone:", error)
      toast.error("Could not update milestone. Please try again.")
    }
  }

  const handleSubmitProject = async (link: string) => {
    if (!courseContent || !activeItemId) return

    const projectId = parseInt(activeItemId.replace("project-", ""))
    let moduleId: number | null = null
    for (const mod of courseContent.modules) {
      if (mod.projects.some((p) => p.project_id === projectId)) {
        moduleId = mod.module_id
        break
      }
    }

    if (!moduleId) {
      toast.error("Could not find module for this project")
      return
    }

    try {
      await studentCoursesApi.submitProject(projectId, moduleId, link)
      toast.success("Project submitted successfully!")

      const updatedModules = courseContent.modules.map((mod) => {
        const totalItems = mod.lessons.length + mod.projects.length + (mod.quiz ? 1 : 0)
        const completedItems =
          mod.lessons.filter((l) => l.is_completed).length +
          mod.projects.filter((p) => p.is_completed || p.project_id === projectId).length +
          (mod.quiz?.is_completed ? 1 : 0)
        return {
          ...mod,
          projects: mod.projects.map((p) =>
            p.project_id === projectId
              ? {
                  ...p,
                  is_completed: true,
                  is_submitted: true,
                  submission_url: link,
                  submission_status: "submitted" as const,
                  submitted_at: new Date().toISOString(),
                }
              : p
          ),
          progress_percent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        }
      })
      setCourseContent({
        ...courseContent,
        modules: updatedModules,
        progress: {
          ...courseContent.progress,
          completed_projects: courseContent.progress.completed_projects + 1,
          overall_percent: Math.round(
            ((courseContent.progress.completed_lessons +
              courseContent.progress.completed_projects +
              1) /
              (courseContent.progress.total_lessons + courseContent.progress.total_projects)) *
              100
          ),
        },
      })
    } catch (error) {
      console.error("Failed to submit project:", error)
      toast.error("Failed to submit project. Please try again.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading course content...</p>
        </div>
      </div>
    )
  }

  if (!isEnrolled || !courseContent) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">You are not enrolled in this course</p>
          <p className="text-gray-400 text-xs">Redirecting to course page...</p>
        </div>
      </div>
    )
  }

  const activeLesson = getActiveLesson()
  const activeProject = getActiveProject()
  const activeQuiz = getActiveQuiz()
  const currentModuleOrder = activeModule?.order || 1

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Left / Center Stage: Independently scrollable lesson/video/project/quiz area */}
      <div
        ref={mainStageRef}
        className="min-w-0 flex-1 h-full overflow-y-auto p-6 lg:px-10 lg:py-8"
      >
        <div className="max-w-4xl mx-auto pb-10">
          {/* Mobile Trigger for Right Module Rail */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <Link
              href="/dashboard/courses"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              ← Back to My Courses
            </Link>
            <Sheet open={isMobileRailOpen} onOpenChange={setIsMobileRailOpen}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileRailOpen(true)}
                className="rounded-xl border-gray-200 bg-white text-xs font-semibold"
              >
                <PanelRightOpen className="w-4 h-4 mr-1.5 text-blue-600" />
                Class Chapter
              </Button>
              <SheetContent side="right" className="w-full sm:max-w-sm p-5 overflow-y-auto bg-white">
                <FocusedModuleRail
                  courseContent={courseContent}
                  activeModule={activeModule}
                  activeItemId={activeItemId}
                  isOtherModulesOpen={isOtherModulesOpen}
                  onToggleOtherModules={() => setIsOtherModulesOpen((prev) => !prev)}
                  onSelectModule={handleSelectModule}
                  onSelectItem={handleSelectItem}
                  otherCourses={otherCourses}
                  onCloseMobile={() => setIsMobileRailOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          {activeLesson && (
            <LessonContentView
              courseTitle={courseContent.course.title}
              moduleOrder={currentModuleOrder}
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
              courseTitle={courseContent.course.title}
              moduleOrder={currentModuleOrder}
              project={activeProject.project}
              onSubmit={handleSubmitProject}
              onToggleMilestone={handleToggleProjectMilestone}
              onNext={handleNext}
              hasNext={hasNextItem()}
              previewMode={isPreviewMode}
            />
          )}

          {activeQuiz && (
            <QuizContentView
              courseTitle={courseContent.course.title}
              moduleOrder={currentModuleOrder}
              quiz={activeQuiz.quiz}
              moduleTitle={activeQuiz.moduleTitle}
              onSubmitAnswer={handleSubmitQuizAnswer}
              onNext={handleNext}
              hasNext={hasNextItem()}
              previewMode={isPreviewMode}
            />
          )}

          {!activeLesson && !activeProject?.project && !activeQuiz && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                Select a lesson from the chapter panel
              </h3>
              <p className="max-w-sm text-xs text-gray-500">
                Choose a lesson, quiz, or project on the right-hand side to start learning.
              </p>
            </div>
          )}

          {courseContent.progress.overall_percent === 100 && (
            <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-green-900">Course Completed</h3>
              <p className="mb-4 text-xs text-green-700">
                You have completed all lessons and projects in this course.
              </p>
              <Link href="/dashboard/courses">
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
                  Back to My Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Fixed Sidebar Rail (does not scroll with the main lesson content) */}
      <aside className="hidden lg:flex lg:flex-col w-[330px] xl:w-[360px] shrink-0 h-full border-l border-gray-100 bg-white overflow-y-auto p-6">
        <FocusedModuleRail
          courseContent={courseContent}
          activeModule={activeModule}
          activeItemId={activeItemId}
          isOtherModulesOpen={isOtherModulesOpen}
          onToggleOtherModules={() => setIsOtherModulesOpen((prev) => !prev)}
          onSelectModule={handleSelectModule}
          onSelectItem={handleSelectItem}
          otherCourses={otherCourses}
        />
      </aside>
    </div>
  )
}
