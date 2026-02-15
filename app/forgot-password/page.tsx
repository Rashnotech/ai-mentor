"use client"

import type React from "react"

import Link from "next/link"
import { CheckCircle2, ArrowLeft, Mail, KeyRound, Eye, EyeOff, CheckCircle, Shield } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp" | "reset" | "success">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
    }
  }, [resendCooldown])

  // ──────────────────────────── handlers ────────────────────────────

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsLoading(true)
    try {
      await authApi.resetPassword(email)
      setStep("otp")
      setResendCooldown(60)
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Something went wrong. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const otpValue = otp.join("")
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setIsLoading(true)
    try {
      const data = await authApi.verifyResetOtp(email, otpValue)
      setResetToken(data.reset_token)
      setStep("reset")
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Invalid or expired code. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await authApi.confirmResetPassword({
        email,
        reset_token: resetToken,
        new_password: password,
        confirm_password: confirmPassword,
      })
      setStep("success")
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Password reset failed. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // ──────────────────────────── OTP input helpers ────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char
    })
    setOtp(newOtp)
  }

  const resendOtp = useCallback(async () => {
    if (resendCooldown > 0 || isLoading) return
    setError("")
    setIsLoading(true)
    try {
      await authApi.resendResetOtp(email)
      setOtp(["", "", "", "", "", ""])
      setResendCooldown(60)
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Failed to resend code. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [email, resendCooldown, isLoading])

  // ──────────────────────────── derived state ────────────────────────────

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

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
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-8">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6 text-gray-900">
            Secure Account <br />
            <span className="text-blue-600">Recovery</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Don't worry, it happens to the best of us. We'll help you get back into your account safely and securely.
          </p>
        </div>

        <div className="relative z-10 text-sm text-gray-500">© 2025 LearnTech Inc. All rights reserved.</div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Back to Login */}
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          {/* Step: Email */}
          {step === "email" && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                  <Mail className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Forgot Password?</h2>
                <p className="text-gray-500">
                  No worries! Enter your email address and we'll send you a verification code.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{" "}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          )}

          {/* Step: OTP Verification */}
          {step === "otp" && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                  <KeyRound className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Verify Your Email</h2>
                <p className="text-gray-500">
                  We've sent a 6-digit verification code to{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Verification Code</label>
                  <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </button>
              </form>

              <div className="text-center mt-6 space-y-2">
                <p className="text-sm text-gray-500">
                  Didn't receive the code?{" "}
                  <button 
                    onClick={resendOtp} 
                    disabled={isLoading || resendCooldown > 0}
                    className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                  </button>
                </p>
                <button 
                  onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError("") }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change email address
                </button>
              </div>
            </>
          )}

          {/* Step: Reset Password */}
          {step === "reset" && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">Create New Password</h2>
                <p className="text-gray-500">
                  Your new password must be different from previously used passwords.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="space-y-2">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.met ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}>
                        <CheckCircle className="w-3 h-3" />
                      </div>
                      <span className={req.met ? "text-green-600" : "text-gray-500"}>{req.label}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Passwords match
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Password Reset!</h2>
              <p className="text-gray-500 mb-8">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              >
                Continue to Login
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          {step !== "success" && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <div className={`w-2 h-2 rounded-full transition-colors ${step === "email" ? "bg-blue-600" : "bg-gray-200"}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${step === "otp" ? "bg-blue-600" : "bg-gray-200"}`} />
              <div className={`w-2 h-2 rounded-full transition-colors ${step === "reset" ? "bg-blue-600" : "bg-gray-200"}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
