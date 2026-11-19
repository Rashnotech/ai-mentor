import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { getAccessToken, getRefreshToken, updateAccessToken, clearAuthData, isAccessTokenExpired } from "../auth-storage"

// API Base URL - adjust based on your environment
export const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1` || "http://localhost:8000/api/v1"

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
