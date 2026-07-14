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
    <div className="mx-auto mb-8 max-w-3xl px-1 pt-4 md:mb-10">
      <ol className="grid grid-cols-4 items-start gap-1 text-center sm:gap-3 md:gap-5">
        {steps.map((step, index) => {
          const isActive = step.status === "active"
          const isDone = step.status === "done"

          return (
            <li key={step.id} className="relative flex flex-col items-center gap-2 md:gap-3">
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-1/2 top-4 hidden h-px w-full translate-x-5 sm:block md:top-5 md:translate-x-6 ${
                    isDone ? "bg-blue-500" : "bg-slate-500"
                  }`}
                  aria-hidden
                />
              )}

              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold md:h-10 md:w-10 md:text-base ${
                  isActive
                    ? "bg-white text-[#071c2d]"
                    : isDone
                      ? "bg-blue-500 text-white"
                      : "bg-[#22324a] text-slate-300"
                }`}
              >
                {step.id}
              </span>
              <span
                className={`text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs md:text-sm ${
                  isActive || isDone ? "text-white" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
