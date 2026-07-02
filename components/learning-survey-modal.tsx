"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, MessageCircleHeart } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EligibleSurvey, SurveyQuestion, surveyApi } from "@/lib/api"
import { useUserStore } from "@/lib/stores/user-store"

type SurveyAnswer = string | string[]

export function LearningSurveyModal() {
  const user = useUserStore((state) => state.user)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({})
  const [submitted, setSubmitted] = useState(false)

  const eligibleQuery = useQuery({
    queryKey: ["learning-survey", "eligible", user?.id],
    queryFn: surveyApi.getEligible,
    enabled: user?.role === "student" && user.onboarding_completed,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  const survey = eligibleQuery.data

  useEffect(() => {
    if (survey) {
      setAnswers({})
      setSubmitted(false)
      setOpen(true)
    }
  }, [survey])

  const closeSurvey = () => {
    setOpen(false)
    queryClient.setQueryData(["learning-survey", "eligible", user?.id], null)
  }

  const dismissMutation = useMutation({
    mutationFn: ({ current, status }: { current: EligibleSurvey; status: "dismissed" | "skipped" }) =>
      surveyApi.dismiss(current.id, status),
    onSuccess: closeSurvey,
    onError: () => {
      closeSurvey()
      toast.error("We could not save that preference, but the check-in will stay out of your way for now.")
    },
  })

  const submitMutation = useMutation({
    mutationFn: ({ current, values }: { current: EligibleSurvey; values: Record<string, SurveyAnswer> }) =>
      surveyApi.submit(current.id, current.cycle_key, values),
    onSuccess: () => {
      setSubmitted(true)
    },
    onError: (error: Error) => toast.error(error.message || "Your feedback could not be saved."),
  })

  const answerQuestion = (key: string, value: SurveyAnswer) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  const toggleMultipleChoice = (key: string, option: string) => {
    const current = Array.isArray(answers[key]) ? answers[key] as string[] : []
    answerQuestion(key, current.includes(option) ? current.filter((item) => item !== option) : [...current, option])
  }

  const requiredComplete = survey?.questions.every((question) => {
    if (!question.is_required) return true
    const answer = answers[question.question_key]
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim())
  }) ?? false

  const handleDialogChange = (nextOpen: boolean) => {
    if (nextOpen) return setOpen(true)
    if (survey && !submitted && !dismissMutation.isPending && !submitMutation.isPending) {
      dismissMutation.mutate({ current: survey, status: "dismissed" })
    } else {
      setOpen(false)
    }
  }

  if (!survey) return null

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" showCloseButton={!submitMutation.isPending}>
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <DialogTitle className="mb-2 text-xl">Thanks for checking in</DialogTitle>
            <DialogDescription>Your feedback is saved and will help us improve your learning experience.</DialogDescription>
            <Button className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={closeSurvey}>Back to learning</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <MessageCircleHeart className="h-5 w-5" />
              </div>
              <DialogTitle>{survey.title}</DialogTitle>
              <DialogDescription>{survey.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2">
              {survey.questions.map((question, index) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  index={index}
                  answer={answers[question.question_key]}
                  onAnswer={(value) => answerQuestion(question.question_key, value)}
                  onToggle={(option) => toggleMultipleChoice(question.question_key, option)}
                />
              ))}
            </div>
            <DialogFooter className="border-t pt-4 sm:justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" disabled={dismissMutation.isPending || submitMutation.isPending} onClick={() => dismissMutation.mutate({ current: survey, status: "dismissed" })}>Close</Button>
                <Button variant="outline" disabled={dismissMutation.isPending || submitMutation.isPending} onClick={() => dismissMutation.mutate({ current: survey, status: "skipped" })}>Maybe later</Button>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" disabled={!requiredComplete || submitMutation.isPending || dismissMutation.isPending} onClick={() => submitMutation.mutate({ current: survey, values: answers })}>
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit feedback
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function QuestionField({ question, index, answer, onAnswer, onToggle }: {
  question: SurveyQuestion
  index: number
  answer?: SurveyAnswer
  onAnswer: (answer: SurveyAnswer) => void
  onToggle: (option: string) => void
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900">
        {index + 1}. {question.question_text}
        {!question.is_required && <span className="ml-2 font-normal text-gray-400">Optional</span>}
      </legend>
      {(question.question_type === "single_choice" || question.question_type === "rating") && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option) => (
            <button type="button" key={option} onClick={() => onAnswer(option)} aria-pressed={answer === option} className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${answer === option ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"}`}>{option}</button>
          ))}
        </div>
      )}
      {question.question_type === "multiple_choice" && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const checked = Array.isArray(answer) && answer.includes(option)
            return <Label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 font-normal"><Checkbox checked={checked} onCheckedChange={() => onToggle(option)} />{option}</Label>
          })}
        </div>
      )}
      {(question.question_type === "short_text" || question.question_type === "long_text") && (
        <Textarea value={typeof answer === "string" ? answer : ""} onChange={(event) => onAnswer(event.target.value)} maxLength={question.question_type === "short_text" ? 500 : 2000} rows={question.question_type === "short_text" ? 3 : 5} placeholder="Share only what feels useful..." />
      )}
    </fieldset>
  )
}
