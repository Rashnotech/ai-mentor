"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bot,
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  RotateCcw,
  Send,
  ShieldCheck,
  Volume2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  studentCoursesApi,
  type ProjectContent,
  type ProjectInterviewEvaluation,
  type ProjectInterviewMessage,
} from "@/lib/api"
import { toast } from "sonner"

interface ProjectDefenseInterviewProps {
  project: ProjectContent
  previewMode?: boolean
}

export function ProjectDefenseInterview({
  project,
  previewMode = false,
}: ProjectDefenseInterviewProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [messages, setMessages] = useState<ProjectInterviewMessage[]>([])
  const [answerText, setAnswerText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [maxQuestions, setMaxQuestions] = useState(4)
  const [isComplete, setIsComplete] = useState(false)
  const [usedVisionLastTurn, setUsedVisionLastTurn] = useState(false)
  const [evaluation, setEvaluation] = useState<ProjectInterviewEvaluation | null>(null)

  // Screen share state
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Optional voice dictation state
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsSharingScreen(false)
  }

  useEffect(() => {
    // Reset interview state when switching projects
    setHasStarted(false)
    setMessages([])
    setAnswerText("")
    setQuestionNumber(0)
    setIsComplete(false)
    setUsedVisionLastTurn(false)
    setEvaluation(null)
    stopScreenShare()
    return () => {
      stopScreenShare()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [project.project_id])

  const handleToggleScreenShare = async () => {
    if (isSharingScreen) {
      stopScreenShare()
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported in this browser.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      screenStreamRef.current = stream
      setIsSharingScreen(true)
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare()
        }
      }
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      toast.success("Screen shared! Snapshots will be analyzed when you answer.")
    } catch {
      toast.error("Screen share was cancelled or blocked.")
    }
  }

  const captureScreenSnapshot = (): string | null => {
    const video = videoRef.current
    if (!isSharingScreen || !video || video.readyState < 2 || video.videoWidth === 0) {
      return null
    }
    const maxWidth = 1024
    const scale = Math.min(1, maxWidth / video.videoWidth)
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.72)
  }

  const speakQuestion = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const handleToggleVoiceInput = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      toast.error("Voice dictation is not supported in this browser. Type your answer instead.")
      return
    }
    const recognition = new SpeechRec()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || ""
      if (spoken) {
        setAnswerText((prev) => (prev ? `${prev} ${spoken}` : spoken))
      }
    }
    recognition.onerror = () => {
      setIsListening(false)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const startInterview = async () => {
    if (previewMode || isLoading) return
    setIsLoading(true)
    setHasStarted(true)
    setIsComplete(false)
    setEvaluation(null)
    setMessages([])
    try {
      const snapshot = captureScreenSnapshot()
      const res = await studentCoursesApi.runProjectDefenseTurn({
        project_id: project.project_id,
        transcript: [],
        screenshot_data_url: snapshot,
        repo_url: project.submission_url,
      })
      setMessages([{ role: "assistant", content: res.message }])
      setQuestionNumber(res.question_number)
      setMaxQuestions(res.max_questions)
      setUsedVisionLastTurn(res.used_vision)
    } catch (error) {
      console.error("Failed to start project defense:", error)
      toast.error("Could not start Project Defense Interview.")
      setHasStarted(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendAnswer = async () => {
    const trimmed = answerText.trim()
    if (!trimmed || isLoading || isComplete) return
    const nextTranscript: ProjectInterviewMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ]
    setMessages(nextTranscript)
    setAnswerText("")
    setIsLoading(true)
    try {
      const snapshot = captureScreenSnapshot()
      const res = await studentCoursesApi.runProjectDefenseTurn({
        project_id: project.project_id,
        transcript: nextTranscript,
        screenshot_data_url: snapshot,
        repo_url: project.submission_url,
      })
      setMessages([...nextTranscript, { role: "assistant", content: res.message }])
      setQuestionNumber(res.question_number)
      setMaxQuestions(res.max_questions)
      setUsedVisionLastTurn(res.used_vision)
      setIsComplete(res.is_complete)
      if (res.evaluation) {
        setEvaluation(res.evaluation)
        if (res.evaluation.xp_awarded > 0) {
          toast.success(`Project Defense complete! +${res.evaluation.xp_awarded} XP`)
        }
      }
    } catch (error) {
      console.error("Project defense turn failed:", error)
      toast.error("Failed to submit answer. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900">
                Mode 1: Project Defense Interview
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-[#2563EB] text-white text-[11px] font-semibold">
                Vision + Text
              </span>
              {isSharingScreen && (
                <span className="px-2 py-0.5 rounded-md bg-[#16A34A] text-white text-[11px] font-semibold inline-flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Screen Shared
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Defend your {project.title} work in 4 targeted questions. Share your code/browser screen for live visual review.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!previewMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleScreenShare}
              className={`rounded-xl text-xs font-semibold ${
                isSharingScreen
                  ? "border-[#DC2626] text-[#DC2626] hover:bg-red-50"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {isSharingScreen ? (
                <>
                  <MonitorOff className="w-3.5 h-3.5 mr-1.5" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <Monitor className="w-3.5 h-3.5 mr-1.5" />
                  Share Screen
                </>
              )}
            </Button>
          )}
          {!hasStarted && (
            <Button
              type="button"
              size="sm"
              disabled={previewMode || isLoading}
              onClick={startInterview}
              className="rounded-xl bg-[#0F172A] hover:bg-gray-800 text-white text-xs font-semibold px-4"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              )}
              Start Defense
            </Button>
          )}
        </div>
      </div>

      {/* Live screen preview when student shares their screen */}
      {isSharingScreen && (
        <div className="rounded-xl border border-gray-200 bg-[#0F172A] p-2">
          <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] text-gray-300">
            <span>Live Screen Preview (captured automatically on each answer)</span>
            {usedVisionLastTurn && (
              <span className="text-[#4ADE80] font-semibold">Snapshot analyzed by Llama-4 Scout</span>
            )}
          </div>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full max-h-48 object-contain rounded-lg bg-black"
          />
        </div>
      )}

      {/* Interview conversation */}
      {hasStarted && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700">
              {isComplete
                ? "Defense Completed"
                : `Question ${Math.max(1, questionNumber)} of ${maxQuestions}`}
            </span>
            <button
              type="button"
              onClick={startInterview}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Restart
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-3.5 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-[#F8FAFC] border border-gray-200 text-gray-800"
                    : "bg-[#2563EB] text-white ml-6"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      msg.role === "assistant" ? "text-[#2563EB]" : "text-blue-100"
                    }`}
                  >
                    {msg.role === "assistant" ? "Technical Interviewer" : "Your Answer"}
                  </span>
                  {msg.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speakQuestion(msg.content)}
                      className="text-gray-400 hover:text-gray-700"
                      title="Listen to question"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="rounded-xl p-3.5 bg-[#F8FAFC] border border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                Interviewer is reviewing your response{isSharingScreen ? " and screen snapshot" : ""}...
              </div>
            )}
          </div>

          {!isComplete && (
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                rows={2}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendAnswer()
                  }
                }}
                placeholder="Explain your architecture, state flow, or point to what's on your screen..."
                className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              />
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleToggleVoiceInput}
                  className={`rounded-xl text-xs ${
                    isListening ? "border-[#DC2626] text-[#DC2626] bg-red-50" : "border-gray-200"
                  }`}
                  title="Speak answer"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  onClick={handleSendAnswer}
                  disabled={!answerText.trim() || isLoading}
                  className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Send
                </Button>
              </div>
            </div>
          )}

          {evaluation && (
            <div
              className={`rounded-xl border p-4 space-y-2.5 ${
                evaluation.passed
                  ? "bg-[#F0FDF4] border-[#BBF7D0]"
                  : "bg-[#FFFBEB] border-[#FDE68A]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      evaluation.passed ? "text-[#16A34A]" : "text-[#EA580C]"
                    }`}
                  />
                  <span className="text-sm font-bold text-gray-900">
                    Defense Score: {evaluation.score_percent}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {evaluation.xp_awarded > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#0F172A] text-white text-[11px] font-bold">
                      +{evaluation.xp_awarded} XP
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white ${
                      evaluation.passed ? "bg-[#16A34A]" : "bg-[#EA580C]"
                    }`}
                  >
                    {evaluation.passed ? "Defense Passed" : "Needs Deeper Review"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-700">{evaluation.mentor_note}</p>
              <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <p className="font-bold text-[#166534] mb-1">Strengths</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                    {evaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-[#9A3412] mb-1">Focus Next</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                    {evaluation.gaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
