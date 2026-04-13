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
          setSelectedTrack(data[0].track_id)
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
    setSelectedTrack(trackId)
    setOffset(0)
    setSelectedCourseId(undefined)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/internship/verification"
            className="inline-flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900"
          >
            <span aria-hidden>←</span>
            <span>Back to Verification</span>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-6">
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
                          : "border-gray-300 bg-white text-gray-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span
                    className={`pt-1 text-lg font-semibold ${
                      step.status === "active" || step.status === "done"
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900">Choose Learning Track</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pick one track for your internship focus. You can request a switch during mentor review.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {!tracksLoading && tracks.map((track) => {
                const Icon = iconByTrack[track.track_id] ?? Globe
                const isSelected = selectedTrack === track.track_id

                return (
                  <button
                    key={track.track_id}
                    type="button"
                    onClick={() => onTrackClick(track.track_id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{track.track_name}</p>
                          <p className="text-xs text-gray-500">{track.level}</p>
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                    </div>

                    <p className="mt-3 text-sm text-gray-600">{track.description}</p>
                  </button>
                )
              })}

              {tracksLoading && (
                <div className="col-span-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  Loading tracks...
                </div>
              )}
            </div>

            <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Courses from database</h2>
                <input
                  value={search}
                  onChange={(e) => {
                    setOffset(0)
                    setSearch(e.target.value)
                  }}
                  placeholder="Search courses"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 md:w-64"
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
                        className={`w-full rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{course.title}</p>
                        {course.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-600">{course.description}</p>
                        )}
                      </button>
                    )
                  })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!coursesPage || coursesPage.offset === 0 || coursesLoading}
                    onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              <Link
                href="/internship"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-300 px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Save for later
              </Link>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting || tracksLoading || !selectedTrack}
                className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
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
