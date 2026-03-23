"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  X,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  paymentApi,
  PaymentInitiatedResponse,
  PendingEnrollmentResponse,
} from "@/lib/api"
import { toast } from "sonner"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  courseId: number
  courseTitle: string
  courseDescription?: string
  price: number
  currency?: string
  slug: string
}

type ModalState =
  | "loading"
  | "checkout"
  | "verifying"
  | "success"
  | "failed"
  | "error"

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  courseTitle,
  courseDescription,
  price,
  currency = "NGN",
  slug,
}: PaymentModalProps) {
  const [state, setState] = useState<ModalState>("loading")
  const [paymentData, setPaymentData] = useState<PaymentInitiatedResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [checkoutWindow, setCheckoutWindow] = useState<Window | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Check for existing pending enrollment
  const { data: pendingData } = useQuery<PendingEnrollmentResponse>({
    queryKey: ["pending-enrollment", courseId],
    queryFn: () => paymentApi.getPendingEnrollment(courseId),
    enabled: isOpen,
  })

  // Initiate payment mutation
  const initiateMutation = useMutation({
    mutationFn: () => paymentApi.initiatePayment({ course_id: courseId }),
    onSuccess: (data) => {
      setPaymentData(data)
      setState("checkout")
    },
    onError: (error: Error & { response?: { data?: { detail?: string; error_code?: string } } }) => {
      const detail = error.response?.data?.detail || error.message
      const errorCode = error.response?.data?.error_code

      if (errorCode === "ALREADY_ENROLLED") {
        toast.success("You are already enrolled in this course!")
        onSuccess()
        return
      }

      setErrorMessage(detail || "Failed to initiate payment")
      setState("error")
    },
  })

  // Retry payment mutation
  const retryMutation = useMutation({
    mutationFn: (enrollmentId: number) => paymentApi.retryPayment(enrollmentId),
    onSuccess: (data) => {
      setPaymentData(data)
      setState("checkout")
    },
    onError: (error: Error & { response?: { data?: { detail?: string; error_code?: string } } }) => {
      const detail = error.response?.data?.detail || error.message
      const errorCode = error.response?.data?.error_code

      if (errorCode === "ALREADY_ACTIVE" || errorCode === "ALREADY_PAID") {
        toast.success("Your enrollment is already active!")
        onSuccess()
        return
      }

      setErrorMessage(detail || "Failed to retry payment")
      setState("error")
    },
  })

  // Verify payment mutation
  const verifyMutation = useMutation({
    mutationFn: (reference: string) => paymentApi.verifyPayment(reference),
    onSuccess: (data) => {
      if (data.payment_status === "successful") {
        setState("success")
        toast.success("Payment successful! Welcome to the course.")
      } else if (data.payment_status === "failed") {
        setState("failed")
        setErrorMessage(data.message || "Payment was not successful")
      } else {
        // Still pending — might need more time
        setErrorMessage(data.message || "Payment is still being processed")
        setState("failed")
      }
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      setErrorMessage(
        error.response?.data?.detail || "Unable to verify payment. Please try again."
      )
      setState("failed")
    },
  })

  // Auto-initiate payment when modal opens
  useEffect(() => {
    if (!isOpen) {
      setState("loading")
      setPaymentData(null)
      setErrorMessage("")
      return
    }

    // If there's already a pending enrollment, offer retry
    if (pendingData?.pending && pendingData.enrollment_id) {
      if (pendingData.latest_checkout_link) {
        setPaymentData({
          enrollment_id: pendingData.enrollment_id,
          payment_id: 0,
          reference: pendingData.latest_reference || "",
          amount: price,
          currency: currency,
          checkout_link: pendingData.latest_checkout_link,
          status: "pending",
          message: "Existing pending payment found",
        })
        setState("checkout")
      } else {
        // Need to create a new payment attempt
        retryMutation.mutate(pendingData.enrollment_id)
      }
    } else {
      initiateMutation.mutate()
    }
  }, [isOpen, pendingData?.pending])

  // Listen for checkout window close
  useEffect(() => {
    if (!checkoutWindow || state !== "checkout") return

    const interval = setInterval(() => {
      if (checkoutWindow.closed) {
        clearInterval(interval)
        setCheckoutWindow(null)
        // Verify payment after user closes checkout window
        if (paymentData?.reference) {
          setState("verifying")
          verifyMutation.mutate(paymentData.reference)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [checkoutWindow, state, paymentData?.reference])

  const handleOpenCheckout = () => {
    if (!paymentData?.checkout_link) return

    const win = window.open(paymentData.checkout_link, "_blank", "noopener")
    if (win) {
      setCheckoutWindow(win)
    } else {
      // Popup blocked — redirect instead
      window.location.href = paymentData.checkout_link
    }
  }

  const handleVerifyManually = () => {
    if (!paymentData?.reference) return
    setState("verifying")
    verifyMutation.mutate(paymentData.reference)
  }

  const handleRetry = () => {
    if (!paymentData?.enrollment_id) return
    setState("loading")
    setErrorMessage("")
    retryMutation.mutate(paymentData.enrollment_id)
  }

  const handleSuccessClose = () => {
    onSuccess()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={state === "checkout" ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {state === "success"
                ? "Payment Successful"
                : state === "failed"
                ? "Payment Failed"
                : "Complete Your Enrollment"}
            </h2>
            {state !== "verifying" && (
              <button
                onClick={state === "success" ? handleSuccessClose : onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Course Summary — shown in checkout and loading states */}
            {(state === "loading" || state === "checkout") && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {courseTitle}
                </h3>
                {courseDescription && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {courseDescription}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Course Price</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(price)}
                  </span>
                </div>
              </div>
            )}

            {/* ── Loading State ── */}
            {state === "loading" && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600 text-sm">
                  Setting up your payment...
                </p>
              </div>
            )}

            {/* ── Checkout State ── */}
            {state === "checkout" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  You&apos;ll be redirected to Nomba&apos;s secure payment page to
                  complete your transaction.
                </p>

                <Button
                  onClick={handleOpenCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Pay {formatCurrency(price)}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleVerifyManually}
                  className="w-full bg-transparent gap-2"
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  I&apos;ve completed payment
                </Button>

                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                  <Shield className="w-4 h-4" />
                  <span>Secured by Nomba — 256-bit encryption</span>
                </div>

                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-gray-500"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* ── Verifying State ── */}
            {state === "verifying" && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-700 font-medium mb-1">
                  Verifying your payment...
                </p>
                <p className="text-gray-500 text-sm text-center">
                  Please wait while we confirm your transaction with the payment
                  gateway.
                </p>
              </div>
            )}

            {/* ── Success State ── */}
            {state === "success" && (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enrollment Complete!
                </h3>
                <p className="text-gray-600 text-sm text-center mb-6">
                  Your payment has been confirmed. You now have full access to{" "}
                  <strong>{courseTitle}</strong>.
                </p>
                <Button
                  onClick={handleSuccessClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-5 text-lg"
                >
                  Start Learning
                </Button>
              </div>
            )}

            {/* ── Failed State ── */}
            {state === "failed" && (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Payment Not Successful
                </h3>
                <p className="text-gray-600 text-sm text-center mb-6">
                  {errorMessage ||
                    "Your payment could not be completed. No charges were made."}
                </p>
                <div className="w-full space-y-3">
                  <Button
                    onClick={handleRetry}
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
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* ── Error State ── */}
            {state === "error" && (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Something Went Wrong
                </h3>
                <p className="text-gray-600 text-sm text-center mb-6">
                  {errorMessage || "An unexpected error occurred. Please try again."}
                </p>
                <div className="w-full space-y-3">
                  <Button
                    onClick={() => {
                      setState("loading")
                      setErrorMessage("")
                      initiateMutation.mutate()
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-5 gap-2"
                    disabled={initiateMutation.isPending}
                  >
                    {initiateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
