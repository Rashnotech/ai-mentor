import Link from "next/link"
import { ArrowRight, FileText, BadgeCheck, Upload } from "lucide-react"

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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
              Rashnotech Internship
            </h1>
            <p className="mt-2 text-gray-600">
              Your path from learning courses to real internship experience
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
          >
            ← Back Home
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Steps */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="mb-8 text-2xl font-bold text-gray-900">
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
                        className={`relative mb-8 flex gap-6 rounded-xl border p-6 transition-all ${
                          isActive
                            ? "border-blue-200 bg-blue-50"
                            : isLocked
                              ? "border-gray-200 bg-gray-50"
                              : "border-green-200 bg-green-50"
                        }`}
                      >
                        {/* Number Badge */}
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : isLocked
                                ? "border-2 border-gray-400 text-gray-400"
                                : "border-2 border-green-600 text-green-600"
                          }`}
                        >
                          {step.id}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-semibold ${
                              isLocked ? "text-gray-400" : "text-gray-900"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <p
                            className={`mt-1 text-sm ${
                              isLocked ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {step.description}
                          </p>
                        </div>

                        {/* Action Button */}
                        {isActive && (
                          <Link
                            href="/internship/create-profile"
                            className="ml-4 flex h-12 shrink-0 items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-3 font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700"
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
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Who can apply
                </p>
                <h3 className="mt-3 text-lg font-bold text-gray-900">
                  Open for all students
                </h3>
                <p className="mt-4 text-sm text-gray-600">
                  Whether you're a student at a university, polytechnic, or college, Rashnotech internship is designed for you. We welcome motivated learners ready to gain real-world experience and build their professional portfolio.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {studentTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-block rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verification Documents Card */}
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
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
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                    Structured Learning
                  </div>
                  <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                    Work Experience
                  </div>
                  <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">
                    Career Ready
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
