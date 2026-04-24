import Link from "next/link"
import { CheckCircle2, Clock3, ShieldCheck, MailCheck, CalendarDays } from "lucide-react"
import InternshipHeader from "../_components/internship-header"

const steps = [
  { id: 1, label: "Create profile", status: "done" },
  { id: 2, label: "Student verification", status: "done" },
  { id: 3, label: "Choose track", status: "done" },
  { id: 4, label: "Get acceptance", status: "active" },
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_12%,#dbeafe_0%,transparent_35%),radial-gradient(circle_at_88%_0%,#bfdbfe_0%,transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_65%,#dbeafe_100%)] px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute left-0 top-8 h-48 w-48 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />
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
                        : "border-blue-600 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className="pt-1 text-lg font-semibold text-slate-900">{step.label}</span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/70 backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Step 4 of 4</p>
            <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-blue-700" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Application Submitted</h1>
                  <p className="mt-1 text-sm text-slate-700">
                    Great work. Your internship application is now in review for acceptance.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold text-slate-900">Completed checklist</h2>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-semibold text-slate-900">What happens next</h2>
              <div className="mt-3 space-y-3">
                {timeline.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.eta}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 md:w-auto"
              >
                Go to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
