"use client"

import type React from "react"

import Link from "next/link"
import { Github, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { authApi, onboardingApi, getApiErrorMessage, type LoginPayload } from "@/lib/api"
import { storeAuthData, getDeviceFingerprint, type AuthData } from "@/lib/auth-storage"
import { useUserStore } from "@/lib/stores/user-store"

// OAuth helper — redirect browser to backend, which 302s to provider consent screen
const handleOAuthRedirect = (provider: "google" | "github") => {
  try {
    const loginUrl = authApi.getOAuthLoginUrl(provider)
    window.location.href = loginUrl
  } catch (error) {
    const msg = getApiErrorMessage(error)
    toast.error(`Failed to start ${provider} login`, { description: msg })
  }
}

// Validation helpers
const validateEmail = (email: string): string | null => {
  const trimmed = email.trim()
  if (!trimmed) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) return "Please enter a valid email address"
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required"
  return null
}

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const router = useRouter()
  
  // Get setUser from Zustand store
  const setUser = useUserStore((state) => state.setUser)

  // Login mutation using TanStack Query
  const loginMutation = useMutation({
    mutationFn: async (data: LoginPayload) => {
      // Step 1: Authenticate user
      const loginResponse = await authApi.login(data)
      
      // Step 2: Store tokens in auth-storage
      const authData: AuthData = {
        tokens: {
          access_token: loginResponse.access_token,
          refresh_token: loginResponse.refresh_token,
          token_type: loginResponse.token_type,
        },
        user: loginResponse.user,
      }
      storeAuthData(authData)
      
      // Step 3: Check onboarding status for non-admin/mentor users
      let onboardingCompleted = true
      if (loginResponse.user.role !== "admin" && loginResponse.user.role !== "mentor") {
        // First check if it's in the login response (from /auth/me enhancement)
        if (loginResponse.user.onboarding_completed !== undefined) {
          onboardingCompleted = loginResponse.user.onboarding_completed
        } else {
          // Fall back to calling onboarding API
          try {
            const profile = await onboardingApi.start()
            onboardingCompleted = profile.onboarding_completed
          } catch (error) {
            console.error("Failed to check onboarding status:", error)
            // Default to completed if check fails to avoid blocking user
          }
        }
      }
      
      // Step 4: Store user in Zustand store with onboarding status
      setUser({
        id: loginResponse.user.id,
        email: loginResponse.user.email,
        full_name: loginResponse.user.full_name,
        role: loginResponse.user.role as "student" | "mentor" | "admin",
        is_verified: loginResponse.user.is_verified,
        onboarding_completed: onboardingCompleted,
      })
      
      return { ...loginResponse, onboardingCompleted }
    },
    onSuccess: (data) => {
      // Handle redirect based on onboarding status and role
      if (!data.onboardingCompleted) {
        toast.success(`Welcome, ${data.user.full_name}!`, {
          description: "Let's set up your learning preferences...",
        })
        router.push("/onboarding/mode-selection")
        return
      }
      
      // Show success toast
      toast.success(`Welcome back, ${data.user.full_name}!`, {
        description: "Redirecting to your dashboard...",
      })
      
      // Redirect based on user role
      setTimeout(() => {
        if (data.user.role === "admin") {
          router.push("/admin")
        } else if (data.user.role === "mentor") {
          router.push("/mentor")
        } else {
          router.push("/dashboard")
        }
      }, 500)
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error)
      toast.error("Login failed", {
        description: errorMessage,
      })
    },
  })

  // Compute validation errors
  const errors = useMemo<FormErrors>(() => {
    return {
      email: touched.email ? validateEmail(formData.email) ?? undefined : undefined,
      password: touched.password ? validatePassword(formData.password) ?? undefined : undefined,
    }
  }, [formData, touched])

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return !validateEmail(formData.email) && !validatePassword(formData.password)
  }, [formData])

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleBlur = (field: keyof FormData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ email: true, password: true })

    // Validate
    const emailError = validateEmail(formData.email)
    const passwordError = validatePassword(formData.password)

    if (emailError || passwordError) {
      toast.error("Please fix the errors in the form")
      return
    }

    // Prepare payload with device fingerprint for security
    const payload: LoginPayload = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      device_fingerprint: getDeviceFingerprint(),
    }

    // Submit
    loginMutation.mutate(payload)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-gray-900 font-sans overflow-y-auto">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gray-50 border-r border-gray-200">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100 rounded-full blur-[100px] animate-pulse" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 50 Q 25 30, 50 50 T 100 50" stroke="rgba(59, 130, 246, 0.1)" fill="none" strokeWidth="0.5" />
            <path d="M0 60 Q 25 40, 50 60 T 100 60" stroke="rgba(59, 130, 246, 0.05)" fill="none" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
        </div>

        <div className="relative z-10 max-w-lg mb-20">
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6 text-gray-900">
            Build Real-World <br />
            <span className="text-blue-600">Tech Skills.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Join a community of builders and innovators. Learn by doing, with projects powered by AI.
          </p>
        </div>

        <div className="relative z-10 text-sm text-gray-500">© 2026 LearnTech Inc. All rights reserved.</div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
          </div>

          <h2 className="text-3xl font-bold mb-2 text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mb-8">Log in to continue your projects</p>

          {/* Toggle Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-lg mb-8">
            <button className="py-2 text-sm font-medium text-gray-900 bg-white rounded-md shadow-sm transition-all">
              Login
            </button>
            <Link
              href="/signup"
              className="flex items-center justify-center py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-all"
            >
              Sign Up
            </Link>
          </div>

          <form className="space-y-5" onSubmit={handleLogin} noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
                disabled={loginMutation.isPending}
                className={`w-full bg-white border rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  disabled={loginMutation.isPending}
                  className={`w-full bg-white border rounded-lg px-4 py-3 pr-10 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">OR</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              disabled={loginMutation.isPending}
              onClick={() => handleOAuthRedirect("google")}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 rounded-lg py-2.5 text-sm text-gray-700 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              disabled={loginMutation.isPending}
              onClick={() => handleOAuthRedirect("github")}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 rounded-lg py-2.5 text-sm text-gray-700 transition-all shadow-sm"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
