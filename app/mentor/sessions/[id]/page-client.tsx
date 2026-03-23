"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
  Users,
  Video,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
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

function formatDatetime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const sessionId = Number(params.id)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["mentor-session-detail", sessionId],
    queryFn: () => sessionsApi.getSessionDetail(sessionId),
    enabled: !!sessionId,
  })

  const deleteMutation = useMutation({
    mutationFn: () => sessionsApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })
      toast.success("Session deleted")
      router.push("/mentor/sessions")
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete session")
    },
  })

  const copyAttendanceLink = () => {
    if (session?.attendance_link) {
      navigator.clipboard.writeText(session.attendance_link)
      toast.success("Attendance link copied!")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-500">Loading session...</span>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p>Failed to load session details.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/mentor/sessions")}>
          Back to Sessions
        </Button>
      </div>
    )
  }

  const computed = session.computed_status
  const attendances = session.attendances ?? []

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={() => router.push("/mentor/sessions")} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Sessions
      </Button>

      {/* Session Info Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{session.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`border-0 ${STATUS_STYLES[computed] || "bg-gray-100"}`}>
                    {computed}
                  </Badge>
                  <Badge variant="secondary">
                    {PLATFORM_LABELS[session.platform] || session.platform}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(computed === "upcoming" || computed === "ongoing") && session.session_link && (
                <Button className="bg-green-600 hover:bg-green-700" asChild>
                  <a href={session.session_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Join Session
                  </a>
                </Button>
              )}
              {computed === "upcoming" && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {session.description && (
            <p className="text-gray-600 mb-4">{session.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{formatDate(session.scheduled_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {formatTime(session.start_time)} – {formatTime(session.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {session.attendee_count} attendee{session.attendee_count !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 text-xs">TZ:</span>
              <span className="text-gray-600">{session.timezone}</span>
            </div>
          </div>

          {/* Attendance Link */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-2">Attendance Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-blue-700 bg-white px-3 py-2 rounded border border-blue-200 truncate">
                {session.attendance_link}
              </code>
              <Button size="sm" variant="outline" onClick={copyAttendanceLink}>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Share this link with students to mark their attendance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Attendance ({attendances.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendances.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>No attendance records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Marked At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.map((att, idx) => (
                  <TableRow key={att.attendance_id}>
                    <TableCell className="text-gray-500">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {att.student_name || att.student_id}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {att.student_email || "—"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDatetime(att.marked_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete &quot;{session.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
