"use client"

import type React from "react"
import Link from "next/link"
import { CheckCircle2, ArrowLeft, Mail, CheckCircle, Shield, Loader2 } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authApi } from "@/lib/api"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const emailFromParams = searchParams.get("email") || ""
  const codeFromParams = searchParams.get("code") || ""

  const [step, setStep] = useState<"verify" | "success">("verify")
  const [email, setEmail] = useState(emailFromParams)
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoVerifying, setIsAutoVerifying] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)
  const autoVerifyRan = useRef(false)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current)
    }
  }, [resendCooldown])

  // Auto-verify when arriving from email link (?email=...&code=...)
  useEffect(() => {
    if (emailFromParams && codeFromParams && !autoVerifyRan.current) {
      autoVerifyRan.current = true
      setIsAutoVerifying(true)
      setEmail(emailFromParams)

      // Fill OTP inputs for visual feedback
      const digits = codeFromParams.slice(0, 6).split("")
      const filled = [...digits, ...Array(6 - digits.length).fill("")]
      setOtp(filled)

      authApi
        .verifyEmail(emailFromParams, codeFromParams)
        .then(() => {
          setStep("success")
        })
        .catch((err: any) => {
          const msg =
            err?.response?.data?.detail ||
            "Verification failed. Please try entering the code manually."
          setError(msg)
        })
        .finally(() => {
          setIsAutoVerifying(false)
        })
    }
  }, [emailFromParams, codeFromParams])

  // ──────────────── handlers ────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    const code = otp.join("")
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    setIsLoading(true)
    try {
      await authApi.verifyEmail(email, code)
      setStep("success")
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Invalid or expired code. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isLoading) return
    if (!email) {
      setError("Please enter your email address first")
      return
    }
    setError("")
    setIsLoading(true)
    try {
      await authApi.resendVerificationEmail(email)
      setOtp(["", "", "", "", "", ""])
      setResendCooldown(60)
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Failed to resend. Please try again."
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [email, resendCooldown, isLoading])

  // ──────────────── OTP input helpers ────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`verify-otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`verify-otp-${index - 1}`)?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char
    })
    setOtp(newOtp)
  }

  // ──────────────── Render ────────────────

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white text-gray-900 font-sans overflow-y-auto">
      {/* Left Side — Hero */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gray-50 border-r border-gray-200">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100 rounded-full blur-[100px] animate-pulse" />
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0 50 Q 25 30, 50 50 T 100 50"
              stroke="rgba(59, 130, 246, 0.1)"
              fill="none"
              strokeWidth="0.5"
            />
            <path
              d="M0 60 Q 25 40, 50 60 T 100 60"
              stroke="rgba(59, 130, 246, 0.05)"
              fill="none"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            LearnTech
          </span>
        </div>

        <div className="relative z-10 max-w-lg mb-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-8">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6 text-gray-900">
            Verify Your <br />
            <span className="text-blue-600">Email Address</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            One last step before you unlock your full learning experience. Check
            your inbox for the verification code.
          </p>
        </div>

        <div className="relative z-10 text-sm text-gray-500">
          © 2026 LearnTech Inc. All rights reserved.
        </div>
      </div>

      {/* Right Side — Form */}
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

          {/* Auto-verifying splash */}
          {isAutoVerifying && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Verifying your email...</p>
            </div>
          )}

          {/* Verification form */}
          {!isAutoVerifying && step === "verify" && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
                  <Shield className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-gray-900">
                  Verify Your Email
                </h2>
                <p className="text-gray-500">
                  Enter your email and the 6-digit code we sent to your inbox.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                  />
                </div>

                {/* OTP inputs */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div
                    className="flex gap-2 justify-between"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`verify-otp-${index}`}
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
                  <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                  </p>
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
                    "Verify Email"
                  )}
                </button>
              </form>

              <div className="text-center mt-6 space-y-2">
                <p className="text-sm text-gray-500">
                  Didn't receive the code?{" "}
                  <button
                    onClick={handleResend}
                    disabled={isLoading || resendCooldown > 0}
                    className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend"}
                  </button>
                </p>
              </div>
            </>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">
                Email Verified!
              </h2>
              <p className="text-gray-500 mb-8">
                Your email has been successfully verified. You now have full
                access to AI Mentor.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              >
                Continue to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
