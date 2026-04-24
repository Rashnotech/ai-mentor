"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Code2, Globe, Database, Brain, PenSquare, BarChart3, CheckCircle2 } from "lucide-react"
import {
  getApiErrorMessage,
  internshipApi,
  InternshipTrack,
  InternshipTrackCourse,
  InternshipTrackCoursesResponse,
} from "@/lib/api"
import InternshipHeader from "../_components/internship-header"

const steps = [
  { id: 1, label: "Create profile", status: "done" },
  { id: 2, label: "Student verification", status: "done" },
  { id: 3, label: "Choose track", status: "active" },
  { id: 4, label: "Get acceptance", status: "locked" },
]

const PAGE_SIZE = 8

const iconByTrack: Record<string, typeof Globe> = {
  frontend: Globe,
  backend: Database,
  fullstack: Code2,
  "ai-engineering": Brain,
  "product-design": PenSquare,
  "data-analytics": BarChart3,
}

export default function InternshipChooseTrackPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<InternshipTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState<string>("")
  const [coursesPage, setCoursesPage] = useState<InternshipTrackCoursesResponse | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState("")
  const [tracksLoading, setTracksLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadTracks = async () => {
      setTracksLoading(true)
      setError("")
      try {
        const data = await internshipApi.getTracks()
        setTracks(data)
        if (data.length > 0) {
          setSelectedTrack((prev) => {
            if (prev && data.some((track) => track.track_id === prev)) {
              return prev
            }
            return data[0].track_id
          })
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setTracksLoading(false)
      }
    }
    void loadTracks()
  }, [])

  useEffect(() => {
    if (!selectedTrack) return

    const loadCourses = async () => {
      setCoursesLoading(true)
      setError("")
      try {
        const data = await internshipApi.getTrackCourses(selectedTrack, {
          limit: PAGE_SIZE,
          offset,
          search: search.trim() || undefined,
        })
        setCoursesPage(data)
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setCoursesLoading(false)
      }
    }

    void loadCourses()
  }, [selectedTrack, offset, search])

  const handleContinue = async () => {
    setError("")
    const storedId = localStorage.getItem("internship_application_id")
    const applicationId = storedId ? Number(storedId) : NaN

    if (!applicationId || Number.isNaN(applicationId)) {
      setError("Application was not found. Please complete profile and verification first.")
      return
    }

    if (!selectedTrack) {
      setError("Please choose a track.")
      return
    }

    setIsSubmitting(true)
    try {
      await internshipApi.selectTrack(applicationId, {
        selected_track: selectedTrack as
          | "frontend"
          | "backend"
          | "fullstack"
          | "ai-engineering"
          | "product-design"
          | "data-analytics",
        course_id: selectedCourseId,
      })
      router.push("/internship/get-acceptance")
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPages = useMemo(() => {
    if (!coursesPage) return 1
    return Math.max(1, Math.ceil(coursesPage.total / coursesPage.limit))
  }, [coursesPage])

  const currentPage = useMemo(() => {
    if (!coursesPage) return 1
    return Math.floor(coursesPage.offset / coursesPage.limit) + 1
  }, [coursesPage])

  const onTrackClick = (trackId: string) => {
    if (trackId === selectedTrack) return
    setSelectedTrack(trackId)
    setOffset(0)
    setSelectedCourseId(undefined)
    setCoursesPage(null)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#dbeafe_0%,transparent_35%),radial-gradient(circle_at_90%_0%,#bfdbfe_0%,transparent_30%),linear-gradient(175deg,#f8fafc_0%,#eff6ff_65%,#dbeafe_100%)] px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute left-0 top-10 h-52 w-52 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-blue-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="pt-20" />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur md:p-6">
            <ol className="space-y-0">
              {steps.map((step, index) => (
                <li key={step.id} className="relative flex items-start gap-4 pb-7 last:pb-0">
                  {index < steps.length - 1 && (
                    <span className="absolute left-5 top-10 h-8 w-px bg-gray-300" aria-hidden />
                  )}
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold ${
                      step.status === "active"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : step.status === "done"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span
                    className={`pt-1 text-lg font-semibold ${
                      step.status === "active" || step.status === "done"
                        ? "text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/70 backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Step 3 of 4</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Choose Learning Track</h1>
            <p className="mt-2 text-sm text-slate-600">
              Pick one track for your internship focus. You can request a switch during mentor review.
            </p>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700">Available tracks</p>

              {tracksLoading && <p className="text-sm text-gray-600">Loading tracks...</p>}

              {!tracksLoading && tracks.length === 0 && (
                <p className="text-sm text-gray-600">No internship tracks are available right now.</p>
              )}

              {!tracksLoading && tracks.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tracks.map((track) => {
                    const Icon = iconByTrack[track.track_id] ?? Code2
                    const isActive = selectedTrack === track.track_id

                    return (
                      <button
                        key={track.track_id}
                        type="button"
                        onClick={() => onTrackClick(track.track_id)}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                          isActive
                            ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-gray-100 p-2 text-gray-700">
                              <Icon className="h-4 w-4" />
                            </span>
                            <p className="text-sm font-semibold text-slate-900">{track.track_name}</p>
                          </div>

                          {isActive && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                        </div>

                        {track.description && (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-600">{track.description}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <input
                  value={search}
                  onChange={(e) => {
                    setOffset(0)
                    setSearch(e.target.value)
                  }}
                  placeholder="Search courses"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 md:w-64"
                />
              </div>

              <div className="space-y-2">
                {coursesLoading && <p className="text-sm text-gray-600">Loading courses...</p>}

                {!coursesLoading && coursesPage?.courses.length === 0 && (
                  <p className="text-sm text-gray-600">No courses found for this query.</p>
                )}

                {!coursesLoading &&
                  coursesPage?.courses.map((course: InternshipTrackCourse) => {
                    const isSelected = selectedCourseId === course.course_id
                    return (
                      <button
                        key={course.course_id}
                        type="button"
                        onClick={() => setSelectedCourseId(course.course_id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-50"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                        {course.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{course.description}</p>
                        )}
                      </button>
                    )
                  })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!coursesPage || coursesPage.offset === 0 || coursesLoading}
                    onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={
                      !coursesPage ||
                      coursesLoading ||
                      coursesPage.offset + coursesPage.limit >= coursesPage.total
                    }
                    onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting || tracksLoading || !selectedTrack}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 md:w-auto"
              >
                {isSubmitting ? "Submitting application..." : "Continue to acceptance"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
