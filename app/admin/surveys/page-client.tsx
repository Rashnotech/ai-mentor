"use client"

import { FormEvent, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, BarChart3, Loader2, MessageCircleHeart, Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { SurveyQuestion, SurveyQuestionType, SurveyTemplate, surveyAdminApi } from "@/lib/api"

const QUESTION_TYPES: SurveyQuestionType[] = ["single_choice", "multiple_choice", "rating", "short_text", "long_text"]

type Filters = { course_id?: number; path_id?: number; month?: string; survey_type?: string; needs_support?: boolean }

export default function SurveyAdminPageClient() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SurveyTemplate | null>(null)
  const [questionEditor, setQuestionEditor] = useState<{ surveyId: number; question?: SurveyQuestion } | null>(null)

  const surveysQuery = useQuery({ queryKey: ["admin", "surveys"], queryFn: surveyAdminApi.listSurveys })
  const analyticsQuery = useQuery({
    queryKey: ["admin", "survey-analytics", filters.course_id, filters.path_id, filters.month, filters.survey_type],
    queryFn: () => surveyAdminApi.getAnalytics(filters),
  })
  const responsesQuery = useQuery({
    queryKey: ["admin", "survey-responses", filters],
    queryFn: () => surveyAdminApi.listResponses({ ...filters, limit: 100 }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => surveyAdminApi.updateSurvey(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] }),
    onError: () => toast.error("Survey status could not be updated."),
  })
  const deleteQuestionMutation = useMutation({
    mutationFn: surveyAdminApi.deleteQuestion,
    onSuccess: () => {
      toast.success("Question deleted")
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] })
    },
    onError: () => toast.error("The survey must retain at least one question."),
  })

  const analytics = analyticsQuery.data
  const surveys = surveysQuery.data ?? []
  const responses = responsesQuery.data?.responses ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning surveys</h1>
        <p className="mt-1 text-sm text-gray-500">Manage check-ins and see where students need support.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Responses" value={analytics?.total_responses ?? 0} icon={MessageCircleHeart} />
        <Metric label="Active surveys" value={analytics?.active_surveys ?? 0} icon={BarChart3} />
        <Metric label="Average rating" value={analytics?.average_learning_rating ? `${analytics.average_learning_rating}/4` : "No data"} icon={Users} />
        <Metric label="Support requests" value={analytics?.support_requests ?? 0} icon={AlertCircle} alert={Boolean(analytics?.support_requests)} />
      </div>

      <Tabs defaultValue="responses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="responses">Feedback</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Survey templates</TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <FiltersBar filters={filters} setFilters={setFilters} surveyTypes={[...new Set(surveys.map((survey) => survey.survey_type))]} />
          <section className="overflow-hidden rounded-xl border bg-white">
            <div className="border-b px-5 py-4"><h2 className="font-semibold">Student feedback</h2></div>
            {responsesQuery.isLoading ? <Loading /> : responses.length === 0 ? <Empty text="No survey responses match these filters." /> : (
              <div className="divide-y">
                {responses.map((response) => (
                  <article key={response.id} className={`p-5 ${response.needs_support ? "bg-amber-50/60" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{response.student_name}</p>
                          {response.needs_support && <Badge className="bg-amber-100 text-amber-800">Needs support</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{response.student_email} · {response.course_title ?? "Course unavailable"}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{response.survey_title}</p>
                        <time>{new Date(response.submitted_at).toLocaleDateString()}</time>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 md:grid-cols-2">
                      {Object.entries(response.responses).map(([key, value]) => (
                        <div key={key} className="rounded-lg bg-white p-3 ring-1 ring-gray-100">
                          <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{key.replaceAll("_", " ")}</dt>
                          <dd className="mt-1 text-sm text-gray-800">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-4 lg:grid-cols-2">
          <AnalyticsList title="Learning satisfaction" values={analytics?.satisfaction_breakdown} />
          <AnalyticsList title="Course difficulty" values={analytics?.difficulty_breakdown} />
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Common issues</h2>
            <div className="mt-4 space-y-3">
              {analytics?.common_issues.length ? analytics.common_issues.map((item) => <div key={item.issue} className="flex justify-between gap-4 text-sm"><span>{item.issue}</span><Badge variant="secondary">{item.count}</Badge></div>) : <p className="text-sm text-gray-500">No issues reported yet.</p>}
            </div>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Modules with complaints</h2>
            <div className="mt-4 space-y-3">
              {analytics?.modules_with_most_complaints.length ? analytics.modules_with_most_complaints.map((item) => <div key={item.module_id} className="flex justify-between gap-4 text-sm"><span>{item.module_title}</span><Badge variant="secondary">{item.complaints}</Badge></div>) : <p className="text-sm text-gray-500">No module complaints recorded.</p>}
            </div>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Monthly satisfaction</h2>
            <div className="mt-4 space-y-3">
              {analytics?.monthly_satisfaction.length ? analytics.monthly_satisfaction.map((item) => <div key={item.month} className="flex justify-between gap-4 text-sm"><span>{item.month} · {item.responses} responses</span><Badge variant="secondary">{item.average}/4</Badge></div>) : <p className="text-sm text-gray-500">No monthly ratings recorded.</p>}
            </div>
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Courses with complaints</h2>
            <div className="mt-4 space-y-3">
              {analytics?.courses_with_most_complaints.length ? analytics.courses_with_most_complaints.map((item) => <div key={item.course_id} className="flex justify-between gap-4 text-sm"><span>{item.course_title}</span><Badge variant="secondary">{item.complaints}</Badge></div>) : <p className="text-sm text-gray-500">No course complaints recorded.</p>}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create survey</Button></div>
          {surveysQuery.isLoading ? <Loading /> : surveys.map((survey) => (
            <section key={survey.id} className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-semibold">{survey.title}</h2><Badge variant="outline">{survey.survey_type}</Badge></div>
                  <p className="mt-1 text-sm text-gray-500">{survey.description}</p>
                  <p className="mt-2 text-xs text-gray-400">Trigger: {survey.trigger_type.replaceAll("_", " ")} · Priority {survey.priority}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setEditingSurvey(survey)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                  <Switch checked={survey.is_active} disabled={toggleMutation.isPending} onCheckedChange={(checked) => toggleMutation.mutate({ id: survey.id, is_active: checked })} aria-label={`Activate ${survey.title}`} />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {survey.questions.map((question, index) => (
                  <div key={question.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                    <div><p className="text-sm font-medium">{index + 1}. {question.question_text}</p><p className="text-xs text-gray-400">{question.question_type.replaceAll("_", " ")}{question.is_required ? " · required" : ""}</p></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setQuestionEditor({ surveyId: survey.id, question })}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => deleteQuestionMutation.mutate(question.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {survey.questions.length < 5 && <Button variant="ghost" size="sm" className="mt-3" onClick={() => setQuestionEditor({ surveyId: survey.id })}><Plus className="mr-2 h-4 w-4" />Add question</Button>}
            </section>
          ))}
        </TabsContent>
      </Tabs>

      <CreateSurveyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditSurveyDialog survey={editingSurvey} onClose={() => setEditingSurvey(null)} />
      <QuestionDialog editor={questionEditor} onClose={() => setQuestionEditor(null)} />
    </div>
  )
}

function Metric({ label, value, icon: Icon, alert = false }: { label: string; value: string | number; icon: typeof BarChart3; alert?: boolean }) {
  return <div className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-gray-500">{label}</p><Icon className={`h-5 w-5 ${alert ? "text-amber-500" : "text-blue-500"}`} /></div><p className="mt-2 text-2xl font-bold">{value}</p></div>
}

function FiltersBar({ filters, setFilters, surveyTypes }: { filters: Filters; setFilters: (value: Filters) => void; surveyTypes: string[] }) {
  return <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-5">
    <Input type="number" min="1" placeholder="Course ID" value={filters.course_id ?? ""} onChange={(e) => setFilters({ ...filters, course_id: e.target.value ? Number(e.target.value) : undefined })} />
    <Input type="number" min="1" placeholder="Path ID" value={filters.path_id ?? ""} onChange={(e) => setFilters({ ...filters, path_id: e.target.value ? Number(e.target.value) : undefined })} />
    <Input type="month" value={filters.month ?? ""} onChange={(e) => setFilters({ ...filters, month: e.target.value || undefined })} />
    <select className="rounded-md border bg-white px-3 text-sm" value={filters.survey_type ?? ""} onChange={(e) => setFilters({ ...filters, survey_type: e.target.value || undefined })}><option value="">All survey types</option>{surveyTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select>
    <Label className="flex items-center gap-2 rounded-md border px-3 font-normal"><Switch checked={filters.needs_support ?? false} onCheckedChange={(checked) => setFilters({ ...filters, needs_support: checked || undefined })} />Needs support</Label>
  </div>
}

function AnalyticsList({ title, values }: { title: string; values?: Record<string, number> }) {
  const entries = Object.entries(values ?? {})
  return <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-3">{entries.length ? entries.map(([label, count]) => <div key={label} className="flex justify-between text-sm"><span className="capitalize">{label}</span><Badge variant="secondary">{count}</Badge></div>) : <p className="text-sm text-gray-500">No data yet.</p>}</div></section>
}

function Loading() { return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div> }
function Empty({ text }: { text: string }) { return <p className="p-10 text-center text-sm text-gray-500">{text}</p> }

function CreateSurveyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: surveyAdminApi.createSurvey,
    onSuccess: () => {
      toast.success("Survey created")
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] })
      onOpenChange(false)
    },
    onError: (error: Error) => toast.error(error.message || "Survey could not be created."),
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const questionType = String(data.get("question_type")) as SurveyQuestionType
    const options = String(data.get("options") ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    mutation.mutate({
      slug: String(data.get("slug")),
      title: String(data.get("title")),
      description: String(data.get("description") ?? ""),
      survey_type: String(data.get("survey_type")),
      trigger_type: String(data.get("trigger_type")),
      is_active: true,
      priority: Number(data.get("priority") ?? 0),
      questions: [{
        question_key: String(data.get("question_key")),
        question_text: String(data.get("question_text")),
        question_type: questionType,
        options: questionType.includes("text") ? [] : options,
        is_required: true,
        order: 1,
      }],
    })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Create survey</DialogTitle><DialogDescription>Create the template with its first question. You can add up to four more after saving.</DialogDescription></DialogHeader>
      <form id="create-survey" className="space-y-4" onSubmit={submit}>
        <Field label="Title"><Input name="title" required minLength={3} /></Field>
        <Field label="Slug"><Input name="slug" required pattern="[a-z0-9-]+" placeholder="weekly-confidence-check" /></Field>
        <Field label="Description"><Textarea name="description" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Survey type"><Input name="survey_type" required placeholder="learning_experience" /></Field>
          <Field label="Trigger type"><TriggerTypeSelect name="trigger_type" /></Field>
        </div>
        <Field label="Priority"><Input name="priority" type="number" min="0" max="100" defaultValue="10" /></Field>
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">First question</p>
          <div className="space-y-3">
            <Field label="Question key"><Input name="question_key" required pattern="[a-z0-9_]+" placeholder="confidence_level" /></Field>
            <Field label="Question"><Input name="question_text" required /></Field>
            <Field label="Type"><QuestionTypeSelect name="question_type" /></Field>
            <Field label="Options, comma separated"><Input name="options" placeholder="High, Medium, Low" /><p className="text-xs text-gray-400">Leave blank for text questions.</p></Field>
          </div>
        </div>
      </form>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button form="create-survey" type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create survey</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function EditSurveyDialog({ survey, onClose }: { survey: SurveyTemplate | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof surveyAdminApi.updateSurvey>[1] }) => surveyAdminApi.updateSurvey(id, payload),
    onSuccess: () => {
      toast.success("Survey updated")
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] })
      onClose()
    },
    onError: () => toast.error("Survey could not be updated."),
  })
  if (!survey) return null
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    mutation.mutate({ id: survey.id, payload: {
      title: String(data.get("title")),
      description: String(data.get("description") ?? ""),
      survey_type: String(data.get("survey_type")),
      trigger_type: String(data.get("trigger_type")),
      priority: Number(data.get("priority")),
    } })
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent key={survey.id}>
      <DialogHeader><DialogTitle>Edit survey</DialogTitle><DialogDescription>Changes apply the next time this template becomes eligible.</DialogDescription></DialogHeader>
      <form id="edit-survey" className="space-y-4" onSubmit={submit}>
        <Field label="Title"><Input name="title" required defaultValue={survey.title} /></Field>
        <Field label="Description"><Textarea name="description" defaultValue={survey.description ?? ""} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Survey type"><Input name="survey_type" required defaultValue={survey.survey_type} /></Field>
          <Field label="Trigger type"><TriggerTypeSelect name="trigger_type" defaultValue={survey.trigger_type} /></Field>
        </div>
        <Field label="Priority"><Input name="priority" type="number" min="0" max="100" defaultValue={survey.priority} /></Field>
      </form>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="edit-survey" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function QuestionDialog({ editor, onClose }: { editor: { surveyId: number; question?: SurveyQuestion } | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ surveyId, question, payload }: { surveyId: number; question?: SurveyQuestion; payload: Omit<SurveyQuestion, "id"> }) => {
      if (question) {
        const { question_key: _questionKey, ...editable } = payload
        return surveyAdminApi.updateQuestion(question.id, editable)
      }
      return surveyAdminApi.addQuestion(surveyId, payload)
    },
    onSuccess: () => {
      toast.success(editor?.question ? "Question updated" : "Question added")
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message || "Question could not be saved."),
  })
  if (!editor) return null
  const question = editor.question
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const questionType = String(data.get("question_type")) as SurveyQuestionType
    const options = String(data.get("options") ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    mutation.mutate({ surveyId: editor.surveyId, question, payload: {
      question_key: question?.question_key ?? String(data.get("question_key")),
      question_text: String(data.get("question_text")),
      question_type: questionType,
      options: questionType.includes("text") ? [] : options,
      is_required: data.get("is_required") === "on",
      order: Number(data.get("order") ?? 0),
    } })
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent key={question?.id ?? `new-${editor.surveyId}`}>
      <DialogHeader><DialogTitle>{question ? "Edit question" : "Add question"}</DialogTitle><DialogDescription>Choice and rating questions need at least two comma-separated options.</DialogDescription></DialogHeader>
      <form id="question-form" className="space-y-4" onSubmit={submit}>
        {!question && <Field label="Question key"><Input name="question_key" required pattern="[a-z0-9_]+" /></Field>}
        <Field label="Question"><Textarea name="question_text" required defaultValue={question?.question_text} /></Field>
        <Field label="Type"><QuestionTypeSelect name="question_type" defaultValue={question?.question_type} /></Field>
        <Field label="Options"><Input name="options" defaultValue={question?.options.join(", ")} placeholder="Option one, Option two" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Order"><Input name="order" type="number" min="0" max="100" defaultValue={question?.order ?? 1} /></Field>
          <Label className="mt-7 flex items-center gap-2 font-normal"><input name="is_required" type="checkbox" defaultChecked={question?.is_required ?? true} />Required</Label>
        </div>
      </form>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="question-form" type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save question</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-1.5"><span>{label}</span>{children}</Label>
}

function QuestionTypeSelect({ name, defaultValue = "single_choice" }: { name: string; defaultValue?: SurveyQuestionType }) {
  return <select name={name} defaultValue={defaultValue} className="h-9 w-full rounded-md border bg-white px-3 text-sm">{QUESTION_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select>
}

function TriggerTypeSelect({ name, defaultValue = "learning_timeline" }: { name: string; defaultValue?: string }) {
  return <select name={name} defaultValue={defaultValue} className="h-9 w-full rounded-md border bg-white px-3 text-sm">
    <option value="learning_timeline">Learning timeline</option>
    <option value="module_completion">Module or project completion</option>
    <option value="learning_inactivity">Learning inactivity or low progress</option>
  </select>
}
