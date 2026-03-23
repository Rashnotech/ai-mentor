"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { paymentApi, PaymentVerificationResponse } from "@/lib/api"
import { toast } from "sonner"

function PaymentCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reference = searchParams.get("reference")

  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "error">("verifying")
  const [verificationData, setVerificationData] = useState<PaymentVerificationResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null)

  const verifyMutation = useMutation({
    mutationFn: (ref: string) => paymentApi.verifyPayment(ref),
    onSuccess: (data) => {
      setVerificationData(data)
      setEnrollmentId(data.enrollment_id)

      if (data.payment_status === "successful") {
        setStatus("success")
        toast.success("Payment verified successfully!")
      } else if (data.payment_status === "failed") {
        setStatus("failed")
        setErrorMessage(data.message || "Payment was not successful")
      } else {
        // Still pending
        setStatus("failed")
        setErrorMessage(data.message || "Payment verification is still pending. Please try again in a moment.")
      }
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      setStatus("error")
      setErrorMessage(
        error.response?.data?.detail || "Unable to verify payment. Please try again."
      )
    },
  })

  const retryMutation = useMutation({
    mutationFn: (eid: number) => paymentApi.retryPayment(eid),
    onSuccess: (data) => {
      if (data.checkout_link) {
        window.location.href = data.checkout_link
      }
    },
    onError: (error: Error & { response?: { data?: { detail?: string; error_code?: string } } }) => {
      const errorCode = error.response?.data?.error_code
      if (errorCode === "ALREADY_ACTIVE" || errorCode === "ALREADY_PAID") {
        setStatus("success")
        toast.success("Your enrollment is already active!")
        return
      }
      toast.error(error.response?.data?.detail || "Failed to retry payment")
    },
  })

  useEffect(() => {
    if (reference) {
      verifyMutation.mutate(reference)
    } else {
      setStatus("error")
      setErrorMessage("No payment reference found. Please go back and try again.")
    }
  }, [reference])

  const formatCurrency = (amount: number, curr: string = "NGN") => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Payment Verification</h1>
          <p className="text-blue-100 text-sm">
            {status === "verifying"
              ? "We're confirming your payment..."
              : status === "success"
              ? "Your payment has been confirmed!"
              : "There was an issue with your payment"}
          </p>
        </div>

        <div className="p-6">
          {/* ── Verifying ── */}
          {status === "verifying" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-700 font-medium mb-1">Verifying Payment</p>
              <p className="text-gray-500 text-sm text-center">
                Please wait while we confirm your transaction with the payment gateway.
                Do not close this page.
              </p>
              {reference && (
                <p className="text-gray-400 text-xs mt-4 font-mono">
                  Ref: {reference}
                </p>
              )}
            </div>
          )}

          {/* ── Success ── */}
          {status === "success" && verificationData && (
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 text-sm text-center mb-4">
                Your enrollment has been activated. You now have full access to your course.
              </p>

              {/* Transaction summary */}
              <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(verificationData.amount, verificationData.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Reference</span>
                  <span className="font-mono text-xs text-gray-700">
                    {verificationData.reference}
                  </span>
                </div>
                {verificationData.payment_method && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-700">
                      {verificationData.payment_method}
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => router.push("/dashboard/courses")}
                className="w-full bg-blue-600 hover:bg-blue-700 py-5 text-lg gap-2"
              >
                Go to My Courses
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* ── Failed ── */}
          {status === "failed" && (
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Payment Not Successful
              </h2>
              <p className="text-gray-600 text-sm text-center mb-6">
                {errorMessage || "Your payment could not be completed. No charges were made."}
              </p>

              <div className="w-full space-y-3">
                {enrollmentId && (
                  <Button
                    onClick={() => retryMutation.mutate(enrollmentId)}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-5 gap-2"
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Retry Payment
                  </Button>
                )}

                {/* Re-verify button */}
                {reference && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatus("verifying")
                      verifyMutation.mutate(reference)
                    }}
                    className="w-full bg-transparent gap-2"
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Check Again
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={() => router.push("/courses")}
                  className="w-full text-gray-500"
                >
                  Browse Courses
                </Button>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="flex flex-col items-center py-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Verification Error
              </h2>
              <p className="text-gray-600 text-sm text-center mb-6">
                {errorMessage || "An unexpected error occurred. Please try again."}
              </p>

              <div className="w-full space-y-3">
                {reference && (
                  <Button
                    onClick={() => {
                      setStatus("verifying")
                      verifyMutation.mutate(reference)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-5 gap-2"
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Try Again
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => router.push("/courses")}
                  className="w-full text-gray-500"
                >
                  Browse Courses
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  )
}
