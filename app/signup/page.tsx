"use client"

import type React from "react"

import Link from "next/link"
import { Github, Eye, EyeOff, CheckCircle2, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { authApi, getApiErrorMessage, type SignupPayload } from "@/lib/api"

// OAuth helper — redirect browser to backend, which 302s to provider consent screen
const handleOAuthRedirect = (provider: "google" | "github") => {
  try {
    const loginUrl = authApi.getOAuthLoginUrl(provider)
    window.location.href = loginUrl
  } catch (error) {
    const msg = getApiErrorMessage(error)
    toast.error(`Failed to start ${provider} signup`, { description: msg })
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

const validateFullName = (name: string): string | null => {
  const trimmed = name.trim()
  if (!trimmed) return "Full name is required"
  if (trimmed.length < 2) return "Full name must be at least 2 characters"
  if (trimmed.length > 100) return "Full name must be less than 100 characters"
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) return "Full name can only contain letters, spaces, hyphens, and apostrophes"
  return null
}

const validatePassword = (password: string): string | null => {
  if (!password) return "Password is required"
  if (password.length < 8) return "Password must be at least 8 characters"
  return null
}

const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) return "Please confirm your password"
  if (password !== confirmPassword) return "Passwords do not match"
  return null
}

// Sanitize input - trim and remove excessive whitespace
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, " ")
}

// Password requirements checker
const getPasswordStrength = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
}

interface FormData {
  email: string
  fullName: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  email?: string
  fullName?: string
  password?: string
  confirmPassword?: string
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()

  // Signup mutation using TanStack Query
  const signupMutation = useMutation({
    mutationFn: async (data: SignupPayload) => {
      return authApi.signup(data)
    },
    onSuccess: (data) => {
      // Show success state
      setShowSuccess(true)
      toast.success("Account created successfully!", {
        description: "Please check your email to verify your account.",
      })
      
      // Redirect to verify-email page after a short delay
      setTimeout(() => {
        const email = encodeURIComponent(formData.email.trim())
        router.push(`/verify-email?email=${email}`)
      }, 1500)
    },
    onError: (error) => {
      const errorMessage = getApiErrorMessage(error)
      toast.error("Signup failed", {
        description: errorMessage,
      })
    },
  })

  // Compute validation errors
  const errors = useMemo<FormErrors>(() => {
    return {
      email: touched.email ? validateEmail(formData.email) ?? undefined : undefined,
      fullName: touched.fullName ? validateFullName(formData.fullName) ?? undefined : undefined,
      password: touched.password ? validatePassword(formData.password) ?? undefined : undefined,
      confirmPassword: touched.confirmPassword 
        ? validateConfirmPassword(formData.password, formData.confirmPassword) ?? undefined 
        : undefined,
    }
  }, [formData, touched])

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return (
      !validateEmail(formData.email) &&
      !validateFullName(formData.fullName) &&
      !validatePassword(formData.password) &&
      !validateConfirmPassword(formData.password, formData.confirmPassword)
    )
  }, [formData])

  // Password strength indicators
  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password])

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleBlur = (field: keyof FormData) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched to show any remaining errors
    setTouched({
      email: true,
      fullName: true,
      password: true,
      confirmPassword: true,
    })

    // Validate all fields
    const emailError = validateEmail(formData.email)
    const fullNameError = validateFullName(formData.fullName)
    const passwordError = validatePassword(formData.password)
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword)

    if (emailError || fullNameError || passwordError || confirmPasswordError) {
      toast.error("Please fix the errors in the form")
      return
    }

    // Sanitize and prepare payload
    const payload: SignupPayload = {
      email: sanitizeInput(formData.email).toLowerCase(),
      full_name: sanitizeInput(formData.fullName),
      password: formData.password, // Don't trim passwords
      confirm_password: formData.confirmPassword,
    }

    // Submit
    signupMutation.mutate(payload)
  }

  // If showing success state
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-500 mb-6">
            Your account has been successfully created. Redirecting you to login...
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Redirecting...</span>
          </div>
        </div>
      </div>
    )
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
            <path d="M0 40 Q 25 20, 50 40 T 100 40" stroke="rgba(59, 130, 246, 0.05)" fill="none" strokeWidth="0.5" />
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

          <h2 className="text-3xl font-bold mb-2 text-gray-900">Create an Account</h2>
          <p className="text-gray-500 mb-8">Start your journey into AI-powered development</p>

          <form className="space-y-5" onSubmit={handleSignup} noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
                disabled={signupMutation.isPending}
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

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange("fullName")}
                onBlur={handleBlur("fullName")}
                disabled={signupMutation.isPending}
                className={`w-full bg-white border rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.fullName 
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  disabled={signupMutation.isPending}
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
              
              {/* Password Strength Indicators */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Password strength:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "minLength", label: "8+ characters" },
                      { key: "hasUppercase", label: "Uppercase letter" },
                      { key: "hasLowercase", label: "Lowercase letter" },
                      { key: "hasNumber", label: "Number" },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        className={`flex items-center gap-1.5 text-xs ${
                          passwordStrength[key as keyof typeof passwordStrength]
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  onBlur={handleBlur("confirmPassword")}
                  disabled={signupMutation.isPending}
                  className={`w-full bg-white border rounded-lg px-4 py-3 pr-10 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.confirmPassword 
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="text-xs text-gray-500 text-center pt-2">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={signupMutation.isPending || !isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              disabled={signupMutation.isPending}
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
              disabled={signupMutation.isPending}
              onClick={() => handleOAuthRedirect("github")}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 rounded-lg py-2.5 text-sm text-gray-700 transition-all shadow-sm"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
