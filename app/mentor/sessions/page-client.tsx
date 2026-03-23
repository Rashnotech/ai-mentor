"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Clock,
  Calendar,
  Video,
  Plus,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  sessionsApi,
  type SessionResponse,
  type SessionCreatePayload,
  type SessionUpdatePayload,
  type SessionPlatform,
} from "@/lib/api"

// ---------- Helpers ----------

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
      year: "numeric",
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

// ---------- Tab type ----------

type SessionTab = "upcoming" | "completed" | "cancelled"

// ---------- Create / Edit Dialog ----------

function SessionFormDialog({
  open,
  onOpenChange,
  editSession,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editSession?: SessionResponse | null
}) {
  const queryClient = useQueryClient()
  const isEdit = !!editSession

  const [title, setTitle] = useState(editSession?.title ?? "")
  const [description, setDescription] = useState(editSession?.description ?? "")
  const [platform, setPlatform] = useState<SessionPlatform>(
    (editSession?.platform as SessionPlatform) ?? "zoom"
  )
  const [sessionLink, setSessionLink] = useState(editSession?.session_link ?? "")
  const [scheduledDate, setScheduledDate] = useState(
    editSession ? editSession.scheduled_date.split("T")[0] : ""
  )
  const [startTime, setStartTime] = useState(
    editSession ? editSession.start_time.slice(0, 16) : ""
  )
  const [endTime, setEndTime] = useState(
    editSession ? editSession.end_time.slice(0, 16) : ""
  )
  const [timezone, setTimezone] = useState(editSession?.timezone ?? "UTC")

  const createMutation = useMutation({
    mutationFn: (data: SessionCreatePayload) => sessionsApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })
      toast.success("Session created successfully")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create session")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: SessionUpdatePayload) =>
      sessionsApi.updateSession(editSession!.session_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })
      toast.success("Session updated successfully")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update session")
    },
  })

  const isBusy = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !sessionLink || !scheduledDate || !startTime || !endTime) {
      toast.error("Please fill in all required fields")
      return
    }

    const startDt = new Date(`${scheduledDate}T${startTime.includes("T") ? startTime.split("T")[1] : startTime}`)
    const endDt = new Date(`${scheduledDate}T${endTime.includes("T") ? endTime.split("T")[1] : endTime}`)

    if (endDt <= startDt) {
      toast.error("End time must be after start time")
      return
    }

    const payload = {
      title,
      description: description || undefined,
      platform,
      session_link: sessionLink,
      scheduled_date: new Date(scheduledDate).toISOString(),
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      timezone,
    }

    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload as SessionCreatePayload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Session" : "Create New Session"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the session details below."
              : "Schedule a new mentoring session for your students."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Introduction to React Hooks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will be covered in this session?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Platform + Link */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform *</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as SessionPlatform)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session_link">Meeting Link *</Label>
              <Input
                id="session_link"
                type="url"
                placeholder="https://..."
                value={sessionLink}
                onChange={(e) => setSessionLink(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Date *</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
          </div>

          {/* Start / End Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime.includes("T") ? startTime.split("T")[1]?.slice(0, 5) : startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime.includes("T") ? endTime.split("T")[1]?.slice(0, 5) : endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isBusy}>
              {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Session Card ----------

function SessionCard({
  session,
  onEdit,
  onDelete,
}: {
  session: SessionResponse
  onEdit: (s: SessionResponse) => void
  onDelete: (id: number) => void
}) {
  const computed = session.computed_status

  const copyAttendanceLink = () => {
    if (session.attendance_link) {
      navigator.clipboard.writeText(session.attendance_link)
      toast.success("Attendance link copied!")
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
                <Badge className={`text-xs border-0 ${STATUS_STYLES[computed] || "bg-gray-100 text-gray-600"}`}>
                  {computed}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {PLATFORM_LABELS[session.platform] || session.platform}
                </Badge>
              </div>
              {session.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{session.description}</p>
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
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {session.attendee_count} attendee{session.attendee_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {(computed === "upcoming" || computed === "ongoing") && session.session_link && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <a href={session.session_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Join
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={copyAttendanceLink} title="Copy attendance link">
              <Copy className="w-3.5 h-3.5 mr-1" />
              Attendance Link
            </Button>
            <Link href={`/mentor/sessions/${session.session_id}`}>
              <Button size="sm" variant="outline" title="View details">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </Link>
            {computed === "upcoming" && (
              <>
                <Button size="sm" variant="outline" onClick={() => onEdit(session)} title="Edit">
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(session.session_id)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Main Page ----------

export default function SessionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<SessionTab>("upcoming")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editSession, setEditSession] = useState<SessionResponse | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Fetch sessions for each tab
  const { data, isLoading, error } = useQuery({
    queryKey: ["mentor-sessions", activeTab],
    queryFn: () => sessionsApi.listMentorSessions({ status: activeTab, page_size: 50 }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => sessionsApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })
      toast.success("Session deleted")
      setDeleteConfirmId(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete session")
    },
  })

  // Cancel mutation (update status to cancelled)
  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      sessionsApi.updateSession(id, { status: "cancelled" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })
      toast.success("Session cancelled")
    },
  })

  const sessions = data?.sessions ?? []
  const total = data?.total ?? 0

  const openCreate = () => {
    setEditSession(null)
    setDialogOpen(true)
  }

  const openEdit = (session: SessionResponse) => {
    setEditSession(session)
    setDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id)
  }

  const tabs: { key: SessionTab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sessions</h2>
          <p className="text-gray-500 text-sm">
            Manage your mentoring sessions and track attendance
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && !isLoading && (
              <span className="ml-1.5 text-xs">({total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-500">Loading sessions...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p>Failed to load sessions. Please try again.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] })}
          >
            Retry
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Video className="w-12 h-12 mb-3" />
          <p className="text-gray-600 font-medium">No {activeTab} sessions</p>
          <p className="text-sm mt-1">
            {activeTab === "upcoming"
              ? "Create a session to get started."
              : `You have no ${activeTab} sessions yet.`}
          </p>
          {activeTab === "upcoming" && (
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.session_id}
              session={session}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      {dialogOpen && (
        <SessionFormDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v)
            if (!v) setEditSession(null)
          }}
          editSession={editSession}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirmId(null) }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
