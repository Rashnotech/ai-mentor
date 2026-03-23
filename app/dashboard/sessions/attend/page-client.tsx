"use client"

import { useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Loader2,
  Video,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { useState, Suspense } from "react"
import { sessionsApi } from "@/lib/api"

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Microsoft Teams",
  custom: "Custom",
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function AttendPageContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [marked, setMarked] = useState(false)

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session-by-token", token],
    queryFn: () => sessionsApi.getSessionByToken(token!),
    enabled: !!token,
  })

  const markMutation = useMutation({
    mutationFn: () => sessionsApi.markAttendance(token!),
    onSuccess: () => {
      setMarked(true)
      toast.success("Attendance marked successfully!")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to mark attendance")
    },
  })

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-lg font-medium">Invalid attendance link</p>
        <p className="text-sm mt-1">No attendance token found in the URL.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-500">Loading session details...</span>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-lg font-medium">Session not found</p>
        <p className="text-sm mt-1">
          This attendance link may be invalid or the session no longer exists.
        </p>
      </div>
    )
  }

  const computed = session.computed_status
  const isActive = computed === "upcoming" || computed === "ongoing"

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
        <p className="text-gray-500 text-sm mt-1">
          Confirm your attendance for this session
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{session.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={`text-xs border-0 ${
                    computed === "upcoming"
                      ? "bg-blue-100 text-blue-700"
                      : computed === "ongoing"
                      ? "bg-green-100 text-green-700"
                      : computed === "completed"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {computed}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {PLATFORM_LABELS[session.platform] || session.platform}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {session.description && (
            <p className="text-gray-600 text-sm">{session.description}</p>
          )}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              {formatDate(session.scheduled_date)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.timezone})
            </div>
          </div>

          {/* Join link */}
          {isActive && session.session_link && (
            <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
              <a href={session.session_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Join Session
              </a>
            </Button>
          )}

          {/* Mark attendance */}
          {marked ? (
            <div className="flex items-center justify-center gap-2 py-4 text-green-700 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Attendance marked successfully!</span>
            </div>
          ) : isActive ? (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={markMutation.isPending}
              onClick={() => markMutation.mutate()}
            >
              {markMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Mark My Attendance
            </Button>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              <p className="font-medium">Attendance is closed</p>
              <p className="text-sm mt-1">
                This session is {computed}. Attendance can only be marked for upcoming or ongoing sessions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AttendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-500">Loading...</span>
        </div>
      }
    >
      <AttendPageContent />
    </Suspense>
  )
}
