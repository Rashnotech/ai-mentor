import { apiClient } from "./client"
import type { MentorProfileResponse } from "./auth"
import type {
  BootcampStatus,
  BootcampListResponse,
  BootcampResponse,
  BootcampCreatePayload,
  BootcampUpdatePayload,
  EnrollmentPaymentStatus,
  EnrollmentResponse,
  EnrollmentCreatePayload,
  EnrollmentUpdatePayload,
  UserRole,
  UserListResponse,
  UserStatsResponse,
  UserAdminResponse,
  AdminUserLearningResponse,
  AdminCertificateUploadPayload,
  AdminUserCertificate,
  UserCreatePayload,
  UserUpdatePayload,
  MentorProfileUpdate,
  CourseCreatePayload,
  ModuleCreatePayload,
} from "./courses"

// ============================================================================
// BOOTCAMP ADMIN API
// ============================================================================

export const bootcampAdminApi = {
  // Bootcamp CRUD
  listBootcamps: async (params?: {
    status?: BootcampStatus | "upcoming"
    search?: string
    include_inactive?: boolean
    include_drafts?: boolean
    limit?: number
    offset?: number
  }): Promise<BootcampListResponse[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status_filter", params.status)
    if (params?.search) searchParams.append("search", params.search)
    if (params?.include_inactive) searchParams.append("include_inactive", "true")
    if (params?.include_drafts) searchParams.append("include_drafts", "true")
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<BootcampListResponse[]>(`/bootcamps${query ? `?${query}` : ""}`)
    return response.data
  },

  getBootcamp: async (bootcampId: number): Promise<BootcampResponse> => {
    const response = await apiClient.get<BootcampResponse>(`/bootcamps/${bootcampId}`)
    return response.data
  },

  createBootcamp: async (data: BootcampCreatePayload): Promise<BootcampResponse> => {
    const response = await apiClient.post<BootcampResponse>("/bootcamps", data)
    return response.data
  },

  updateBootcamp: async (bootcampId: number, data: BootcampUpdatePayload): Promise<BootcampResponse> => {
    const response = await apiClient.put<BootcampResponse>(`/bootcamps/${bootcampId}`, data)
    return response.data
  },

  deleteBootcamp: async (bootcampId: number): Promise<void> => {
    await apiClient.delete(`/bootcamps/${bootcampId}`)
  },

  // Enrollment management
  listEnrollments: async (bootcampId: number, paymentStatus?: EnrollmentPaymentStatus): Promise<EnrollmentResponse[]> => {
    const searchParams = new URLSearchParams()
    if (paymentStatus) searchParams.append("payment_status", paymentStatus)
    
    const query = searchParams.toString()
    const response = await apiClient.get<EnrollmentResponse[]>(
      `/bootcamps/${bootcampId}/enrollments${query ? `?${query}` : ""}`
    )
    return response.data
  },

  createEnrollment: async (bootcampId: number, data: EnrollmentCreatePayload): Promise<EnrollmentResponse> => {
    const response = await apiClient.post<EnrollmentResponse>(`/bootcamps/${bootcampId}/enrollments`, data)
    return response.data
  },

  updateEnrollment: async (enrollmentId: number, data: EnrollmentUpdatePayload): Promise<EnrollmentResponse> => {
    const response = await apiClient.put<EnrollmentResponse>(`/bootcamps/enrollments/${enrollmentId}`, data)
    return response.data
  },

  deleteEnrollment: async (enrollmentId: number): Promise<void> => {
    await apiClient.delete(`/bootcamps/enrollments/${enrollmentId}`)
  },

  // Bootcamp lifecycle management
  publishBootcamp: async (bootcampId: number): Promise<BootcampResponse> => {
    const response = await apiClient.post<BootcampResponse>(`/bootcamps/${bootcampId}/publish`)
    return response.data
  },

  changeStatus: async (bootcampId: number, status: BootcampStatus): Promise<BootcampResponse> => {
    const response = await apiClient.post<BootcampResponse>(`/bootcamps/${bootcampId}/status`, { status })
    return response.data
  },
}

// ============================================================================
// USER ADMIN API
// ============================================================================

export const userAdminApi = {
  /**
   * List all users with filtering and pagination
   */
  listUsers: async (params?: {
    search?: string
    role?: UserRole
    is_active?: boolean
    is_verified?: boolean
    limit?: number
    offset?: number
  }): Promise<UserListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.role) searchParams.append("role", params.role)
    if (params?.is_active !== undefined) searchParams.append("is_active", params.is_active.toString())
    if (params?.is_verified !== undefined) searchParams.append("is_verified", params.is_verified.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<UserListResponse>(`/admin/users${query ? `?${query}` : ""}`)
    return response.data
  },

  /**
   * Get user statistics
   */
  getStats: async (): Promise<UserStatsResponse> => {
    const response = await apiClient.get<UserStatsResponse>("/admin/users/stats")
    return response.data
  },

  /**
   * Get a specific user by ID
   */
  getUser: async (userId: string): Promise<UserAdminResponse> => {
    const response = await apiClient.get<UserAdminResponse>(`/admin/users/${userId}`)
    return response.data
  },

  /**
   * Get a user's enrolled courses and certificates
   */
  getUserLearning: async (userId: string): Promise<AdminUserLearningResponse> => {
    const response = await apiClient.get<AdminUserLearningResponse>(`/admin/users/${userId}/learning`)
    return response.data
  },

  /**
   * Assign or update a certificate for one of a user's enrolled courses
   */
  uploadCertificate: async (
    userId: string,
    data: AdminCertificateUploadPayload
  ): Promise<AdminUserCertificate> => {
    const response = await apiClient.post<AdminUserCertificate>(`/admin/users/${userId}/certificates`, data)
    return response.data
  },

  /**
   * Remove a student's enrollment in a course. Hard delete — also removes
   * that enrollment's payment records (cascades at the DB level).
   */
  deleteEnrollment: async (userId: string, enrollmentId: number): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}/enrollments/${enrollmentId}`)
  },

  /**
   * Create a new user
   */
  createUser: async (data: UserCreatePayload): Promise<UserAdminResponse> => {
    const response = await apiClient.post<UserAdminResponse>("/admin/users", data)
    return response.data
  },

  /**
   * Update a user
   */
  updateUser: async (userId: string, data: UserUpdatePayload): Promise<UserAdminResponse> => {
    const response = await apiClient.put<UserAdminResponse>(`/admin/users/${userId}`, data)
    return response.data
  },

  /**
   * Delete a user
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${userId}`)
  },

  /**
   * Reset a user's password
   */
  resetPassword: async (userId: string): Promise<{ message: string; email: string }> => {
    const response = await apiClient.post<{ message: string; email: string }>(
      `/admin/users/${userId}/reset-password`
    )
    return response.data
  },

  /**
   * Toggle a user's active status
   */
  toggleStatus: async (userId: string): Promise<UserAdminResponse> => {
    const response = await apiClient.post<UserAdminResponse>(`/admin/users/${userId}/toggle-status`)
    return response.data
  },

  /**
   * Look up a user by email address
   */
  lookupByEmail: async (email: string): Promise<UserAdminResponse> => {
    const response = await apiClient.get<UserAdminResponse>(`/admin/users/lookup/email/${encodeURIComponent(email)}`)
    return response.data
  },

  /**
   * Promote a user to mentor role
   */
  promoteToMentor: async (userId: string): Promise<UserAdminResponse> => {
    const response = await apiClient.post<UserAdminResponse>(`/admin/users/${userId}/promote-to-mentor`)
    return response.data
  },

  /**
   * List all mentors with filtering and pagination
   */
  listMentors: async (params?: {
    search?: string
    is_active?: boolean
    limit?: number
    offset?: number
  }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>("/admin/users/mentors", { params })
    return response.data
  },

  /**
   * Demote a mentor back to student role
   */
  demoteMentor: async (userId: string): Promise<UserAdminResponse> => {
    const response = await apiClient.delete<UserAdminResponse>(`/admin/users/mentors/${userId}/demote`)
    return response.data
  },

  /**
   * Get mentor profile
   */
  getMentorProfile: async (userId: string): Promise<MentorProfileResponse> => {
    const response = await apiClient.get<MentorProfileResponse>(`/admin/users/mentors/${userId}/profile`)
    return response.data
  },

  /**
   * Update mentor profile
   */
  updateMentorProfile: async (userId: string, data: MentorProfileUpdate): Promise<MentorProfileResponse> => {
    const response = await apiClient.put<MentorProfileResponse>(`/admin/users/mentors/${userId}/profile`, data)
    return response.data
  },
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Sanitize string input - trim whitespace and remove dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML/script tags
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
}

/**
 * Validate course form data
 */
export function validateCourseForm(data: Partial<CourseCreatePayload>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters"
  } else if (data.title.length > 255) {
    errors.title = "Title must be less than 255 characters"
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters"
  }

  if (!data.slug || data.slug.trim().length < 3) {
    errors.slug = "Slug must be at least 3 characters"
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    errors.slug = "Slug can only contain lowercase letters, numbers, and hyphens"
  }

  if (!data.estimated_hours || data.estimated_hours < 1) {
    errors.estimated_hours = "Estimated hours must be at least 1"
  }

  if (!data.difficulty_level || !["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(data.difficulty_level)) {
    errors.difficulty_level = "Please select a difficulty level"
  }

  return errors
}

/**
 * Validate module form data
 */
export function validateModuleForm(data: Partial<ModuleCreatePayload>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters"
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters"
  }

  if (!data.order || data.order < 1) {
    errors.order = "Order must be at least 1"
  }

  return errors
}

/**
 * Validate assessment question form data
 */
export function validateQuizForm(data: {
  question_text?: string
  question_type?: string
  options?: string[]
  correct_answer?: string
}): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.question_text || data.question_text.trim().length < 5) {
    errors.question_text = "Question must be at least 5 characters"
  }

  if (!data.question_type) {
    errors.question_type = "Please select a question type"
  }

  if (data.question_type === "multiple_choice") {
    if (!data.options || data.options.length < 2) {
      errors.options = "Multiple choice questions must have at least 2 options"
    } else if (data.options.some(opt => !opt.trim())) {
      errors.options = "All options must have content"
    }
  }

  if (!data.correct_answer || !data.correct_answer.trim()) {
    errors.correct_answer = "Correct answer is required"
  }

  return errors
}


export interface AdminTransactionItem {
  id: number
  reference: string
  enrollment_id: number
  user_id: string
  user_name: string | null
  user_email: string | null
  course_id: number
  course_title: string | null
  amount: number
  currency: string
  status: "pending" | "successful" | "failed" | "cancelled" | "partial"
  payment_method: string | null
  is_split_payment: boolean
  admin_override_note: string | null
  created_at: string | null
  verified_at: string | null
  updated_at: string | null
}

export interface AdminTransactionStats {
  total: number
  pending: number
  successful: number
  failed: number
  cancelled: number
  partial: number
  total_revenue: number
}

export interface AdminTransactionListResponse {
  transactions: AdminTransactionItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
  stats: AdminTransactionStats
}

export interface AdminTransactionDetailResponse {
  payment: AdminTransactionItem
  enrollment_status: string
  gateway_response: Record<string, unknown> | null
  payment_history: AdminTransactionItem[]
  audit_trail: {
    id: number
    action: string
    previous_status: string | null
    new_status: string | null
    note: string | null
    admin_name: string
    created_at: string | null
  }[]
  split_info: {
    total_amount: number
    amount_paid: number
    outstanding_balance: number
    payment_count: number
  } | null
}

export interface AdminTransactionListParams {
  page?: number
  page_size?: number
  status?: string
  course_id?: number
  payment_method?: string
  search?: string
  date_from?: string
  date_to?: string
  sort_by?: string
  sort_order?: string
}

// ─── Admin Transactions API ─────────────────────────────────────

export const transactionAdminApi = {
  /** Look up a user by email */
  lookupUserByEmail: async (email: string): Promise<{ user_id: string; email: string; full_name: string }> => {
    const response = await apiClient.get("/admin/payments/lookup/user", { params: { email } })
    return response.data
  },

  /** Look up enrollments for a user by email */
  lookupEnrollmentsByEmail: async (email: string): Promise<{
    user_id: string
    email: string
    full_name: string
    enrollments: Array<{
      enrollment_id: number
      course_id: number
      course_title: string
      path_id: number | null
      enrollment_status: string
      is_active: boolean
    }>
  }> => {
    const response = await apiClient.get("/admin/payments/lookup/enrollments", { params: { email } })
    return response.data
  },

  /** List all transactions with filtering and pagination */
  listTransactions: async (params: AdminTransactionListParams = {}): Promise<AdminTransactionListResponse> => {
    const response = await apiClient.get<AdminTransactionListResponse>("/admin/payments/transactions", { params })
    return response.data
  },

  /** Get full details of a single transaction */
  getTransactionDetail: async (paymentId: number): Promise<AdminTransactionDetailResponse> => {
    const response = await apiClient.get<AdminTransactionDetailResponse>(`/admin/payments/transactions/${paymentId}`)
    return response.data
  },

  /** Resolve a payment (mark_completed, retry, cancel, mark_failed) */
  resolvePayment: async (paymentId: number, action: string, note: string) => {
    const response = await apiClient.post(`/admin/payments/transactions/${paymentId}/resolve`, { action, note })
    return response.data
  },

  /** Record a manual / cash payment */
  recordManualPayment: async (data: {
    user_email?: string
    user_id?: string
    course_id: number
    amount: number
    payment_method?: string
    note?: string
    path_id?: number
  }) => {
    const response = await apiClient.post("/admin/payments/manual", data)
    return response.data
  },

  /** Configure a split payment plan */
  configureSplitPayment: async (data: {
    enrollment_id: number
    total_amount: number
    initial_amount: number
    note?: string
  }) => {
    const response = await apiClient.post("/admin/payments/split/configure", data)
    return response.data
  },

  /** Record a split instalment */
  recordSplitPayment: async (data: {
    enrollment_id: number
    amount: number
    payment_method?: string
    note?: string
  }) => {
    const response = await apiClient.post("/admin/payments/split/record", data)
    return response.data
  },

  /** Get receipt data for a transaction */
  getReceiptData: async (paymentId: number) => {
    const response = await apiClient.get(`/admin/payments/transactions/${paymentId}/receipt`)
    return response.data
  },

  /** Send receipt email to customer */
  sendReceiptEmail: async (paymentId: number) => {
    const response = await apiClient.post(`/admin/payments/transactions/${paymentId}/receipt`)
    return response.data
  },

  /** Send payment reminder email */
  sendPaymentReminder: async (data: {
    enrollment_id: number
    custom_message?: string
    deadline?: string
  }) => {
    const response = await apiClient.post("/admin/payments/reminder", data)
    return response.data
  },

  /** Export transactions as CSV */
  exportCSV: async (status?: string): Promise<string> => {
    const params = status ? { status } : {}
    const response = await apiClient.get("/admin/payments/export", {
      params,
      responseType: "blob",
    })
    return response.data
  },
}
