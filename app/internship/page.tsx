import Link from "next/link"
import { ArrowRight, FileText, BadgeCheck, Upload } from "lucide-react"
import InternshipHeader from "./_components/internship-header"

const steps = [
  {
    id: 1,
    title: "Create your profile",
    description: "Tell us your goals and weekly availability",
    status: "active",
  },
  {
    id: 2,
    title: "Student verification and information",
    description: "Let's verify your academic credentials",
    status: "locked",
  },
  {
    id: 3,
    title: "Choose a learning track",
    description: "Frontend, backend, data, AI, and product tracks",
    status: "locked",
  },
  {
    id: 4,
    title: "Get acceptance and start internship",
    description: "Join team workflow and real client simulations",
    status: "locked",
  },
]

const studentTypes = [
  "University Students",
  "Polytechnic Students",
  "College Students",
]

const verificationDocs = [
  {
    title: "School IT Letter",
    description: "Official letter from your institution confirming your student status.",
    icon: FileText,
    step: "01",
    color: "from-orange-500 to-orange-600",
    lightColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    title: "Admission Letter",
    description: "Proof of enrollment from your university, polytechnic, or college.",
    icon: BadgeCheck,
    step: "02",
    color: "from-rose-500 to-rose-600",
    lightColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  {
    title: "ID Card",
    description: "Valid student ID card for identity verification and record keeping.",
    icon: Upload,
    step: "03",
    color: "from-cyan-500 to-cyan-600",
    lightColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
]

export default function InternshipPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_18%,#dbeafe_0%,transparent_40%),radial-gradient(circle_at_88%_0%,#bfdbfe_0%,transparent_34%),linear-gradient(160deg,#f8fafc_0%,#eef2ff_60%,#dbeafe_100%)] px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-20 top-20 h-56 w-56 rounded-full bg-blue-200/45 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-200/50 blur-3xl" />
      </div>

      <div className="relative pt-24 sm:pt-24 md:pt-20">
        {/* Header */}
        <div className="mb-8 -mx-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur sm:-mx-6 sm:p-5 md:-mx-10 md:mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Internship Programme</p>
            <h1 className="mt-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl md:text-4xl">
              Build Real Experience While You Learn
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Your path from learning courses to real internship experience
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Steps */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/70 backdrop-blur md:p-8">
              <h2 className="mb-6 text-xl font-bold text-slate-900 md:mb-8 md:text-2xl">
                Your next steps
              </h2>

              <div className="space-y-0">
                {steps.map((step, index) => {
                  const isActive = step.status === "active"
                  const isLocked = step.status === "locked"

                  return (
                    <div key={step.id} className="relative">
                      {/* Connector line */}
                      {index < steps.length - 1 && (
                        <div
                          className={`absolute left-6 top-16 h-16 w-0.5 ${
                            isActive || (index > 0 && steps[index - 1].status !== "locked")
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        />
                      )}

                      {/* Step Card */}
                      <div
                        className={`relative mb-8 flex flex-col gap-4 rounded-xl border p-6 transition-all md:flex-row md:gap-6 ${
                          isActive
                            ? "border-blue-200 bg-blue-50/80"
                            : isLocked
                              ? "border-slate-200 bg-slate-50"
                              : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        {/* Number Badge */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : isLocked
                                ? "border-2 border-slate-400 text-slate-400"
                                : "border-2 border-emerald-600 text-emerald-600"
                          }`}
                        >
                          {step.id}
                        </div>

                        {/* Step Content */}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-lg font-semibold ${
                              isLocked ? "text-slate-400" : "text-slate-900"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <p
                            className={`mt-1 text-sm ${
                              isLocked ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {step.description}
                          </p>
                        </div>

                        {/* Action Button */}
                        {isActive && (
                          <Link
                            href="/internship/create-profile"
                            className="mt-2 flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700 md:ml-4 md:mt-0 md:h-12 md:w-auto"
                          >
                            Go
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Unlocked Section */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Student Types Card */}
              <div className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Who can apply
                </p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  Open for all students
                </h3>
                <p className="mt-4 text-sm text-slate-600">
                  Whether you're a student at a university, polytechnic, or college, Rashnotech internship is designed for you. We welcome motivated learners ready to gain real-world experience and build their professional portfolio.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {studentTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verification Documents Card */}
              <div className="space-y-3 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Verification process
                </p>

                {verificationDocs.map((doc, index) => {
                  const Icon = doc.icon
                  return (
                    <div
                      key={doc.title}
                      className={`group relative overflow-hidden rounded-xl border ${doc.borderColor} ${doc.lightColor} p-4 transition hover:shadow-md`}
                    >
                      <div className="flex gap-4">
                        <div className="relative shrink-0">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-linear-to-br ${doc.color} text-white shadow-sm`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          {index < 2 && (
                            <div className="absolute -bottom-6 left-6 h-4 w-0.5 bg-linear-to-b from-gray-300 to-transparent" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-gray-900">{doc.title}</p>
                            <span className={`inline-flex rounded-full bg-linear-to-br ${doc.color} px-2 py-1 text-xs font-bold text-white`}>
                              {doc.step}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {doc.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Benefits / Info Cards */}
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                    Structured Learning
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                    Work Experience
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Career Ready
                  </div>
                </div>
              </div>


            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
