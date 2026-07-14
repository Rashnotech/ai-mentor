import Link from "next/link"
import { CheckCircle2, Clock3, ShieldCheck, MailCheck, CalendarDays } from "lucide-react"
import InternshipHeader from "../_components/internship-header"
import InternshipStepper from "../_components/internship-stepper"

const steps = [
  { id: 1, label: "Account", status: "done" as const },
  { id: 2, label: "Verify", status: "done" as const },
  { id: 3, label: "Track", status: "done" as const },
  { id: 4, label: "Accept", status: "active" as const },
]

const checklist = [
  "Profile information submitted",
  "School documents uploaded",
  "Track selected for internship",
]

const timeline = [
  {
    title: "Document review",
    description: "Our team verifies your IT letter, admission letter, and ID document.",
    eta: "24 - 48 hours",
    icon: ShieldCheck,
  },
  {
    title: "Mentor matching",
    description: "We match you with the best mentor based on your selected track.",
    eta: "1 - 2 days",
    icon: CalendarDays,
  },
  {
    title: "Acceptance email",
    description: "You receive your internship acceptance and onboarding instructions by email.",
    eta: "Immediately after approval",
    icon: MailCheck,
  },
]

export default function InternshipAcceptancePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071c2d] px-4 py-6 text-white sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />

      <main className="mx-auto max-w-6xl pt-20">
        <InternshipStepper steps={steps} />

        <section className="rounded-lg bg-[#24354c] p-5 shadow-2xl shadow-black/20 ring-1 ring-white/5 md:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-[#071c2d]">
              4
            </span>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Application submitted</h1>
          </div>

          <div className="mt-6 rounded-lg border border-blue-300/50 bg-[#1d2c42] p-4">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-blue-300" />
              <div>
                <h2 className="text-lg font-bold text-white">Your internship application is in review.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Great work. Rashnotech will review your profile, verification documents, and selected track.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-[#1d2c42] p-5">
              <h2 className="text-lg font-bold text-white">Completed checklist</h2>
              <ul className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">What happens next</h2>
              <div className="mt-4 space-y-3">
                {timeline.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-lg border border-white/10 bg-[#1d2c42] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7b8794] text-white">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{item.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                          </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.eta}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-500 px-6 text-sm font-bold text-white transition hover:bg-blue-400 md:w-auto"
            >
              Go to Dashboard
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
