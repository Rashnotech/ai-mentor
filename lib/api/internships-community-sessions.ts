import { apiClient } from "./client"

// ============================================================================
// INTERNSHIP API (No authentication required)
// ============================================================================

// Internship Application Types
export interface InternshipCreateProfileRequest {
  email: string
  first_name: string
  last_name: string
  telephone: string
  hear_about_us?: string
  country: string
  state: string
  institution_type: "university" | "polytechnic" | "college"
}

export interface InternshipUpdateProfileRequest {
  first_name?: string
  last_name?: string
  telephone?: string
  hear_about_us?: string
  country?: string
  state?: string
  institution_type?: "university" | "polytechnic" | "college"
}

export interface InternshipUploadDocumentsRequest {
  it_letter_url?: string
  admission_letter_url?: string
  id_card_url?: string
  id_type?: "school-id" | "voters-card" | "nin-slip"
}

export interface InternshipSelectTrackRequest {
  selected_track: "frontend" | "backend" | "fullstack" | "ai-engineering" | "product-design" | "data-analytics"
  course_id?: number
}

export interface InternshipApplicationResponse {
  application_id: number
  email: string
  first_name: string
  last_name: string
  telephone: string
  hear_about_us?: string
  country: string
  state: string
  institution_type: string
  it_letter_url?: string
  admission_letter_url?: string
  id_card_url?: string
  id_type?: string
  verification_status: string
  selected_track?: string
  course_id?: number
  status: string
  acknowledgment_sent: boolean
  created_at: string
  updated_at: string
  submitted_at?: string
}

export interface InternshipTrack {
  track_id: string
  track_name: string
  description: string
  level: string
  courses: Array<{
    course_id: number
    title: string
    description: string
  }>
}

export interface InternshipTrackCourse {
  course_id: number
  title: string
  description?: string
}

export interface InternshipTrackCoursesResponse {
  track_id: string
  total: number
  limit: number
  offset: number
  courses: InternshipTrackCourse[]
}

export const internshipApi = {
  /**
   * Create new internship application profile (Step 1)
   */
  createProfile: async (data: InternshipCreateProfileRequest): Promise<InternshipApplicationResponse> => {
    const response = await apiClient.post<InternshipApplicationResponse>("/internships/applications", data)
    return response.data
  },

  /**
   * Update internship application profile
   */
  updateProfile: async (
    applicationId: number,
    data: InternshipUpdateProfileRequest
  ): Promise<InternshipApplicationResponse> => {
    const response = await apiClient.patch<InternshipApplicationResponse>(
      `/internships/applications/${applicationId}`,
      data
    )
    return response.data
  },

  /**
   * Upload verification documents (Step 2)
   */
  uploadDocuments: async (
    applicationId: number,
    data: InternshipUploadDocumentsRequest
  ): Promise<InternshipApplicationResponse> => {
    const response = await apiClient.post<InternshipApplicationResponse>(
      `/internships/applications/${applicationId}/documents`,
      data
    )
    return response.data
  },

  /**
   * Select learning track and submit application (Step 3)
   * Triggers acknowledgment email
   */
  selectTrack: async (
    applicationId: number,
    data: InternshipSelectTrackRequest
  ): Promise<InternshipApplicationResponse> => {
    const response = await apiClient.post<InternshipApplicationResponse>(
      `/internships/applications/${applicationId}/track`,
      data
    )
    return response.data
  },

  /**
   * Get application by ID
   */
  getApplication: async (applicationId: number): Promise<InternshipApplicationResponse> => {
    const response = await apiClient.get<InternshipApplicationResponse>(
      `/internships/applications/${applicationId}`
    )
    return response.data
  },

  /**
   * Get available internship tracks with courses from backend
   */
  getTracks: async (): Promise<InternshipTrack[]> => {
    const response = await apiClient.get<InternshipTrack[]>("/internships/tracks")
    return response.data
  },

  /**
   * Get paginated courses for a selected track
   */
  getTrackCourses: async (
    trackId: string,
    params?: { limit?: number; offset?: number; search?: string }
  ): Promise<InternshipTrackCoursesResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (typeof params?.offset === "number") searchParams.append("offset", params.offset.toString())
    if (params?.search) searchParams.append("search", params.search)

    const query = searchParams.toString()
    const response = await apiClient.get<InternshipTrackCoursesResponse>(
      `/internships/tracks/${trackId}/courses${query ? `?${query}` : ""}`
    )
    return response.data
  },
}

// ============================================================================
// INTERNSHIP ADMIN API (Admin authentication required)
// ============================================================================

export interface InternshipApplicationAdminResponse extends InternshipApplicationResponse {
  course_title?: string | null
  verification_notes?: string
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
}

export interface InternshipApplicationsListResponse {
  applications: InternshipApplicationAdminResponse[]
  total: number
  limit: number
  offset: number
}

export interface ApproveApplicationRequest {
  admin_notes?: string
}

export interface RejectApplicationRequest {
  rejection_reason: string
  admin_notes?: string
}

export const internshipAdminApi = {
  /**
   * List all internship applications (Admin)
   */
  listApplications: async (params?: {
    search?: string
    status_filter?: string
    verification_status?: string
    limit?: number
    offset?: number
  }): Promise<InternshipApplicationsListResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.status_filter) searchParams.append("status_filter", params.status_filter)
    if (params?.verification_status) searchParams.append("verification_status", params.verification_status)
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    if (params?.offset) searchParams.append("offset", params.offset.toString())
    
    const query = searchParams.toString()
    const response = await apiClient.get<InternshipApplicationsListResponse>(
      `/admin/internships/applications${query ? `?${query}` : ""}`
    )
    return response.data
  },

  /**
   * Approve internship application (Admin)
   * Sends approval email to candidate
   */
  approveApplication: async (
    applicationId: number,
    data: ApproveApplicationRequest
  ): Promise<InternshipApplicationAdminResponse> => {
    const response = await apiClient.post<InternshipApplicationAdminResponse>(
      `/admin/internships/applications/${applicationId}/approve`,
      data
    )
    return response.data
  },

  /**
   * Reject internship application (Admin)
   * Sends rejection email with reason to candidate
   */
  rejectApplication: async (
    applicationId: number,
    data: RejectApplicationRequest
  ): Promise<InternshipApplicationAdminResponse> => {
    const response = await apiClient.post<InternshipApplicationAdminResponse>(
      `/admin/internships/applications/${applicationId}/reject`,
      data
    )
    return response.data
  },

  /**
   * Delete internship application (Admin)
   */
  deleteApplication: async (applicationId: number): Promise<void> => {
    await apiClient.delete(`/admin/internships/applications/${applicationId}`)
  },
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

