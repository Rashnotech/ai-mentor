"use client"

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
import InternshipStepper from "../_components/internship-stepper"

const steps = [
  { id: 1, label: "Account", status: "done" as const },
  { id: 2, label: "Verify", status: "done" as const },
  { id: 3, label: "Track", status: "active" as const },
  { id: 4, label: "Accept", status: "locked" as const },
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

const inputClass =
  "h-[52px] w-full rounded-md border border-transparent bg-[#7b8794] px-5 text-base font-semibold text-white outline-none transition placeholder:text-slate-300 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"

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
    <div className="min-h-screen overflow-x-hidden bg-[#071c2d] px-4 py-6 text-white sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />

      <main className="mx-auto max-w-6xl pt-20 md:pt-24">
        <InternshipStepper steps={steps} />

        <section className="rounded-lg bg-[#24354c] p-6 shadow-2xl shadow-black/20 ring-1 ring-white/5 md:p-9">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-[#071c2d]">
              3
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Choose learning track</h1>
          </div>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-100">
            Pick one track for your internship focus. You can request a switch during mentor review.
          </p>

          <div className="mt-8">
            <p className="mb-4 text-xl font-bold text-white">Available tracks</p>

            {tracksLoading && <p className="text-sm font-semibold text-slate-300">Loading tracks...</p>}

            {!tracksLoading && tracks.length === 0 && (
              <p className="text-sm font-semibold text-slate-300">No internship tracks are available right now.</p>
            )}

            {!tracksLoading && tracks.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {tracks.map((track) => {
                  const Icon = iconByTrack[track.track_id] ?? Code2
                  const isActive = selectedTrack === track.track_id

                  return (
                    <button
                      key={track.track_id}
                      type="button"
                      onClick={() => onTrackClick(track.track_id)}
                      className={`rounded-lg border p-5 text-left transition-all duration-200 ${
                        isActive
                          ? "border-emerald-300 bg-[#2b3e57] ring-2 ring-emerald-300/20"
                          : "border-white/10 bg-[#1d2c42] hover:-translate-y-0.5 hover:border-emerald-300/70"
                      }`}
                      aria-pressed={isActive}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded-md bg-[#7b8794] p-2 text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <p className="text-sm font-bold text-white">{track.track_name}</p>
                        </div>

                        {isActive && <CheckCircle2 className="h-5 w-5 text-emerald-300" />}
                      </div>

                      {track.description && (
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-300">{track.description}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-lg border border-white/10 bg-[#1d2c42] p-5">
            <div className="mb-5">
              <label htmlFor="courseSearch" className="mb-3 block text-xl font-bold text-white">
                Course search
              </label>
              <input
                id="courseSearch"
                value={search}
                onChange={(e) => {
                  setOffset(0)
                  setSearch(e.target.value)
                }}
                placeholder="Search courses"
                className={inputClass}
              />
            </div>

            <div className="space-y-3">
              {coursesLoading && <p className="text-sm font-semibold text-slate-300">Loading courses...</p>}

              {!coursesLoading && coursesPage?.courses.length === 0 && (
                <p className="text-sm font-semibold text-slate-300">No courses found for this query.</p>
              )}

              {!coursesLoading &&
                coursesPage?.courses.map((course: InternshipTrackCourse) => {
                  const isSelected = selectedCourseId === course.course_id
                  return (
                    <button
                      key={course.course_id}
                      type="button"
                      onClick={() => setSelectedCourseId(course.course_id)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? "border-emerald-300 bg-[#2b3e57]"
                          : "border-white/10 bg-[#24354c] hover:border-emerald-300/70"
                      }`}
                    >
                      <p className="text-sm font-bold text-white">{course.title}</p>
                      {course.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{course.description}</p>
                      )}
                    </button>
                  )
                })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!coursesPage || coursesPage.offset === 0 || coursesLoading}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  className="rounded-md bg-[#7b8794] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-md bg-[#7b8794] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-5 rounded-md border border-red-300/50 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
              {error}
            </p>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting || tracksLoading || !selectedTrack}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-emerald-400 px-6 text-sm font-bold text-[#071c2d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {isSubmitting ? "Submitting application..." : "Continue to acceptance"}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
