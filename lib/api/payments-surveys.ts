import { apiClient } from "./client"

export type SurveyQuestionType = "single_choice" | "multiple_choice" | "rating" | "short_text" | "long_text"

export interface PaymentInitiateRequest {
  course_id: number
  path_id?: number
}

export interface PaymentInitiatedResponse {
  enrollment_id: number
  payment_id: number
  reference: string
  amount: number
  currency: string
  checkout_link?: string | null
  status: string
  message: string
}

export interface PaymentVerificationResponse {
  reference: string
  payment_status: "pending" | "successful" | "failed"
  enrollment_status: "pending_payment" | "active" | "cancelled"
  enrollment_id: number
  course_id: number
  amount: number
  currency: string
  message: string
  verified_at?: string
  payment_method?: string
  transaction_reference?: string
}

export interface PaymentStatusResponse {
  reference: string
  payment_status: "pending" | "successful" | "failed"
  enrollment_status: "pending_payment" | "active" | "cancelled"
  enrollment_id: number
  course_id: number
  amount: number
  currency: string
  checkout_link?: string
  created_at: string
}

export interface PendingEnrollmentResponse {
  pending: boolean
  enrollment_id?: number
  course_id?: number
  status?: string
  latest_reference?: string
  latest_checkout_link?: string
}

export interface EnrollmentPaymentHistoryResponse {
  enrollment_id: number
  course_id: number
  enrollment_status: "pending_payment" | "active" | "cancelled"
  payments: {
    payment_id: number
    reference: string
    amount: number
    currency: string
    status: "pending" | "successful" | "failed"
    payment_method?: string
    created_at: string
    verified_at?: string
  }[]
  latest_checkout_link?: string
  total_attempts: number
}

// ─── Payment API ─────────────────────────────────────────────

export const paymentApi = {
  /** Initiate a payment for a paid course enrollment */
  initiatePayment: async (data: PaymentInitiateRequest): Promise<PaymentInitiatedResponse> => {
    const response = await apiClient.post<PaymentInitiatedResponse>("/payments/initiate", data)
    return response.data
  },

  /** Verify a payment server-side after Nomba redirect */
  verifyPayment: async (reference: string): Promise<PaymentVerificationResponse> => {
    const response = await apiClient.post<PaymentVerificationResponse>("/payments/verify", { reference })
    return response.data
  },

  /** Retry a failed payment for an existing enrollment */
  retryPayment: async (enrollmentId: number): Promise<PaymentInitiatedResponse> => {
    const response = await apiClient.post<PaymentInitiatedResponse>("/payments/retry", {
      enrollment_id: enrollmentId,
    })
    return response.data
  },

  /** Get current payment status by reference */
  getPaymentStatus: async (reference: string): Promise<PaymentStatusResponse> => {
    const response = await apiClient.get<PaymentStatusResponse>(`/payments/status/${reference}`)
    return response.data
  },

  /** Check if user has a pending payment enrollment for a course */
  getPendingEnrollment: async (courseId: number): Promise<PendingEnrollmentResponse> => {
    const response = await apiClient.get<PendingEnrollmentResponse>(`/payments/pending/${courseId}`)
    return response.data
  },

  /** Get full payment history for an enrollment (audit trail) */
  getEnrollmentPayments: async (enrollmentId: number): Promise<EnrollmentPaymentHistoryResponse> => {
    const response = await apiClient.get<EnrollmentPaymentHistoryResponse>(`/payments/enrollment/${enrollmentId}`)
    return response.data
  },
}

// ─── Admin Transactions Types ────────────────────────────────────



export interface SurveyQuestion {
  id: number
  question_key: string
  question_text: string
  question_type: SurveyQuestionType
  options: string[]
  is_required: boolean
  order: number
}

export interface EligibleSurvey {
  id: number
  title: string
  description: string | null
  type: string
  cycle_key: string
  questions: SurveyQuestion[]
  context: {
    enrollment_id: number
    course_id: number
    path_id: number | null
    module_id: number | null
    reason: string
  }
}

export interface SurveyTemplate {
  id: number
  slug: string
  title: string
  description: string | null
  survey_type: string
  trigger_type: string
  is_active: boolean
  priority: number
  questions: SurveyQuestion[]
  created_at: string
  updated_at: string
}

export interface AdminSurveyResponseItem {
  id: number
  survey_id: number
  survey_title: string
  survey_type: string
  user_id: string
  student_name: string
  student_email: string
  course_id: number | null
  course_title: string | null
  path_id: number | null
  enrollment_id: number | null
  module_id: number | null
  module_title: string | null
  responses: Record<string, unknown>
  needs_support: boolean
  submitted_at: string
}

export interface SurveyAnalytics {
  total_responses: number
  active_surveys: number
  average_learning_rating: number | null
  satisfaction_breakdown: Record<string, number>
  difficulty_breakdown: Record<string, number>
  common_issues: Array<{ issue: string; count: number }>
  support_requests: number
  courses_with_most_complaints: Array<{ course_id: number; course_title: string; complaints: number }>
  modules_with_most_complaints: Array<{ module_id: number; module_title: string; complaints: number }>
  monthly_satisfaction: Array<{ month: string; average: number; responses: number }>
}

export interface SurveyAdminFilters {
  course_id?: number
  path_id?: number
  month?: string
  survey_type?: string
  needs_support?: boolean
  limit?: number
  offset?: number
}

export const surveyApi = {
  getEligible: async (): Promise<EligibleSurvey | null> => {
    const response = await apiClient.get<{ survey: EligibleSurvey | null }>("/surveys/eligible")
    return response.data.survey
  },
  submit: async (surveyId: number, cycleKey: string, responses: Record<string, unknown>) => {
    const response = await apiClient.post(`/surveys/${surveyId}/responses`, { cycle_key: cycleKey, responses })
    return response.data as { success: boolean; message: string; response_id: number; completed_at: string }
  },
  dismiss: async (surveyId: number, dismissalStatus: "dismissed" | "skipped") => {
    const response = await apiClient.post(`/surveys/${surveyId}/dismiss`, { status: dismissalStatus })
    return response.data as { success: boolean; status: string; next_eligible_at: string }
  },
}

export const surveyAdminApi = {
  listSurveys: async (): Promise<SurveyTemplate[]> => {
    const response = await apiClient.get<SurveyTemplate[]>("/admin/surveys")
    return response.data
  },
  createSurvey: async (payload: {
    slug: string
    title: string
    description?: string
    survey_type: string
    trigger_type: string
    is_active: boolean
    priority: number
    questions: Array<{
      question_key: string
      question_text: string
      question_type: SurveyQuestionType
      options: string[]
      is_required: boolean
      order: number
    }>
  }): Promise<SurveyTemplate> => {
    const response = await apiClient.post<SurveyTemplate>("/admin/surveys", payload)
    return response.data
  },
  updateSurvey: async (surveyId: number, payload: Partial<Pick<SurveyTemplate, "title" | "description" | "survey_type" | "trigger_type" | "is_active" | "priority">>): Promise<SurveyTemplate> => {
    const response = await apiClient.patch<SurveyTemplate>(`/admin/surveys/${surveyId}`, payload)
    return response.data
  },
  addQuestion: async (surveyId: number, payload: Omit<SurveyQuestion, "id">): Promise<SurveyQuestion> => {
    const response = await apiClient.post<SurveyQuestion>(`/admin/surveys/${surveyId}/questions`, payload)
    return response.data
  },
  updateQuestion: async (questionId: number, payload: Partial<Omit<SurveyQuestion, "id" | "question_key">>): Promise<SurveyQuestion> => {
    const response = await apiClient.patch<SurveyQuestion>(`/admin/surveys/questions/${questionId}`, payload)
    return response.data
  },
  deleteQuestion: async (questionId: number): Promise<void> => {
    await apiClient.delete(`/admin/surveys/questions/${questionId}`)
  },
  listResponses: async (filters: SurveyAdminFilters = {}): Promise<{
    responses: AdminSurveyResponseItem[]
    total: number
    limit: number
    offset: number
  }> => {
    const response = await apiClient.get("/admin/surveys/responses", { params: filters })
    return response.data
  },
  getAnalytics: async (filters: Omit<SurveyAdminFilters, "needs_support" | "limit" | "offset"> = {}): Promise<SurveyAnalytics> => {
    const response = await apiClient.get<SurveyAnalytics>("/admin/surveys/analytics", { params: filters })
    return response.data
  },
}
