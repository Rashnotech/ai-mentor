import Link from "next/link"
import { ArrowRight } from "lucide-react"
import InternshipHeader from "./_components/internship-header"
import InternshipStepper from "./_components/internship-stepper"

const steps = [
  {
    id: 1,
    label: "Account",
    title: "Create your profile",
    description: "Share your contact information, school type, location, and learning goals.",
    status: "active" as const,
  },
  {
    id: 2,
    label: "Verify",
    title: "Student verification",
    description: "Upload your required student documents after your profile is created.",
    status: "locked" as const,
  },
  {
    id: 3,
    label: "Track",
    title: "Choose a learning track",
    description: "Pick the internship track and course path that matches your career direction.",
    status: "locked" as const,
  },
  {
    id: 4,
    label: "Accept",
    title: "Get acceptance",
    description: "Receive review feedback and onboarding instructions from Rashnotech.",
    status: "locked" as const,
  },
]

export default function InternshipPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071c2d] px-4 py-6 text-white sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />

      <main className="mx-auto max-w-6xl pt-20">
        <InternshipStepper steps={steps} />

        <section className="rounded-lg bg-[#24354c] p-5 shadow-2xl shadow-black/20 ring-1 ring-white/5 md:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-[#071c2d]">
                  1
                </span>
                <p className="text-xl font-bold tracking-tight md:text-2xl">Internship application</p>
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-100 md:text-base">
                Build real experience while you learn with Rashnotech.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Start with your account details, complete student verification, choose your learning track,
                and submit your internship application for review.
              </p>
            </div>

            <Link
              href="/internship/create-profile"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 text-sm font-bold text-white transition hover:bg-blue-400 md:w-auto"
            >
              Start application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map((step) => {
              const isActive = step.status === "active"

              return (
                <article
                  key={step.id}
                  className={`rounded-lg border p-4 ${
                    isActive
                      ? "border-blue-300/60 bg-[#2b3e57]"
                      : "border-white/10 bg-[#1d2c42]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive ? "bg-white text-[#071c2d]" : "bg-[#34455d] text-slate-300"
                      }`}
                    >
                      {step.id}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white">{step.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
