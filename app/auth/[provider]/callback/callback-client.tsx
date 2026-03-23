"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { authApi, onboardingApi, getApiErrorMessage } from "@/lib/api"
import { storeAuthData, type AuthData } from "@/lib/auth-storage"
import { useUserStore, type UserProfile } from "@/lib/stores/user-store"

const SUPPORTED_PROVIDERS = ["google", "github"] as const
type OAuthProvider = (typeof SUPPORTED_PROVIDERS)[number]

function isValidProvider(p: string): p is OAuthProvider {
  return SUPPORTED_PROVIDERS.includes(p as OAuthProvider)
}

export default function OAuthProviderCallbackClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      }
    >
      <OAuthProviderCallbackContent />
    </Suspense>
  )
}

function OAuthProviderCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const setUser = useUserStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const handleCallback = async () => {
      const provider = params.provider as string
      if (!provider || !isValidProvider(provider)) {
        setError(`Unsupported OAuth provider: "${provider}"`)
        toast.error("Invalid provider", {
          description: "The OAuth provider is not supported.",
        })
        setTimeout(() => router.replace("/login?error=oauth_failed"), 3000)
        return
      }

      const errorParam = searchParams.get("error")
      if (errorParam) {
        const desc =
          searchParams.get("error_description") || "Authorization was denied."
        setError(desc)
        toast.error("Authentication cancelled", { description: desc })
        setTimeout(() => router.replace("/login?error=oauth_failed"), 3000)
        return
      }

      const code = searchParams.get("code")
      const state = searchParams.get("state")

      if (!code || !state) {
        setError("Missing authorization code or state parameter.")
        toast.error("Invalid callback", {
          description:
            "Missing required parameters from the OAuth provider.",
        })
        setTimeout(() => router.replace("/login?error=oauth_failed"), 3000)
        return
      }

      try {
        const response = await authApi.handleOAuthCallback(
          provider,
          code,
          state,
        )

        let onboardingCompleted = true
        if (
          response.user.role !== "admin" &&
          response.user.role !== "mentor"
        ) {
          if (response.is_new_user) {
            onboardingCompleted = false
          } else {
            try {
              const profile = await onboardingApi.start()
              onboardingCompleted = profile.onboarding_completed
            } catch {
              // Default to completed if check fails
            }
          }
        }

        // Store tokens as Bearer tokens (same as email/password login) so all
        // subsequent API calls use the Authorization header. This works across
        // cross-domain deployments where SameSite=Lax cookies are not sent.
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

        setUser({
          id: response.user.id,
          email: response.user.email,
          full_name: response.user.full_name,
          role: response.user.role as "student" | "mentor" | "admin",
          is_verified: response.user.is_verified,
          avatar_url: response.user.avatar_url,
          onboarding_completed: onboardingCompleted,
        } as UserProfile)

        if (response.is_new_user) {
          toast.success(`Welcome, ${response.user.full_name}!`, {
            description:
              "Your account has been created. Let's get you set up!",
          })
        } else {
          toast.success(`Welcome back, ${response.user.full_name}!`, {
            description: "Redirecting to your dashboard…",
          })
        }

        setTimeout(() => {
          if (!onboardingCompleted) {
            router.push("/onboarding/mode-selection")
          } else if (response.user.role === "admin") {
            router.push("/admin")
          } else if (response.user.role === "mentor") {
            router.push("/mentor")
          } else {
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
        setTimeout(
          () => router.replace("/login?error=oauth_failed"),
          4000,
        )
      }
    }

    handleCallback()
  }, [searchParams, params, router, setUser])

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
              Redirecting to login page…
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900">
              Completing sign in…
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
