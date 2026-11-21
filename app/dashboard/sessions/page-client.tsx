"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Video,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Briefcase,
  XCircle,
  CalendarPlus,
} from "lucide-react"
import Link from "next/link"
import {
  sessionsApi,
  type AvailableMentorResponse,
  type MentorBookingResponse,
  type SessionResponse,
} from "@/lib/api"
import { toast } from "sonner"

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  microsoft_teams: "Microsoft Teams",
  custom: "Custom",
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-[#2563EB] text-white",
  ongoing: "bg-[#16A34A] text-white",
  completed: "bg-gray-200 text-gray-700",
  cancelled: "bg-[#DC2626] text-white",
  confirmed: "bg-[#16A34A] text-white",
  pending: "bg-[#EA580C] text-white",
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function defaultStartLocalValue() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`
}

function SessionCard({ session }: { session: SessionResponse }) {
  const computed = session.computed_status

  return (
    <Card className="border border-gray-200 hover:border-[#2563EB] transition-colors">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shrink-0">
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
                  {formatTime(session.start_time)} - {formatTime(session.end_time)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(computed === "upcoming" || computed === "ongoing") && session.session_link && (
              <Button size="sm" className="bg-[#16A34A] hover:bg-green-700 text-white" asChild>
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
  const queryClient = useQueryClient()
  const [selectedMentor, setSelectedMentor] = useState<AvailableMentorResponse | null>(null)
  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [scheduledStart, setScheduledStart] = useState(defaultStartLocalValue)
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [platform, setPlatform] = useState<"google_meet" | "zoom" | "microsoft_teams">("google_meet")

  const { data: mentorsData, isLoading: mentorsLoading } = useQuery({
    queryKey: ["available-mentors"],
    queryFn: () => sessionsApi.listAvailableMentors(),
  })

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["student-bookings"],
    queryFn: () => sessionsApi.listMyBookings(),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-sessions"],
    queryFn: () => sessionsApi.listStudentSessions({ page_size: 50 }),
  })

  const bookMutation = useMutation({
    mutationFn: () => {
      if (!selectedMentor) throw new Error("No mentor selected")
      const isoStart = new Date(scheduledStart).toISOString()
      return sessionsApi.bookMentorSession({
        mentor_id: selectedMentor.mentor_id,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        scheduled_start: isoStart,
        duration_minutes: durationMinutes,
        platform,
      })
    },
    onSuccess: () => {
      toast.success(`Session booked with ${selectedMentor?.full_name}!`)
      queryClient.invalidateQueries({ queryKey: ["student-bookings"] })
      setSelectedMentor(null)
      setTopic("")
      setNotes("")
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Could not book session. Please try another time."
      toast.error(msg)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: number) => sessionsApi.cancelBooking(bookingId),
    onSuccess: () => {
      toast.success("Booking cancelled")
      queryClient.invalidateQueries({ queryKey: ["student-bookings"] })
    },
    onError: () => {
      toast.error("Failed to cancel booking")
    },
  })

  const mentors = mentorsData?.mentors ?? []
  const bookings = bookingsData?.bookings ?? []
  const sessions = data?.sessions ?? []

  const upcoming = sessions.filter(
    (s) => s.computed_status === "upcoming" || s.computed_status === "ongoing"
  )
  const past = sessions.filter(
    (s) => s.computed_status === "completed" || s.computed_status === "cancelled"
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mentors & Sessions</h2>
        <p className="text-gray-500 text-sm mt-1">
          Book 1-on-1 time with available mentors or join upcoming cohort sessions
        </p>
      </div>

      {/* Section 1: Available Mentors */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#2563EB]" />
            Available Mentors ({mentors.length})
          </h3>
        </div>

        {mentorsLoading ? (
          <div className="flex items-center justify-center py-10 rounded-2xl border border-gray-200 bg-white">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] mr-2" />
            <span className="text-sm text-gray-500">Loading available mentors...</span>
          </div>
        ) : mentors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-700">No mentors available right now</p>
            <p className="text-xs text-gray-500 mt-1">
              Check back soon for open 1-on-1 mentor slots.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mentors.map((mentor) => (
              <div
                key={mentor.mentor_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between gap-4 hover:border-[#2563EB] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {mentor.avatar_url ? (
                        <img
                          src={mentor.avatar_url}
                          alt={mentor.full_name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(mentor.full_name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {mentor.full_name}
                        </h4>
                        <p className="text-xs text-[#2563EB] font-medium truncate">
                          {mentor.title}
                        </p>
                        {mentor.company && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {mentor.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#16A34A] text-white text-[11px] font-semibold shrink-0">
                      Available
                    </span>
                  </div>

                  {mentor.bio && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {mentor.bio}
                    </p>
                  )}

                  {mentor.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.expertise.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-[#F4F5F7] text-gray-700 text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    {mentor.years_experience
                      ? `${mentor.years_experience}+ yrs exp`
                      : mentor.timezone}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSelectedMentor(mentor)
                      setScheduledStart(defaultStartLocalValue())
                    }}
                    className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                    Book Mentor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: My Booked 1-on-1 Sessions */}
      {(bookingsLoading || bookings.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#16A34A]" />
            My Booked 1-on-1 Sessions ({bookings.length})
          </h3>

          {bookingsLoading ? (
            <div className="flex items-center py-6 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#2563EB]" />
              Loading your bookings...
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: MentorBookingResponse) => (
                <div
                  key={booking.booking_id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{booking.topic}</span>
                      <Badge
                        className={`text-[11px] border-0 ${
                          STATUS_STYLES[booking.status] || "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        {PLATFORM_LABELS[booking.platform] || booking.platform}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Mentor: <span className="font-semibold">{booking.mentor_name || "Mentor"}</span>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(booking.scheduled_start)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(booking.scheduled_start)} ({booking.duration_minutes} min)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {booking.meeting_link && booking.status !== "cancelled" && (
                      <Button size="sm" className="bg-[#16A34A] hover:bg-green-700 text-white" asChild>
                        <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Join
                        </a>
                      </Button>
                    )}
                    {booking.status !== "cancelled" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(booking.booking_id)}
                        className="text-xs border-gray-300 text-gray-700 hover:bg-red-50 hover:text-[#DC2626] hover:border-[#DC2626]"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Cohort / Bootcamp Live Sessions */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-[#2563EB]" />
          Cohort & Live Sessions
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 rounded-2xl border border-gray-200 bg-white">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB] mr-2" />
            <span className="text-sm text-gray-500">Loading sessions...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-gray-200 bg-white text-gray-500">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm">Failed to load cohort sessions.</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-gray-200 bg-white text-gray-400">
            <Video className="w-10 h-10 mb-2" />
            <p className="text-sm text-gray-600 font-medium">No cohort sessions scheduled</p>
            <p className="text-xs mt-1">
              Live sessions from your enrolled bootcamps will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Upcoming Sessions ({upcoming.length})
                </h4>
                {upcoming.map((s) => (
                  <SessionCard key={s.session_id} session={s} />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Past Sessions ({past.length})
                </h4>
                {past.map((s) => (
                  <SessionCard key={s.session_id} session={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Book Mentor Modal */}
      <Dialog open={!!selectedMentor} onOpenChange={(open) => !open && setSelectedMentor(null)}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Book 1-on-1 with {selectedMentor?.full_name}</DialogTitle>
            <DialogDescription>
              {selectedMentor?.title}
              {selectedMentor?.company ? ` at ${selectedMentor.company}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!topic.trim() || !scheduledStart) return
              bookMutation.mutate()
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Session Topic *
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Project code review or FastAPI debugging"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Preferred Platform
              </label>
              <select
                value={platform}
                onChange={(e) =>
                  setPlatform(e.target.value as "google_meet" | "zoom" | "microsoft_teams")
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="microsoft_teams">Microsoft Teams</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Notes for Mentor (optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share your repo link or specific questions ahead of time..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMentor(null)}
                disabled={bookMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!topic.trim() || !scheduledStart || bookMutation.isPending}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              >
                {bookMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
