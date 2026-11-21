import { apiClient, API_BASE_URL } from "./client"

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
  created_at?: string | null
  updated_at?: string | null
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
  complete: async (): Promise<CompleteOnboardingResponse> => {
    const response = await apiClient.post<CompleteOnboardingResponse>("/onboarding/complete", { confirm: true })
    return response.data
  },
}

export const contactApi = {
  submit: async (data: ContactSubmissionPayload): Promise<ContactSubmissionResponse> => {
    const response = await apiClient.post<ContactSubmissionResponse>("/contact", data)
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
  onboarding_completed: boolean
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
  // Tokens are available both in the body and as HttpOnly cookies.
  // The frontend stores them via storeAuthData() so Bearer-token auth
  // works across all environments (including cross-domain API deployments).
  access_token: string
  refresh_token: string
  token_type: string
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
  selected_path_id?: number
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
  selected_path_id: number | null
  preferred_language: string
  timezone: string
  notification_preferences: Record<string, unknown>
}

export interface CompleteOnboardingResponse {
  success: boolean
  message: string
  user: {
    id: string
    email: string
    role: string
    onboarding_completed: boolean
  }
  profile: OnboardingProfileResponse
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

export interface ContactSubmissionPayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  interest: string
  learner_type: string
  message: string
}

export interface ContactSubmissionResponse {
  success: boolean
  message: string
}

export interface NotificationItem {
  notification_id: number
  category: string
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  created_at: string | null
}

export const notificationsApi = {
  list: async (limit: number = 20): Promise<{ items: NotificationItem[]; unread_count: number }> => {
    const response = await apiClient.get<{ items: NotificationItem[]; unread_count: number }>(
      `/notifications?limit=${limit}`
    )
    return response.data
  },

  markRead: async (notificationId: number): Promise<NotificationItem> => {
    const response = await apiClient.patch<NotificationItem>(
      `/notifications/${notificationId}/read`
    )
    return response.data
  },

  markAllRead: async (): Promise<{ marked_count: number }> => {
    const response = await apiClient.post<{ marked_count: number }>("/notifications/read-all")
    return response.data
  },
}
