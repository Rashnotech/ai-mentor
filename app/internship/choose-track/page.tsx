"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Code2, Globe, Database, Brain, PenSquare, BarChart3, CheckCircle2 } from "lucide-react"
import {
  getApiErrorMessage,
  internshipApi,
  InternshipTrack,
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
  const [tracksLoading, setTracksLoading] = useState(true)
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
      })
      router.push("/internship/get-acceptance")
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onTrackClick = (trackId: string) => {
    setSelectedTrack(trackId)
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
