import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { getAccessToken, getRefreshToken, updateAccessToken, clearAuthData, isAccessTokenExpired } from "./auth-storage"

// API Base URL - adjust based on your environment
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1` || "http://localhost:8000/api/v1"

// Create axios instance with defaults
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send HttpOnly cookies cross-origin
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Attempt to refresh the access token
 * Returns the new access token or throws an error
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  
  if (!refreshToken) {
    throw new Error("No refresh token available")
  }
  
  // Use a separate axios instance to avoid interceptor loops
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    }
  )
  
  const newAccessToken = response.data.access_token
  if (!newAccessToken) {
    throw new Error("No access token in refresh response")
  }
  
  updateAccessToken(newAccessToken)
  return newAccessToken
}

/**
 * Handle redirect to login page
 * Only redirects if not already on login/signup pages
 */
function redirectToLogin() {
  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname
    // Don't redirect if already on auth pages
    if (!currentPath.includes("/login") && !currentPath.includes("/signup")) {
      window.location.href = "/login"
    }
  }
}

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth header for refresh endpoint to avoid loops
    if (config.url?.includes("/auth/refresh")) {
      return config
    }
    
    let token = getAccessToken()
    
    // If token is expired but we have a refresh token, try to refresh proactively
    if ((!token || isAccessTokenExpired()) && getRefreshToken() && !isRefreshing) {
      isRefreshing = true
      try {
        token = await refreshAccessToken()
        processQueue(null, token)
      } catch (error) {
        processQueue(error as Error, null)
        // Don't throw here, let the request proceed and handle 401 in response interceptor
      } finally {
        isRefreshing = false
      }
    }
    
    // If currently refreshing, wait for it to complete
    if (isRefreshing && token === null) {
      token = await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for handling errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number }
    
    // Don't retry if no config or if it's a network error without response
    if (!originalRequest) {
      return Promise.reject(error)
    }
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for auth endpoints
      if (originalRequest.url?.includes("/auth/")) {
        return Promise.reject(error)
      }
      
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        const newAccessToken = await refreshAccessToken()
        processQueue(null, newAccessToken)
        
        // Update the original request with new token
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        }
        
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        
        // Check if it's actually an auth error vs network error
        if (axios.isAxiosError(refreshError)) {
          const status = refreshError.response?.status
          // Only clear auth and redirect for definitive auth failures.
          // Skip if the user has a cookie-based OAuth session (no refresh token
          // stored, but a Zustand user exists) — clearing storage would wipe their
          // session and force an unnecessary login redirect.
          if (status === 401 || status === 403) {
            const hasOAuthSession = (() => {
              try {
                const stored = sessionStorage.getItem("user-storage")
                return !!(stored && JSON.parse(stored)?.state?.user)
              } catch { return false }
            })()
            if (!hasOAuthSession) {
              clearAuthData()
              redirectToLogin()
            }
          }
          // For other errors (network, 500, etc), just reject without clearing
        } else {
          // Non-axios error during refresh (e.g. "No refresh token available").
          // Only hard-redirect if this isn't an OAuth cookie session.
          const hasOAuthSession = (() => {
            try {
              const stored = sessionStorage.getItem("user-storage")
              return !!(stored && JSON.parse(stored)?.state?.user)
            } catch { return false }
          })()
          if (!hasOAuthSession) {
            clearAuthData()
            redirectToLogin()
          }
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
    // Handle 403 with invalid token message
    if (error.response?.status === 403) {
      const errorData = error.response.data as { detail?: string }
      if (errorData?.detail === "Invalid token" || errorData?.detail === "Token expired") {
        // Token is definitely invalid, try refresh
        if (!originalRequest._retry) {
          originalRequest._retry = true
          try {
            const newAccessToken = await refreshAccessToken()
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newAccessToken}`,
            }
            return apiClient(originalRequest)
          } catch {
            const hasOAuthSession = (() => {
              try {
                const stored = sessionStorage.getItem("user-storage")
                return !!(stored && JSON.parse(stored)?.state?.user)
              } catch { return false }
            })()
            if (!hasOAuthSession) {
              clearAuthData()
              redirectToLogin()
            }
          }
        }
      }
    }
    
    return Promise.reject(error)
  }
)

// Type for API error responses
export interface ApiError {
  detail: string
  status_code?: number
}

// Helper to extract error message from API response
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    
    // Handle network errors
    if (!axiosError.response) {
      return "Network error. Please check your internet connection."
    }
    
    // Handle specific HTTP status codes
    switch (axiosError.response.status) {
      case 400:
        return axiosError.response.data?.detail || "Invalid request. Please check your input."
      case 401:
        return axiosError.response.data?.detail || "Authentication failed."
      case 403:
        return "You don't have permission to perform this action."
      case 404:
        return "Resource not found."
      case 409:
        return axiosError.response.data?.detail || "This resource already exists."
      case 422:
        return axiosError.response.data?.detail || "Validation error. Please check your input."
      case 429:
        return axiosError.response.data?.detail || "Too many requests. Please try again later."
      case 500:
        return "Server error. Please try again later."
      default:
        return axiosError.response.data?.detail || "An unexpected error occurred."
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return "An unexpected error occurred."
}

// Auth API endpoints
export const authApi = {
  signup: async (data: SignupPayload) => {
    const response = await apiClient.post("/auth/signup", data)
    return response.data
  },
  
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data)
    return response.data
  },
  
  logout: async (logoutAllDevices: boolean = false) => {
    const response = await apiClient.post("/auth/logout", { logout_all_devices: logoutAllDevices })
    return response.data
  },
  
  /**
   * Get current authenticated user's information
   */
  getMe: async (): Promise<{ user: UserResponse }> => {
    const response = await apiClient.get<{ user: UserResponse }>("/auth/me")
    return response.data
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh", { refresh_token: refreshToken })
    return response.data
  },
  
  resetPassword: async (email: string) => {
    const response = await apiClient.post("/auth/reset-password", { email })
    return response.data
  },

  verifyResetOtp: async (email: string, otp: string): Promise<{ reset_token: string; message: string; status: string }> => {
    const response = await apiClient.post("/auth/verify-reset-otp", { email, otp })
    return response.data
  },

  resendResetOtp: async (email: string) => {
    const response = await apiClient.post("/auth/resend-reset-otp", { email })
    return response.data
  },

  confirmResetPassword: async (data: ResetPasswordConfirmPayload) => {
    const response = await apiClient.post("/auth/reset-password/confirm", data)
    return response.data
  },

  // Email verification
  verifyEmail: async (email: string, code: string): Promise<{ message: string; status: string }> => {
    const response = await apiClient.post("/auth/verify-email", { email, code })
    return response.data
  },

  resendVerificationEmail: async (email: string): Promise<{ message: string; status: string }> => {
    const response = await apiClient.post("/auth/resend-verification", { email })
    return response.data
  },

  getVerificationStatus: async (): Promise<{ is_verified: boolean; email: string }> => {
    const response = await apiClient.get("/auth/verification-status")
    return response.data
  },

  /**
   * Update current user's profile
   */
  updateProfile: async (data: ProfileUpdatePayload): Promise<{ user: UserResponse }> => {
    const response = await apiClient.put<{ user: UserResponse }>("/auth/me", data)
    return response.data
  },

  /**
   * Get current mentor's profile
   */
  getMentorProfile: async (): Promise<MentorProfileResponse> => {
    const response = await apiClient.get<MentorProfileResponse>("/auth/me/mentor-profile")
    return response.data
  },

  /**
   * Update current mentor's profile
   */
  updateMentorProfile: async (data: MentorProfileUpdatePayload): Promise<MentorProfileResponse> => {
    const response = await apiClient.put<MentorProfileResponse>("/auth/me/mentor-profile", data)
    return response.data
  },

  /**
   * Update avatar URL
   */
  updateAvatar: async (avatarUrl: string): Promise<{ avatar_url: string; message: string }> => {
    const response = await apiClient.put<{ avatar_url: string; message: string }>("/auth/me/avatar", { avatar_url: avatarUrl })
    return response.data
  },

  // ── OAuth Authentication ──────────────────────────────────

  /**
   * Get the backend OAuth login redirect URL for the given provider.
   * The browser should navigate to this URL — the backend will issue a
   * 302 redirect to the provider's consent screen.
   */
  getOAuthLoginUrl: (provider: "google" | "github"): string => {
    return `${API_BASE_URL}/auth/${provider}/login`
  },

  /** @deprecated Use getOAuthLoginUrl() + window.location.href instead */
  getGoogleAuthUrl: async (): Promise<{ authorization_url: string; state: string }> => {
    return { authorization_url: `${API_BASE_URL}/auth/google/login`, state: "" }
  },

  /** @deprecated Use getOAuthLoginUrl() + window.location.href instead */
  getGithubAuthUrl: async (): Promise<{ authorization_url: string; state: string }> => {
    return { authorization_url: `${API_BASE_URL}/auth/github/login`, state: "" }
  },

  /**
   * Handle OAuth callback — POST code + state to backend.
   * The backend exchanges the code for tokens, sets HttpOnly cookies,
   * and returns user info (tokens are NOT in the response body).
   */
  handleOAuthCallback: async (
    provider: "google" | "github",
    code: string,
    state: string,
  ): Promise<OAuthLoginResponse> => {
    const response = await apiClient.post<OAuthLoginResponse>(
      `/auth/${provider}/callback`,
      { code, state },
    )
    return response.data
  },

  /**
   * Clear HttpOnly auth cookies (OAuth logout).
   */
  oauthLogout: async (): Promise<void> => {
    await apiClient.post("/auth/oauth/logout")
  },
}

// Mentor Profile Types
export interface MentorProfileResponse {
  user_id: string
  title: string | null
  company: string | null
  expertise: string[]
  languages: string[]
  hourly_rate: number | null
  availability: string
  timezone: string
  years_experience: number | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  total_sessions: number
  total_students: number
  rating: number
  message?: string
}

export interface MentorProfileUpdatePayload {
  title?: string
  company?: string
  languages?: string[]
  expertise?: string[]
  years_experience?: number
  timezone?: string
  availability?: string
}

// Onboarding API endpoints
export const onboardingApi = {
  /**
   * Start the onboarding process (creates profile if doesn't exist)
   */
  start: async (): Promise<OnboardingProfileResponse> => {
    const response = await apiClient.post("/onboarding/start")
    return response.data
  },

  /**
   * Get current onboarding profile
   */
  getProfile: async (): Promise<OnboardingProfileResponse> => {
    const response = await apiClient.get("/onboarding/profile")
    return response.data
  },

  /**
   * Update onboarding step data
   */
  update: async (data: OnboardingUpdatePayload): Promise<OnboardingProfileResponse> => {
    const response = await apiClient.post("/onboarding/update", data)
    return response.data
  },

  /**
   * Complete the onboarding process
   */
  complete: async (): Promise<OnboardingProfileResponse> => {
    const response = await apiClient.post("/onboarding/complete", { confirm: true })
    return response.data
  },
}

// Payload types
export interface SignupPayload {
  email: string
  password: string
  confirm_password: string
  full_name: string
}

export interface LoginPayload {
  email: string
  password: string
  device_fingerprint?: string
}

export interface UserResponse {
  id: string
  email: string
  full_name: string
  role: string
  is_verified: boolean
  avatar_url?: string | null
  bio?: string | null
  github_username?: string | null
  linkedin_username?: string | null
  last_login?: string | null
  created_at?: string
  onboarding_completed?: boolean
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserResponse
}

export interface OAuthLoginResponse {
  status: string
  is_new_user: boolean
  user: UserResponse & { auth_provider?: string }
  // Tokens are NOT in the response body — they're set as HttpOnly cookies
}

export interface ResetPasswordConfirmPayload {
  email: string
  reset_token: string
  new_password: string
  confirm_password: string
}

export interface ProfileUpdatePayload {
  full_name?: string
  bio?: string
  github_username?: string
  linkedin_username?: string
}

// Onboarding payload types
export type SkillLevel = "Beginner" | "Lower-Intermediate" | "Intermediate" | "Advanced"
export type LearningStyle = "Project-first" | "Instruction-first" | "Prompt-heavy" | "Independent" | "Slow but thorough" | "Fast but error-prone"
export type UserGoal = "Get a job" | "Build a startup" | "Learn fundamentals" | "Earn certification" | "Build a specific project"
export type LearningMode = "bootcamp" | "self-paced"

export interface OnboardingUpdatePayload {
  skill_level?: SkillLevel
  learning_mode?: LearningMode
  learning_style?: LearningStyle
  primary_goal?: UserGoal
  selected_course_id?: string
  preferred_language?: string
  timezone?: string
  notification_preferences?: Record<string, unknown>
}

export interface OnboardingProfileResponse {
  user_id: string
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  skill_level: SkillLevel | null
  learning_mode: LearningMode | null
  learning_style: LearningStyle | null
  primary_goal: UserGoal | null
  selected_course_id: string | null
  preferred_language: string
  timezone: string
  notification_preferences: Record<string, unknown>
}

// Response types
export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
    is_verified?: boolean
  }
}

export interface MessageResponse {
  message: string
  status: string
}
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

export interface ProjectContent {
  project_id: number
  title: string
  description: string | null
  order: number
  estimated_hours: number | null
  starter_repo_url: string | null
  required_skills: string[]
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
  progress_percent: number
  lessons: LessonContent[]
  projects: ProjectContent[]
  quiz: QuizContent | null
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

export interface MentorProfileResponse {
  user_id: string
  title: string | null
  company: string | null
  expertise: string[]
  languages: string[]
  hourly_rate: number | null
  availability: string
  timezone: string
  years_experience: number | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  total_sessions: number
  total_students: number
  rating: number
  created_at: string | null
  updated_at: string | null
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
  getCurriculum: async (courseId: number): Promise<CourseCurriculumResponse> => {
    const response = await apiClient.get<CourseCurriculumResponse>(`/public/courses/${courseId}/curriculum`)
    return response.data
  },

  /**
   * Get course curriculum by slug
   */
  getCurriculumBySlug: async (slug: string): Promise<CourseCurriculumResponse> => {
    const response = await apiClient.get<CourseCurriculumResponse>(`/public/courses/by-slug/${slug}/curriculum`)
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

export const courseAdminApi = {
  // Course CRUD
  listCourses: async (params?: {
    status?: "active" | "inactive"
    search?: string
    created_by?: string
    limit?: number
    offset?: number
  }): Promise<CourseListResponse[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status_filter", params.status)
    if (params?.search) searchParams.append("search", params.search)
    if (params?.created_by) searchParams.append("created_by", params.created_by)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
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

  updateCourse: async (courseId: number, data: CourseUpdatePayload): Promise<CourseResponse> => {
    const response = await apiClient.put<CourseResponse>(`/courses/${courseId}`, data)
    return response.data
  },

  deleteCourse: async (courseId: number): Promise<void> => {
    await apiClient.delete(`/courses/${courseId}`)
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
    const response = await apiClient.get<StudentProjectSubmission[]>(
      `/courses/students/${studentId}/projects?course_id=${courseId}`
    )
    return response.data
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
  solution_url: string
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
  enrollInCourse: async (courseId: number): Promise<{ enrollment: unknown; course: unknown; assigned_path: unknown }> => {
    const response = await apiClient.post(`/enrollments/courses/${courseId}`)
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
   * Get full learning content for an enrolled course
   */
  getLearningContentBySlug: async (slug: string): Promise<LearningContentResponse> => {
    const response = await apiClient.get<LearningContentResponse>(`/enrollments/courses/by-slug/${slug}/learning-content`)
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

// ============== Community API ==============

export interface CommunityChannel {
  id: number
  name: string
  slug: string
  description: string | null
  type: "public" | "private"
  category: "discussion" | "study-group" | "leadership"
  join_link: string | null
  status: "active" | "archived"
  members_count: number
  posts_count: number
  created_by: string | null
  bootcamp_id: number | null
  course_id: number | null
  created_at: string
  updated_at: string
}

export interface CommunityChannelListResponse {
  channels: CommunityChannel[]
  total: number
}

export interface CreateChannelPayload {
  name: string
  description?: string
  type: "public" | "private"
  category: "discussion" | "study-group" | "leadership"
  join_link?: string
  bootcamp_id?: number
  course_id?: number
}

export interface UpdateChannelPayload {
  name?: string
  description?: string
  type?: "public" | "private"
  category?: "discussion" | "study-group" | "leadership"
  join_link?: string
  status?: "active" | "archived"
  bootcamp_id?: number
  course_id?: number
}

export const communityApi = {
  /**
   * List all community channels with optional filters
   */
  listChannels: async (params?: {
    search?: string
    category?: string
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<CommunityChannelListResponse> => {
    const response = await apiClient.get<CommunityChannelListResponse>("/community/channels", { params })
    return response.data
  },

  /**
   * Create a new community channel (Admin only)
   */
  createChannel: async (data: CreateChannelPayload): Promise<CommunityChannel> => {
    const response = await apiClient.post<CommunityChannel>("/community/channels", data)
    return response.data
  },

  /**
   * Get a specific channel by ID
   */
  getChannel: async (channelId: number): Promise<CommunityChannel> => {
    const response = await apiClient.get<CommunityChannel>(`/community/channels/${channelId}`)
    return response.data
  },

  /**
   * Update a community channel (Admin only)
   */
  updateChannel: async (channelId: number, data: UpdateChannelPayload): Promise<CommunityChannel> => {
    const response = await apiClient.put<CommunityChannel>(`/community/channels/${channelId}`, data)
    return response.data
  },

  /**
   * Delete a community channel (Admin only)
   */
  deleteChannel: async (channelId: number): Promise<void> => {
    await apiClient.delete(`/community/channels/${channelId}`)
  },
}


// ==========================================
// Sessions API Types & Client
// ==========================================

export type SessionPlatform = "zoom" | "google_meet" | "microsoft_teams" | "custom"
export type SessionStatusType = "scheduled" | "cancelled"
export type SessionComputedStatus = "upcoming" | "ongoing" | "completed" | "cancelled"

export interface SessionCreatePayload {
  title: string
  description?: string
  platform: SessionPlatform
  session_link: string
  scheduled_date: string
  start_time: string
  end_time: string
  timezone: string
  bootcamp_id?: number | null
  course_id?: number | null
}

export interface SessionUpdatePayload {
  title?: string
  description?: string
  platform?: SessionPlatform
  session_link?: string
  scheduled_date?: string
  start_time?: string
  end_time?: string
  timezone?: string
  bootcamp_id?: number | null
  course_id?: number | null
  status?: SessionStatusType
}

export interface SessionAttendanceRecord {
  attendance_id: number
  session_id: number
  student_id: string
  student_name?: string
  student_email?: string
  marked_at: string
}

export interface SessionResponse {
  session_id: number
  mentor_id: string
  mentor_name?: string
  bootcamp_id?: number | null
  course_id?: number | null
  title: string
  description?: string
  platform: string
  session_link: string
  scheduled_date: string
  start_time: string
  end_time: string
  timezone: string
  attendance_token: string
  attendance_link?: string
  status: string
  computed_status: SessionComputedStatus
  attendee_count: number
  attendances?: SessionAttendanceRecord[]
  created_at: string
  updated_at: string
}

export interface SessionListResponse {
  sessions: SessionResponse[]
  total: number
  page: number
  page_size: number
}

export interface AttendanceMarkResponse {
  message: string
  attendance_id: number
  session_id: number
  student_id: string
  marked_at: string
}

export const sessionsApi = {
  // ---------- Mentor / Admin ----------

  createSession: async (data: SessionCreatePayload): Promise<SessionResponse> => {
    const response = await apiClient.post<SessionResponse>("/sessions", data)
    return response.data
  },

  updateSession: async (sessionId: number, data: SessionUpdatePayload): Promise<SessionResponse> => {
    const response = await apiClient.put<SessionResponse>(`/sessions/${sessionId}`, data)
    return response.data
  },

  deleteSession: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`/sessions/${sessionId}`)
  },

  listMentorSessions: async (params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<SessionListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append("status", params.status)
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString())
    const query = searchParams.toString()
    const response = await apiClient.get<SessionListResponse>(`/sessions/mentor${query ? `?${query}` : ""}`)
    return response.data
  },

  getSessionDetail: async (sessionId: number): Promise<SessionResponse> => {
    const response = await apiClient.get<SessionResponse>(`/sessions/mentor/${sessionId}`)
    return response.data
  },

  // ---------- Student ----------

  listStudentSessions: async (params?: {
    page?: number
    page_size?: number
  }): Promise<SessionListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString())
    const query = searchParams.toString()
    const response = await apiClient.get<SessionListResponse>(`/sessions/student${query ? `?${query}` : ""}`)
    return response.data
  },

  // ---------- Attendance ----------

  markAttendance: async (attendanceToken: string): Promise<AttendanceMarkResponse> => {
    const response = await apiClient.post<AttendanceMarkResponse>(`/sessions/attend/${attendanceToken}`)
    return response.data
  },

  getSessionByToken: async (attendanceToken: string): Promise<SessionResponse> => {
    const response = await apiClient.get<SessionResponse>(`/sessions/attend/${attendanceToken}/info`)
    return response.data
  },
}

// ─── Payment Types ───────────────────────────────────────────

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
  checkout_link: string
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