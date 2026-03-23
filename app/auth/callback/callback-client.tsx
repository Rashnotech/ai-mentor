"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { authApi, onboardingApi, getApiErrorMessage } from "@/lib/api"
import { storeAuthData, type AuthData } from "@/lib/auth-storage"
import { useUserStore, type UserProfile } from "@/lib/stores/user-store"

/**
 * Legacy /auth/callback page — kept for backwards compatibility.
 *
 * New OAuth callbacks use /auth/[provider]/callback instead.
 * This page reads the provider from sessionStorage (set before redirect)
 * and processes the OAuth flow via HttpOnly cookies.
 */
export default function OAuthCallbackClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  )
}

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useUserStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const handleCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const errorParam = searchParams.get("error")

      const provider = sessionStorage.getItem("oauth_provider") as
        | "google"
        | "github"
        | "github"
        | null

      // Clean up the stored provider immediately
      sessionStorage.removeItem("oauth_provider")

      // Handle provider-side errors (e.g., user denied consent)
      if (errorParam) {
        const desc = searchParams.get("error_description") || "Authorization was denied."
        setError(desc)
        toast.error("Authentication cancelled", { description: desc })
        setTimeout(() => router.replace("/login"), 3000)
        return
      }

      if (!code || !state) {
        setError("Missing authorization code or state parameter.")
        toast.error("Invalid callback", {
          description: "Missing required parameters from the OAuth provider.",
        })
        setTimeout(() => router.replace("/login"), 3000)
        return
      }

      if (!provider) {
        setError("Could not determine the OAuth provider. Please try again.")
        toast.error("OAuth error", {
          description: "Provider information was lost. Please try signing in again.",
        })
        setTimeout(() => router.replace("/login"), 3000)
        return
      }

      try {
        // Exchange the code — backend sets HttpOnly cookies, returns user info
        const response = await authApi.handleOAuthCallback(provider, code, state)

        // Determine onboarding status for students
        let onboardingCompleted = true
        if (
          response.user.role !== "admin" &&
          response.user.role !== "mentor"
        ) {
          if (response.is_new_user) {
            // New user — they haven't onboarded
            onboardingCompleted = false
          } else {
            // Existing user — check onboarding
            try {
              const profile = await onboardingApi.start()
              onboardingCompleted = profile.onboarding_completed
            } catch {
              // Default to completed if check fails
            }
          }
        }

        // Store tokens as Bearer tokens (same as email/password login) so all
        // subsequent API calls use the Authorization header.
        const authData: AuthData = {
          tokens: {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            token_type: response.token_type,
          },
          user: {
            id: response.user.id,
            email: response.user.email,
            full_name: response.user.full_name,
            role: response.user.role,
          },
        }
        storeAuthData(authData)

        // Set user in Zustand store
        setUser({
          id: response.user.id,
          email: response.user.email,
          full_name: response.user.full_name,
          role: response.user.role as "student" | "mentor" | "admin",
          is_verified: response.user.is_verified,
          avatar_url: response.user.avatar_url,
          onboarding_completed: onboardingCompleted,
        } as UserProfile)

        // Success feedback
        if (response.is_new_user) {
          toast.success(`Welcome, ${response.user.full_name}!`, {
            description: "Your account has been created. Let's get you set up!",
          })
        } else {
          toast.success(`Welcome back, ${response.user.full_name}!`, {
            description: "Redirecting to your dashboard...",
          })
        }

        // Redirect based on onboarding + role
        setTimeout(() => {
          if (!onboardingCompleted) {
            router.push("/onboarding/mode-selection")
          } else if (response.user.role === "admin") {
            router.push("/admin")
          } else if (response.user.role === "mentor") {
            router.push("/mentor")
          } else {
            // Check for stored redirect destination
            const redirect = sessionStorage.getItem("auth_redirect")
            if (redirect) {
              sessionStorage.removeItem("auth_redirect")
              router.push(redirect)
            } else {
              router.push("/dashboard")
            }
          }
        }, 500)
      } catch (err) {
        const msg = getApiErrorMessage(err)
        setError(msg)
        toast.error("Authentication failed", { description: msg })
        setTimeout(() => router.replace("/login"), 4000)
      }
    }

    handleCallback()
  }, [searchParams, router, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4 max-w-md px-6">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">
              Authentication Failed
            </h2>
            <p className="text-gray-500">{error}</p>
            <p className="text-sm text-gray-400">
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900">
              Completing sign in...
            </h2>
            <p className="text-gray-500">
              Please wait while we verify your account.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
