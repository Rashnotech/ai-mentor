import { apiClient } from "./client"

// ============================================================================
// COURSE MANAGEMENT TYPES
// ============================================================================

export type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export interface CourseCreatePayload {
  title: string
  description: string
  slug: string
  estimated_hours: number
  difficulty_level: DifficultyLevel
  cover_image_url?: string
  prerequisites?: string[]
  what_youll_learn?: string[]
  certificate_on_completion?: boolean
}

export interface CourseUpdatePayload {
  title?: string
  description?: string
  slug?: string
  estimated_hours?: number
  difficulty_level?: DifficultyLevel
  cover_image_url?: string
  is_active?: boolean
  prerequisites?: string[]
  what_youll_learn?: string[]
  certificate_on_completion?: boolean
}

export interface CourseResponse {
  cover_image_url?: string | null
  course_id: number
  title: string
  slug: string
  description: string
  estimated_hours: number
  difficulty_level: string
  is_active: boolean
  prerequisites?: string[]
  what_youll_learn?: string[]
  certificate_on_completion: boolean
  average_rating?: number
  total_reviews: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CourseListResponse extends CourseResponse {
  paths_count: number
  modules_count: number
  min_price?: number
  learning_paths: PublicLearningPathResponse[]
}

export interface PublicLearningPathResponse {
  path_id: number
  title: string
  description: string
  price: number
  is_default: boolean
  is_custom: boolean
  min_skill_level?: string | null
  max_skill_level?: string | null
  tags: string[]
  modules_count: number
}

// Minimal course response for onboarding (brief)
export interface CourseBriefResponse {
  course_id: number
  title: string
  description: string
}

// Student course with progress
export interface StudentCourseResponse {
  course_id: number
  title: string
  slug: string
  description: string
  cover_image_url: string | null
  difficulty_level: string
  estimated_hours: number
  progress_percent: number
  total_modules: number
  completed_modules: number
  total_lessons: number
  completed_lessons: number
  path_id: number | null
  path_title: string | null
  enrolled_at: string | null
  last_accessed_at: string | null
}

// Available course (not enrolled)
export interface AvailableCourseResponse {
  course_id: number
  title: string
  slug: string
  description: string
  cover_image_url: string | null
  difficulty_level: string
  estimated_hours: number
  path_id: number | null
  path_title: string | null
}

// Combined response for student courses
export interface StudentCoursesListResponse {
  enrolled: StudentCourseResponse[]
  available: AvailableCourseResponse[]
}

// ============================================================================
// LEARNING CONTENT TYPES
// ============================================================================

export interface LessonContent {
  lesson_id: number
  title: string
  description: string | null
  content: string | null
  order: number
  content_type: string | null
  content_url: string | null
  youtube_video_url: string | null
  external_resources: string[]
  expected_outcomes: string[]
  estimated_minutes: number | null
  is_completed: boolean
}

export interface ProjectMilestone {
  id: string
  title: string
  description: string
  order: number
}

export interface MilestoneToggleResponse {
  project_id: number
  milestone_id: string
  completed: boolean
  completed_milestones: string[]
  total_milestones: number
  xp_awarded: number
}

export interface GitHubPrecheckResponse {
  is_valid_github_url: boolean
  repo_full_name: string | null
  is_public: boolean
  is_empty: boolean
  default_branch: string | null
  file_count: number
  has_readme: boolean
  detected_stack: string[]
  key_files: string[]
  readiness_status: "ready" | "needs_attention" | "blocked"
  summary: string
  bullets: string[]
}

export interface ProjectInterviewMessage {
  role: "user" | "assistant"
  content: string
}

export interface ProjectInterviewEvaluation {
  score_percent: number
  passed: boolean
  strengths: string[]
  gaps: string[]
  mentor_note: string
  xp_awarded: number
}

export interface ProjectInterviewTurnResponse {
  message: string
  question_number: number
  max_questions: number
  is_complete: boolean
  used_vision: boolean
  model: string
  evaluation: ProjectInterviewEvaluation | null
}

export interface ProjectContent {
  project_id: number
  submission_id: number | null  // ID needed for updating the URL
  module_id: number
  title: string
  description: string | null
  order: number
  estimated_hours: number | null
  starter_repo_url: string | null
  required_skills: string[]
  milestones?: ProjectMilestone[]
  completed_milestones?: string[]
  is_completed: boolean
  is_submitted: boolean
  submission_url: string | null
  submission_status: "submitted" | "in_review" | "approved" | "rejected" | null
  submitted_at: string | null
  // Mentor review data
  reviewer_feedback: string | null
  reviewed_at: string | null
  points_earned: number | null
}

export interface QuizQuestion {
  question_id: number
  question_text: string
  question_type: string | null
  difficulty_level: string | null
  order: number
  options: string[]
  points: number
  user_answer: string | null
  is_answered: boolean
  is_correct: boolean | null
  correct_answer: string | null
  explanation: string | null
}

export interface QuizContent {
  total_questions: number
  answered_count: number
  correct_count: number
  is_completed: boolean
  score_percent: number
  questions: QuizQuestion[]
}

export interface ModuleContent {
  module_id: number
  title: string
  description: string | null
  order: number
  estimated_hours: number | null
  content_loaded?: boolean
  start_day?: number
  due_day?: number
  unlock_at?: string
  due_at?: string
  is_unlocked?: boolean
  progress_percent: number
  lessons: LessonContent[]
  projects: ProjectContent[]
  quiz: QuizContent | null
}

export interface ProgrammeSchedule {
  duration_business_days: number
  excludes_weekends: boolean
  start_date: string
  end_date: string
  current_business_day: number
  business_days_left: number
  hours_remaining: number
  required_daily_hours: number
  pace_status: "on_track" | "at_risk" | "behind" | "ended"
}

export interface LearningContentResponse {
  course: {
    course_id: number
    title: string
    slug: string
    description: string | null
    difficulty_level: string | null
    estimated_hours: number | null
    cover_image_url: string | null
  }
  path: {
    path_id: number
    title: string
    description: string | null
  }
  progress: {
    total_lessons: number
    completed_lessons: number
    total_projects: number
    completed_projects: number
    overall_percent: number
  }
  programme_schedule?: ProgrammeSchedule
  newly_unlocked_modules?: Array<{ module_id: number; title: string }>
  modules: ModuleContent[]
}

// ============================================================================
// COURSE REVIEW TYPES
// ============================================================================

export interface CourseReviewCreatePayload {
  course_id: number
  rating: number // 1-5
  review_text?: string
  is_anonymous?: boolean
}

export interface CourseReviewUpdatePayload {
  rating?: number
  review_text?: string
  is_anonymous?: boolean
}

export interface CourseReviewResponse {
  review_id: number
  course_id: number
  user_id: string
  user_name: string
  rating: number
  review_text: string | null
  is_anonymous: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
}

export interface CourseReviewsListResponse {
  reviews: CourseReviewResponse[]
  total_count: number
  average_rating: number
  rating_distribution: {
    "1": number
    "2": number
    "3": number
    "4": number
    "5": number
  }
}

export interface LearningPathCreatePayload {
  course_id: number
  title: string
  description: string
  price?: number
  min_skill_level?: string
  max_skill_level?: string
  tags?: string[]
  is_default?: boolean
}

export interface LearningPathUpdatePayload {
  title?: string
  description?: string
  price?: number
  min_skill_level?: string
  max_skill_level?: string
  tags?: string[]
  is_default?: boolean
}

export interface LearningPathResponse {
  path_id: number
  course_id: number
  title: string
  description: string
  price: number
  is_default: boolean
  is_custom: boolean
  min_skill_level: string | null
  max_skill_level: string | null
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ModuleCreatePayload {
  path_id: number
  title: string
  description: string
  order: number
  estimated_hours?: number
  unlock_after_days?: number
  is_available_by_default?: boolean
  first_deadline_days?: number
  second_deadline_days?: number
  third_deadline_days?: number
}

export interface ModuleUpdatePayload {
  title?: string
  description?: string
  order?: number
  estimated_hours?: number
  unlock_after_days?: number
  is_available_by_default?: boolean
  first_deadline_days?: number
  second_deadline_days?: number
  third_deadline_days?: number
}

export interface ModuleResponse {
  module_id: number
  path_id: number
  title: string
  description: string
  order: number
  estimated_hours: number | null
  unlock_after_days: number
  is_available_by_default: boolean
  first_deadline_days: number | null
  second_deadline_days: number | null
  third_deadline_days: number | null
  created_at: string
  updated_at: string
}

export interface LessonCreatePayload {
  module_id: number
  title: string
  description: string
  content?: string
  order: number
  content_type?: string
  estimated_minutes?: number
  youtube_video_url?: string
  external_resources?: string[]
  expected_outcomes?: string[]
  starter_file_url?: string
  solution_file_url?: string
}

export interface LessonUpdatePayload {
  title?: string
  description?: string
  content?: string
  order?: number
  content_type?: string
  estimated_minutes?: number
  youtube_video_url?: string
  external_resources?: string[]
  expected_outcomes?: string[]
  starter_file_url?: string
  solution_file_url?: string
}

export interface LessonResponse {
  lesson_id: number
  module_id: number
  title: string
  description: string
  content: string | null
  order: number
  content_type: string | null
  estimated_minutes: number | null
  youtube_video_url: string | null
  external_resources: string[]
  expected_outcomes: string[]
  starter_file_url: string | null
  solution_file_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectCreatePayload {
  module_id: number
  title: string
  description: string
  order: number
  estimated_hours?: number
  starter_repo_url?: string
  solution_repo_url?: string
  required_skills?: string[]
}

export interface ProjectUpdatePayload {
  title?: string
  description?: string
  order?: number
  estimated_hours?: number
  starter_repo_url?: string
  solution_repo_url?: string
  required_skills?: string[]
  first_deadline_days?: number
  second_deadline_days?: number
  third_deadline_days?: number
}

export interface ProjectResponse {
  project_id: number
  module_id: number
  title: string
  description: string
  order: number
  estimated_hours: number | null
  starter_repo_url: string | null
  solution_repo_url: string | null
  required_skills: string[]
  first_deadline_days?: number | null
  second_deadline_days?: number | null
  third_deadline_days?: number | null
  created_at: string
  updated_at: string
}

export interface AssessmentQuestionCreatePayload {
  module_id: number
  question_text: string
  question_type: "multiple_choice" | "debugging" | "coding" | "short_answer"
  difficulty_level?: DifficultyLevel
  order: number
  options?: string[]
  correct_answer: string
  explanation?: string
  points?: number
}

export interface AssessmentQuestionUpdatePayload {
  question_text?: string
  question_type?: "multiple_choice" | "debugging" | "coding" | "short_answer"
  difficulty_level?: DifficultyLevel
  order?: number
  options?: string[]
  correct_answer?: string
  explanation?: string
  points?: number
}

export interface AssessmentQuestionResponse {
  question_id: number
  module_id: number
  question_text: string
  question_type: string
  difficulty_level: string
  order: number
  options: string[] | null
  correct_answer: string
  explanation: string | null
  points: number
  created_at: string
  updated_at: string
}

// ============================================================================
// USER ADMIN TYPES
// ============================================================================

export type UserRole = "student" | "mentor" | "admin"

export interface UserAdminResponse {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  users: UserAdminResponse[]
  total: number
  limit: number
  offset: number
}

export interface UserCreatePayload {
  email: string
  password: string
  full_name: string
  role?: UserRole
  is_active?: boolean
  is_verified?: boolean
  bio?: string
}

export interface UserUpdatePayload {
  email?: string
  full_name?: string
  role?: UserRole
  is_active?: boolean
  is_verified?: boolean
  bio?: string
}

export interface UserStatsResponse {
  total_users: number
  active_users: number
  verified_users: number
  students: number
  mentors: number
  admins: number
}

export interface AdminUserCertificate {
  certificate_id: number
  course_id: number
  path_id: number | null
  course_title: string | null
  path_title: string | null
  issued_at: string
  certificate_url: string
  is_public: boolean
}

export interface AdminUserEnrollmentCourse {
  enrollment_id: number
  course_id: number
  course_title: string
  course_slug: string | null
  path_id: number | null
  path_title: string | null
  enrollment_status: string
  is_active: boolean
  enrolled_at: string | null
  certificate: AdminUserCertificate | null
  assessment_scores: AdminModuleAssessmentScore[]
}

export interface AdminModuleAssessmentScore {
  module_id: number
  module_title: string
  module_order: number
  total_questions: number
  answered_questions: number
  correct_questions: number
  score_percent: number | null
}

export interface AdminUserLearningResponse {
  user_id: string
  enrolled_courses: AdminUserEnrollmentCourse[]
  certificates: AdminUserCertificate[]
}

export interface AdminCertificateUploadPayload {
  course_id: number
  path_id?: number | null
  certificate_url: string
  is_public?: boolean
}

export interface MentorProfileUpdate {
  title?: string
  company?: string
  expertise?: string[]
  languages?: string[]
  hourly_rate?: number
  availability?: string
  timezone?: string
  years_experience?: number
  linkedin_url?: string
  github_url?: string
  website_url?: string
  bio?: string
}

// ============================================================================
// BOOTCAMP TYPES
// ============================================================================

export type BootcampFormat = "online" | "in-person" | "hybrid"
export type BootcampStatus = "draft" | "published" | "in_progress" | "completed" | "cancelled"
export type EnrollmentPaymentStatus = "pending" | "partial" | "paid" | "refunded"

export interface BootcampCreatePayload {
  name: string
  slug: string
  description?: string
  start_date: string
  end_date: string
  duration?: string
  schedule?: string
  timezone?: string
  format?: BootcampFormat
  location?: string
  fee: number
  early_bird_fee?: number
  early_bird_deadline?: string
  currency?: string
  max_capacity?: number
  instructor_id?: string
  instructor_name?: string
  curriculum?: string[]
  course_id?: number
  path_id?: number
  cover_image_url?: string
}

export interface BootcampUpdatePayload {
  name?: string
  slug?: string
  description?: string
  start_date?: string
  end_date?: string
  duration?: string
  schedule?: string
  timezone?: string
  format?: BootcampFormat
  location?: string
  fee?: number
  early_bird_fee?: number
  early_bird_deadline?: string
  currency?: string
  max_capacity?: number
  status?: BootcampStatus
  is_active?: boolean
  instructor_id?: string
  instructor_name?: string
  curriculum?: string[]
  course_id?: number
  path_id?: number
  cover_image_url?: string
}

export interface BootcampResponse {
  bootcamp_id: number
  name: string
  slug: string
  description: string | null
  start_date: string
  end_date: string
  duration: string | null
  schedule: string | null
  timezone: string
  format: string
  location: string | null
  fee: number
  early_bird_fee: number | null
  early_bird_deadline: string | null
  currency: string
  max_capacity: number
  enrolled_count: number
  status: string
  is_active: boolean
  instructor_id: string | null
  instructor_name: string | null
  curriculum: string[] | null
  course_id: number | null
  path_id: number | null
  cover_image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface BootcampListResponse {
  bootcamp_id: number
  name: string
  slug: string
  description: string | null
  start_date: string
  end_date: string
  duration: string | null
  schedule: string | null
  format: BootcampFormat
  location: string | null
  fee: number
  early_bird_fee: number | null
  early_bird_deadline: string | null
  max_capacity: number
  enrolled_count: number
  spots_remaining: number
  status: BootcampStatus
  enrollment_open: boolean
  instructor_name: string | null
  curriculum: string[] | null
  course_id: number | null
  path_id: number | null
}

export interface EnrollmentCreatePayload {
  user_id?: string
  email?: string
  payment_status?: EnrollmentPaymentStatus
  amount_paid?: number
  notes?: string
}

export interface EnrollmentUpdatePayload {
  payment_status?: EnrollmentPaymentStatus
  amount_paid?: number
  notes?: string
  certificate_issued?: boolean
  certificate_url?: string
}

export interface EnrollmentResponse {
  enrollment_id: number
  bootcamp_id: number
  user_id: string
  user_name: string | null
  user_email: string | null
  payment_status: string
  amount_paid: number
  payment_date: string | null
  enrolled_at: string
  completed_at: string | null
  certificate_issued: boolean
  certificate_url: string | null
  notes: string | null
}

// ============================================================================
// PUBLIC COURSE TYPES
// ============================================================================

export interface CurriculumItem {
  id: string
  title: string
  type: "lesson" | "project"
  content_type?: string
  duration: string
  has_video?: boolean
}

export interface CurriculumModule {
  module_id: number
  title: string
  description: string
  order: number
  lessons_count: number
  projects_count: number
  duration: string
  items: CurriculumItem[]
}

export interface CourseCurriculumResponse {
  course_id: number
  course_title: string
  path_id: number | null
  path_title: string | null
  modules: CurriculumModule[]
}

// ============================================================================
// PUBLIC COURSE API (No authentication required)
// ============================================================================

export const publicCourseApi = {
  /**
   * List courses with minimal details (title and description only)
   * Optimized for onboarding where full course details aren't needed
   */
  listCoursesBrief: async (params?: {
    search?: string
    limit?: number
    offset?: number
  }): Promise<CourseBriefResponse[]> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<CourseBriefResponse[]>(`/public/courses/brief${query ? `?${query}` : ""}`)
    return response.data
  },

  /**
   * List all active/published courses
   */
  listCourses: async (params?: {
    search?: string
    difficulty?: string
    limit?: number
    offset?: number
  }): Promise<CourseListResponse[]> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.difficulty) searchParams.append("difficulty", params.difficulty)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<CourseListResponse[]>(`/public/courses${query ? `?${query}` : ""}`)
    return response.data
  },

  /**
   * Get course details by ID
   */
  getCourse: async (courseId: number): Promise<CourseListResponse> => {
    const response = await apiClient.get<CourseListResponse>(`/public/courses/${courseId}`)
    return response.data
  },

  /**
   * Get course details by slug
   */
  getCourseBySlug: async (slug: string): Promise<CourseListResponse> => {
    const response = await apiClient.get<CourseListResponse>(`/public/courses/by-slug/${slug}`)
    return response.data
  },

  /**
   * Get course curriculum (modules, lessons, projects)
   */
  getCurriculum: async (courseId: number, pathId?: number): Promise<CourseCurriculumResponse> => {
    const searchParams = new URLSearchParams()
    if (typeof pathId === "number") searchParams.append("path_id", pathId.toString())
    const query = searchParams.toString()
    const response = await apiClient.get<CourseCurriculumResponse>(`/public/courses/${courseId}/curriculum${query ? `?${query}` : ""}`)
    return response.data
  },

  /**
   * Get course curriculum by slug
   */
  getCurriculumBySlug: async (slug: string, pathId?: number): Promise<CourseCurriculumResponse> => {
    const searchParams = new URLSearchParams()
    if (typeof pathId === "number") searchParams.append("path_id", pathId.toString())
    const query = searchParams.toString()
    const response = await apiClient.get<CourseCurriculumResponse>(`/public/courses/by-slug/${slug}/curriculum${query ? `?${query}` : ""}`)
    return response.data
  },

  /**
   * Get course reviews
   */
  getReviews: async (
    courseId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<CourseReviewsListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    const queryString = searchParams.toString()
    const url = `/public/courses/${courseId}/reviews${queryString ? `?${queryString}` : ""}`
    const response = await apiClient.get<CourseReviewsListResponse>(url)
    return response.data
  },

  /**
   * Get course reviews by slug
   */
  getReviewsBySlug: async (
    slug: string,
    params?: { limit?: number; offset?: number }
  ): Promise<CourseReviewsListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    const queryString = searchParams.toString()
    const url = `/public/courses/by-slug/${slug}/reviews${queryString ? `?${queryString}` : ""}`
    const response = await apiClient.get<CourseReviewsListResponse>(url)
    return response.data
  },
}


// ============================================================================
// COURSE ADMIN API
// ============================================================================

export interface JsonImportItemCounts {
  created: number
  updated: number
}

export interface JsonCourseImportResponse {
  action: "created" | "updated"
  course_id: number
  course_name: string
  learning_path_action: "created" | "updated"
  learning_path_id: number
  learning_path_name: string
  modules: JsonImportItemCounts
  lessons: JsonImportItemCounts
  projects: JsonImportItemCounts
  quizzes: JsonImportItemCounts
}

export const courseAdminApi = {
  // Course CRUD
  listCourses: async (params?: {
    status?: "active" | "inactive"
    search?: string
    created_by?: string
    limit?: number
    offset?: number
    include_paths?: boolean
  }): Promise<CourseListResponse[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status_filter", params.status)
    if (params?.search) searchParams.append("search", params.search)
    if (params?.created_by) searchParams.append("created_by", params.created_by)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    if (params?.include_paths) searchParams.append("include_paths", "true")
    
    const query = searchParams.toString()
    const response = await apiClient.get<CourseListResponse[]>(`/courses${query ? `?${query}` : ""}`)
    return response.data
  },

  getCourse: async (courseId: number): Promise<CourseListResponse> => {
    const response = await apiClient.get<CourseListResponse>(`/courses/${courseId}`)
    return response.data
  },

  createCourse: async (data: CourseCreatePayload): Promise<CourseResponse> => {
    const response = await apiClient.post<CourseResponse>("/courses", data)
    return response.data
  },

  importCourseFromJson: async (file: File): Promise<JsonCourseImportResponse> => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await apiClient.post<JsonCourseImportResponse>("/courses/json-import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data
  },

  updateCourse: async (courseId: number, data: CourseUpdatePayload): Promise<CourseResponse> => {
    const response = await apiClient.put<CourseResponse>(`/courses/${courseId}`, data)
    return response.data
  },

  assignCourseMentor: async (courseId: number, mentorId: string): Promise<CourseResponse> => {
    const response = await apiClient.post<CourseResponse>(`/courses/${courseId}/assign-mentor`, {
      mentor_id: mentorId,
    })
    return response.data
  },

  deleteCourse: async (courseId: number): Promise<void> => {
    await apiClient.delete(`/courses/${courseId}`)
  },

  /**
   * Approve a project submission (mentor/admin)
   */
  approveProjectSubmission: async (submissionId: number, feedback?: string, points?: number): Promise<any> => {
    const params = new URLSearchParams()
    if (feedback) params.set("feedback", feedback)
    if (points !== undefined && points !== null) params.set("points", String(points))
    const query = params.toString()
    const url = `/reviews/submissions/${submissionId}/approve${query ? `?${query}` : ""}`
    const response = await apiClient.post(url)
    return response.data
  },

  /**
   * Reject a project submission with feedback (mentor/admin). Used for both
   * "Needs Revision" and "Rejected" outcomes — the backend only has one
   * negative terminal status.
   */
  rejectProjectSubmission: async (submissionId: number, feedback: string): Promise<any> => {
    const url = `/reviews/submissions/${submissionId}/reject?feedback=${encodeURIComponent(feedback)}`
    const response = await apiClient.post(url)
    return response.data
  },

  // Learning Paths
  listLearningPaths: async (courseId: number): Promise<LearningPathResponse[]> => {
    const response = await apiClient.get<LearningPathResponse[]>(`/courses/${courseId}/paths`)
    return response.data
  },

  createLearningPath: async (courseId: number, data: LearningPathCreatePayload): Promise<LearningPathResponse> => {
    const response = await apiClient.post<LearningPathResponse>(`/courses/${courseId}/paths`, data)
    return response.data
  },

  setDefaultPath: async (courseId: number, pathId: number): Promise<LearningPathResponse> => {
    const response = await apiClient.post<LearningPathResponse>(`/courses/${courseId}/paths/${pathId}/set-default`)
    return response.data
  },

  unsetDefaultPath: async (courseId: number, pathId: number): Promise<LearningPathResponse> => {
    const response = await apiClient.post<LearningPathResponse>(`/courses/${courseId}/paths/${pathId}/unset-default`)
    return response.data
  },

  updateLearningPath: async (pathId: number, data: LearningPathUpdatePayload): Promise<LearningPathResponse> => {
    const response = await apiClient.put<LearningPathResponse>(`/courses/paths/${pathId}`, data)
    return response.data
  },

  deleteLearningPath: async (pathId: number): Promise<void> => {
    await apiClient.delete(`/courses/paths/${pathId}`)
  },

  // Modules
  listModules: async (pathId: number): Promise<ModuleResponse[]> => {
    const response = await apiClient.get<ModuleResponse[]>(`/courses/paths/${pathId}/modules`)
    return response.data
  },

  createModule: async (pathId: number, data: ModuleCreatePayload): Promise<ModuleResponse> => {
    const response = await apiClient.post<ModuleResponse>(`/courses/paths/${pathId}/modules`, data)
    return response.data
  },

  updateModule: async (moduleId: number, data: ModuleUpdatePayload): Promise<ModuleResponse> => {
    const response = await apiClient.put<ModuleResponse>(`/courses/modules/${moduleId}`, data)
    return response.data
  },

  deleteModule: async (moduleId: number): Promise<void> => {
    await apiClient.delete(`/courses/modules/${moduleId}`)
  },

  // Lessons
  listLessons: async (moduleId: number): Promise<LessonResponse[]> => {
    const response = await apiClient.get<LessonResponse[]>(`/courses/modules/${moduleId}/lessons`)
    return response.data
  },

  createLesson: async (moduleId: number, data: LessonCreatePayload): Promise<LessonResponse> => {
    const response = await apiClient.post<LessonResponse>(`/courses/modules/${moduleId}/lessons`, data)
    return response.data
  },

  updateLesson: async (lessonId: number, data: LessonUpdatePayload): Promise<LessonResponse> => {
    const response = await apiClient.put<LessonResponse>(`/courses/lessons/${lessonId}`, data)
    return response.data
  },

  deleteLesson: async (lessonId: number): Promise<void> => {
    await apiClient.delete(`/courses/lessons/${lessonId}`)
  },

  // Projects
  listProjects: async (moduleId: number): Promise<ProjectResponse[]> => {
    const response = await apiClient.get<ProjectResponse[]>(`/courses/modules/${moduleId}/projects`)
    return response.data
  },

  createProject: async (moduleId: number, data: ProjectCreatePayload): Promise<ProjectResponse> => {
    const response = await apiClient.post<ProjectResponse>(`/courses/modules/${moduleId}/projects`, data)
    return response.data
  },

  updateProject: async (projectId: number, data: ProjectUpdatePayload): Promise<ProjectResponse> => {
    const response = await apiClient.put<ProjectResponse>(`/courses/projects/${projectId}`, data)
    return response.data
  },

  deleteProject: async (projectId: number): Promise<void> => {
    await apiClient.delete(`/courses/projects/${projectId}`)
  },

  // Assessments
  listAssessments: async (moduleId: number): Promise<AssessmentQuestionResponse[]> => {
    const response = await apiClient.get<AssessmentQuestionResponse[]>(`/courses/modules/${moduleId}/assessments`)
    return response.data
  },

  createAssessmentQuestion: async (moduleId: number, data: AssessmentQuestionCreatePayload): Promise<AssessmentQuestionResponse> => {
    const response = await apiClient.post<AssessmentQuestionResponse>(`/courses/modules/${moduleId}/assessments`, data)
    return response.data
  },

  updateAssessmentQuestion: async (questionId: number, data: AssessmentQuestionUpdatePayload): Promise<AssessmentQuestionResponse> => {
    const response = await apiClient.put<AssessmentQuestionResponse>(`/courses/assessments/${questionId}`, data)
    return response.data
  },

  deleteAssessmentQuestion: async (questionId: number): Promise<void> => {
    await apiClient.delete(`/courses/assessments/${questionId}`)
  },

  // Mentor Students
  getMentorStudents: async (params?: {
    search?: string
    course_id?: number
    mentor_id?: string
    limit?: number
    offset?: number
  }): Promise<MentorStudentsResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.course_id) searchParams.append("course_id", params.course_id.toString())
    if (params?.mentor_id) searchParams.append("mentor_id", params.mentor_id)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<MentorStudentsResponse>(`/courses/my-students${query ? `?${query}` : ""}`)
    return response.data
  },

  // Get student's project submissions for a specific course (for mentor review)
  getStudentProjects: async (studentId: string, courseId: number): Promise<StudentProjectSubmission[]> => {
    const response = await apiClient.get<any>(
      `/courses/students/${studentId}/projects?course_id=${courseId}`
    )
    const data = response.data
    // Backend may return either an array of submissions or an object { projects: [], total_count: ... }
    if (Array.isArray(data)) return data as StudentProjectSubmission[]
    if (data && Array.isArray(data.projects)) return data.projects as StudentProjectSubmission[]
    return []
  },
}

// Mentor Students Types
export interface MentorStudentInfo {
  id: string
  name: string
  email: string
  avatar_url: string | null
  course_id: number
  course_title: string
  enrolled_at: string | null
  skill_level: string | null
  learning_mode: string | null
  last_active_at: string | null
  path_id: number | null
}

export interface MentorCourseSummary {
  course_id: number
  title: string
  slug: string
}

export interface MentorStudentsResponse {
  students: MentorStudentInfo[]
  total: number
  courses: MentorCourseSummary[]
}

// Student project submission for mentor review
export interface StudentProjectSubmission {
  submission_id: number
  project_id: number
  project_title: string
  module_id: number
  module_title: string
  submission_url: string
  description: string | null
  status: "submitted" | "approved" | "rejected"
  is_approved: boolean
  deadline_status: "on_time" | "late_50" | "late_25"
  points_earned: number
  submitted_at: string
  reviewed_at: string | null
  reviewer_feedback: string | null
}

// ============================================================================
// STUDENT COURSES API
// ============================================================================

// Student project with progress
export interface StudentProjectResponse {
  project_id: number
  title: string
  description: string
  order: number
  estimated_hours: number | null
  starter_repo_url: string | null
  solution_repo_url: string | null
  required_skills: string[]
  module_id: number
  module_title: string
  course_id: number
  course_title: string
  course_slug: string
  status: "not_started" | "in_progress" | "submitted" | "approved" | "rejected"
  submission_url: string | null
  submitted_at: string | null
  reviewer_feedback: string | null
  milestones?: ProjectMilestone[]
  completed_milestones?: string[]
}

export interface StudentProjectsListResponse {
  projects: StudentProjectResponse[]
  total_count: number
  completed_count: number
  in_progress_count: number
}

export const studentCoursesApi = {
  /**
   * Get student's enrolled courses with progress, plus available courses
   */
  getMyCourses: async (): Promise<StudentCoursesListResponse> => {
    const response = await apiClient.get<StudentCoursesListResponse>("/enrollments/my-courses")
    return response.data
  },

  /**
   * Get all projects from student's enrolled courses
   */
  getMyProjects: async (): Promise<StudentProjectsListResponse> => {
    const response = await apiClient.get<StudentProjectsListResponse>("/enrollments/my-projects")
    return response.data
  },

  /**
   * Enroll in a course
   */
  enrollInCourse: async (
    courseId: number,
    preferredPathId?: number
  ): Promise<{ enrollment: unknown; course: unknown; assigned_path: unknown }> => {
    const payload = typeof preferredPathId === "number" ? { preferred_path_id: preferredPathId } : undefined
    const response = await apiClient.post(`/enrollments/courses/${courseId}`, payload)
    return response.data
  },

  /**
   * Get learning path for an enrolled course
   */
  getCoursePath: async (courseId: number): Promise<unknown> => {
    const response = await apiClient.get(`/enrollments/courses/${courseId}`)
    return response.data
  },

  /**
   * Check enrollment status by course slug
   */
  checkEnrollmentBySlug: async (slug: string): Promise<{
    is_enrolled: boolean
    course_id: number | null
    course_slug: string
    path_id: number | null
  }> => {
    const response = await apiClient.get(`/enrollments/courses/by-slug/${slug}/enrollment-status`)
    return response.data
  },

  /**
   * Get full or gradual (lite) learning content for an enrolled course
   */
  getLearningContentBySlug: async (
    slug: string,
    options?: { preview?: boolean; lite?: boolean; moduleId?: number }
  ): Promise<LearningContentResponse> => {
    const searchParams = new URLSearchParams()
    if (options?.preview) searchParams.append("preview", "true")
    if (options?.lite) searchParams.append("lite", "true")
    if (options?.moduleId !== undefined) searchParams.append("module_id", String(options.moduleId))
    const query = searchParams.toString()
    const response = await apiClient.get<LearningContentResponse>(
      `/enrollments/courses/by-slug/${slug}/learning-content${query ? `?${query}` : ""}`,
      { timeout: 60000 }
    )
    return response.data
  },

  /**
   * Mark a lesson as completed
   */
  markLessonComplete: async (lessonId: number, timeSpentMinutes: number = 0, notes?: string): Promise<{
    progress_id: number
    lesson_id: number
    completed: boolean
    time_spent_minutes: number
    completed_at: string | null
  }> => {
    const response = await apiClient.post(`/enrollments/progress/lessons/${lessonId}/complete`, {
      time_spent_minutes: timeSpentMinutes,
      notes: notes || null,
    })
    return response.data
  },

  /**
   * Submit a quiz answer and verify if correct
   */
  submitQuizAnswer: async (questionId: number, answer: string): Promise<{
    question_id: number
    is_correct: boolean
    correct_answer: string | null
    explanation: string | null
    points_earned: number
  }> => {
    const response = await apiClient.post(`/enrollments/progress/quiz/${questionId}/answer`, {
      answer,
    })
    return response.data
  },

  /**
   * Submit a project solution
   */
  submitProject: async (projectId: number, moduleId: number, solutionUrl: string, description?: string): Promise<{
    submission_id: number
    project_id: number
    module_id: number
    solution_url: string
    status: string
    is_approved: boolean
    deadline_status: string
    points_earned: number
    submitted_at: string
    reviewed_at: string | null
  }> => {
    const response = await apiClient.post(`/enrollments/progress/projects/${projectId}/submit`, {
      module_id: moduleId,
      solution_url: solutionUrl,
      description: description || null,
    })
    return response.data
  },

  /**
   * Update a project submission URL (before mentor review)
   * Students can only update the submission URL if it hasn't been reviewed yet.
   */
  updateProjectSubmissionUrl: async (submissionId: number | null, solutionUrl: string, moduleId: number): Promise<any> => {
    const response = await apiClient.put(`/enrollments/progress/projects/${submissionId}/update-url`, {
      solution_url: solutionUrl,
      module_id: moduleId,
    })
    return response.data
  },

  /**
   * Toggle completion of a project micro-milestone checkpoint
   */
  toggleProjectMilestone: async (
    projectId: number,
    moduleId: number,
    milestoneId: string,
    completed: boolean
  ): Promise<MilestoneToggleResponse> => {
    const response = await apiClient.post<MilestoneToggleResponse>(
      `/enrollments/progress/projects/${projectId}/milestones/${encodeURIComponent(milestoneId)}/toggle`,
      {
        module_id: moduleId,
        completed,
      }
    )
    return response.data
  },

  /**
   * Run automated GitHub repository pre-check before submitting to mentor
   */
  precheckProjectRepo: async (
    projectId: number,
    repoUrl: string
  ): Promise<GitHubPrecheckResponse> => {
    const response = await apiClient.post<GitHubPrecheckResponse>(
      `/enrollments/progress/projects/${projectId}/precheck`,
      {
        repo_url: repoUrl,
      }
    )
    return response.data
  },

  /**
   * Run one turn of Mode 1: Project Defense Interview (Groq Vision + Text)
   */
  runProjectDefenseTurn: async (payload: {
    project_id: number
    transcript: ProjectInterviewMessage[]
    screenshot_data_url?: string | null
    repo_url?: string | null
  }): Promise<ProjectInterviewTurnResponse> => {
    const response = await apiClient.post<ProjectInterviewTurnResponse>(
      "/ai/project-interview/turn",
      payload
    )
    return response.data
  },

  /**
   * AI mentor trigger: call once when a student opens a project. Idempotent —
   * returns the same guidance on repeat calls instead of regenerating it.
   */
  startProject: async (projectId: number): Promise<{ guidance: AIMentorFeedbackItem }> => {
    const response = await apiClient.post(`/enrollments/progress/projects/${projectId}/start`)
    return response.data
  },

  /**
   * The student's "AI Mentor Feedback" dashboard feed (quiz reviews, project
   * guidance, inactivity check-ins), newest first.
   */
  getMentorFeedback: async (limit: number = 20): Promise<AIMentorFeedbackItem[]> => {
    const response = await apiClient.get<{ items: AIMentorFeedbackItem[] }>(
      `/enrollments/progress/ai-feedback?limit=${limit}`
    )
    return response.data.items
  },

  /**
   * Synthesize full spoken audio (MP3) for a lesson overview using Microsoft Edge Neural TTS (edge-tts).
   */
  synthesizeLessonOverviewSpeech: async (
    text: string,
    voice: string = "en-US-AriaNeural"
  ): Promise<Blob> => {
    const response = await apiClient.post(
      "/ai/lesson-overview/speech",
      { text, voice },
      { responseType: "blob" }
    )
    return response.data
  },
}

// AI Mentor Feedback — smart-trigger messages generated for a student
// (quiz score review, project-start guidance, inactivity check-in)
export interface AIMentorFeedbackItem {
  feedback_id: number
  category: "quiz_encouragement" | "quiz_correction" | "project_guidance" | "inactivity_checkin"
  title: string
  message: string
  context_title: string | null
  score_percent: number | null
  created_at: string
}

// ============================================================================
// GAMIFICATION TYPES
// ============================================================================

export interface GamificationResponse {
  total_xp: number
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  total_questions_answered: number
  total_correct_answers: number
  accuracy_percentage: number
  timezone: string
}

export interface CertificateResponse {
  certificate_id: number
  course_id: number
  path_id: number | null
  course_title?: string | null
  path_title?: string | null
  issued_at: string
  certificate_url: string
  is_public: boolean
}

// ============================================================================
// REWARDS API
// ============================================================================

export const rewardsApi = {
  /**
   * Get certificates earned by the current user
   */
  getMyCertificates: async (): Promise<CertificateResponse[]> => {
    const response = await apiClient.get<CertificateResponse[]>("/rewards/me/certificates")
    return response.data
  },
}

// ============================================================================
// GAMIFICATION API
// ============================================================================

export const gamificationApi = {
  /**
   * Get current user's XP and streak data
   */
  getMyGamification: async (): Promise<GamificationResponse> => {
    const response = await apiClient.get<GamificationResponse>("/rewards/me/gamification")
    return response.data
  },

  /**
   * Recalculate gamification data (recovery/admin)
   */
  recalculate: async (): Promise<GamificationResponse> => {
    const response = await apiClient.post<GamificationResponse>("/rewards/me/gamification/recalculate")
    return response.data
  },
}

// ============================================================================
// COURSE REVIEWS API
// ============================================================================

export const courseReviewsApi = {
  /**
   * Create a review for a course (must be enrolled)
   */
  createReview: async (payload: CourseReviewCreatePayload): Promise<CourseReviewResponse> => {
    const response = await apiClient.post<CourseReviewResponse>("/enrollments/reviews", payload)
    return response.data
  },

  /**
   * Get all reviews for a course
   */
  getCourseReviews: async (
    courseId: number,
    params?: { limit?: number; offset?: number; approved_only?: boolean }
  ): Promise<CourseReviewsListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    if (params?.approved_only !== undefined) searchParams.append("approved_only", params.approved_only.toString())
    const queryString = searchParams.toString()
    const url = `/enrollments/reviews/course/${courseId}${queryString ? `?${queryString}` : ""}`
    const response = await apiClient.get<CourseReviewsListResponse>(url)
    return response.data
  },

  /**
   * Get current user's review for a course
   */
  getMyReview: async (courseId: number): Promise<CourseReviewResponse | null> => {
    try {
      const response = await apiClient.get<CourseReviewResponse>(`/enrollments/reviews/my-review/${courseId}`)
      return response.data
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } }
        if (axiosError.response?.status === 404) {
          return null
        }
      }
      throw error
    }
  },

  /**
   * Update a review
   */
  updateReview: async (reviewId: number, payload: CourseReviewUpdatePayload): Promise<CourseReviewResponse> => {
    const response = await apiClient.put<CourseReviewResponse>(`/enrollments/reviews/${reviewId}`, payload)
    return response.data
  },

  /**
   * Delete a review
   */
  deleteReview: async (reviewId: number): Promise<void> => {
    await apiClient.delete(`/enrollments/reviews/${reviewId}`)
  },
}

