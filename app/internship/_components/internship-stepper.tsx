type InternshipStepStatus = "active" | "done" | "locked"

type InternshipStep = {
  id: number
  label: string
  status: InternshipStepStatus
}

type InternshipStepperProps = {
  steps: InternshipStep[]
}

export default function InternshipStepper({ steps }: InternshipStepperProps) {
  return (
    <div className="mx-auto mb-10 max-w-4xl overflow-x-auto px-1 pt-6 md:mb-14">
      <ol className="flex min-w-max items-start justify-center gap-3 text-center md:gap-5">
        {steps.map((step, index) => {
          const isActive = step.status === "active"
          const isDone = step.status === "done"

          return (
            <li key={step.id} className="flex items-start gap-3 md:gap-5">
              <div className="flex min-w-24 flex-col items-center gap-3 md:min-w-32">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold ${
                    isActive
                      ? "bg-white text-[#071c2d]"
                      : isDone
                        ? "bg-emerald-400 text-[#071c2d]"
                        : "bg-[#22324a] text-slate-300"
                  }`}
                >
                  {step.id}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wide md:text-sm ${
                    isActive || isDone ? "text-white" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <span
                  className={`mt-5 h-px w-12 md:w-20 ${isDone ? "bg-emerald-400" : "bg-slate-500"}`}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
