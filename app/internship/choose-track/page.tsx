"use client"

import Link from "next/link"
import { useState } from "react"
import { Code2, Globe, Database, Brain, PenSquare, BarChart3, CheckCircle2 } from "lucide-react"

const steps = [
  { id: 1, label: "Create profile", status: "done" },
  { id: 2, label: "Student verification", status: "done" },
  { id: 3, label: "Choose track", status: "active" },
  { id: 4, label: "Get acceptance", status: "locked" },
]

const tracks = [
  {
    id: "frontend",
    title: "Frontend Development",
    description: "Build responsive web interfaces with modern UI patterns.",
    icon: Globe,
    level: "Beginner to Intermediate",
  },
  {
    id: "backend",
    title: "Backend Development",
    description: "Design APIs, authentication, and reliable server workflows.",
    icon: Database,
    level: "Intermediate",
  },
  {
    id: "fullstack",
    title: "Fullstack Engineering",
    description: "Combine frontend and backend skills to ship end-to-end products.",
    icon: Code2,
    level: "Intermediate",
  },
  {
    id: "ai-engineering",
    title: "AI Engineering",
    description: "Work on AI-powered features, prompting, and model integration.",
    icon: Brain,
    level: "Intermediate to Advanced",
  },
  {
    id: "product-design",
    title: "Product Design",
    description: "Design usable flows, wireframes, and polished product interfaces.",
    icon: PenSquare,
    level: "Beginner to Intermediate",
  },
  {
    id: "data-analytics",
    title: "Data Analytics",
    description: "Analyze data, build dashboards, and generate practical insights.",
    icon: BarChart3,
    level: "Beginner to Intermediate",
  },
]

export default function InternshipChooseTrackPage() {
  const [selectedTrack, setSelectedTrack] = useState<string>(tracks[0].id)

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
              {tracks.map((track) => {
                const Icon = track.icon
                const isSelected = selectedTrack === track.id

                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrack(track.id)}
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
                          <p className="text-sm font-semibold text-gray-900">{track.title}</p>
                          <p className="text-xs text-gray-500">{track.level}</p>
                        </div>
                      </div>

                      {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                    </div>

                    <p className="mt-3 text-sm text-gray-600">{track.description}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/internship"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-300 px-6 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Save for later
              </Link>
              <Link
                href="/internship/get-acceptance"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Continue to acceptance
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
