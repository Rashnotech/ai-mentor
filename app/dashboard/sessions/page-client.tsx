"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Video,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react"
import Link from "next/link"
import { sessionsApi, type SessionResponse } from "@/lib/api"

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Microsoft Teams",
  custom: "Custom",
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

function SessionCard({ session }: { session: SessionResponse }) {
  const computed = session.computed_status

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
                <Badge className={`text-xs border-0 ${STATUS_STYLES[computed] || "bg-gray-100"}`}>
                  {computed}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {PLATFORM_LABELS[session.platform] || session.platform}
                </Badge>
              </div>
              {session.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{session.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(session.scheduled_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(session.start_time)} – {formatTime(session.end_time)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(computed === "upcoming" || computed === "ongoing") && session.session_link && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <a href={session.session_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Join
                </a>
              </Button>
            )}
            {(computed === "upcoming" || computed === "ongoing") && session.attendance_link && (
              <Link href={`/dashboard/sessions/attend?token=${session.attendance_token}`}>
                <Button size="sm" variant="outline">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Mark Attendance
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StudentSessionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["student-sessions"],
    queryFn: () => sessionsApi.listStudentSessions({ page_size: 50 }),
  })

  const sessions = data?.sessions ?? []

  // Separate into upcoming and past
  const upcoming = sessions.filter(
    (s) => s.computed_status === "upcoming" || s.computed_status === "ongoing"
  )
  const past = sessions.filter(
    (s) => s.computed_status === "completed" || s.computed_status === "cancelled"
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>
        <p className="text-gray-500 text-sm">
          View upcoming mentoring sessions and mark your attendance
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-500">Loading sessions...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p>Failed to load sessions.</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Video className="w-12 h-12 mb-3" />
          <p className="text-gray-600 font-medium">No sessions available</p>
          <p className="text-sm mt-1">
            Sessions from your enrolled bootcamps will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Sessions ({upcoming.length})
              </h3>
              {upcoming.map((s) => (
                <SessionCard key={s.session_id} session={s} />
              ))}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Past Sessions ({past.length})
              </h3>
              {past.map((s) => (
                <SessionCard key={s.session_id} session={s} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
