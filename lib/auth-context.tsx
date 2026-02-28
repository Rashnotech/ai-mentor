"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { 
  clearAuthData,
  isAuthenticated as checkIsAuthenticated,
} from "@/lib/auth-storage"
import { authApi } from "@/lib/api"
import { useUserStore, type UserProfile } from "@/lib/stores/user-store"

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/courses",
  "/coures/[slug]",
  "/forgot-password",
  "/terms",
  "/privacy",
  "/auth/callback",
  "/auth/google/callback",
  "/auth/github/callback",
]

// Onboarding routes - require auth but don't check onboarding status
const ONBOARDING_ROUTES = [
  "/onboarding",
]

// Role-based route restrictions
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["/admin"],
  mentor: ["/mentor"],
  student: ["/dashboard", "/courses", "/workspace"],
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  // Get user from Zustand store
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const clearUser = useUserStore((state) => state.clearUser)
  const isHydrated = useUserStore((state) => state.isHydrated)

  // Mark as mounted after first client render — prevents hook access during prerender
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch fresh user data from API (works with both Bearer tokens and cookies)
  const refreshUser = async () => {
    try {
      // First check if we have a token in storage
      const hasTokenAuth = checkIsAuthenticated()

      // Even without a stored token, cookies may contain a valid session
      // (e.g. after OAuth login).  Always attempt the API call.
      const response = await authApi.getMe()
      if (response?.user) {
        setUser(response.user as UserProfile)
        return
      }
    } catch (error) {
      // getMe failed — no valid auth at all
      console.error("Failed to refresh user:", error)
    }
  }

  // Check authentication on mount and route changes
  useEffect(() => {
    // Skip during server prerender and before client mount
    if (!mounted) return
    // Wait for Zustand to hydrate from sessionStorage
    if (!isHydrated) return
    
    const checkAuth = async () => {
      setIsLoading(true)
      
      try {
        // Always read directly from the Zustand store (avoids stale React closure
        // race conditions during Next.js route transitions where the reactive `user`
        // from the hook may not yet reflect a setUser() call made moments before
        // router.push()).
        const currentUser = useUserStore.getState().user
        const hasValidAuth = checkIsAuthenticated()
        
        // Check if current route is public (defined outside conditionals)
        const isPublicRoute = PUBLIC_ROUTES.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        )
        
        // Also treat /auth/*/callback as public so it doesn't get redirected
        const isOAuthCallback = pathname.startsWith("/auth/") && pathname.includes("/callback")
        
        // Check if current route is an onboarding route
        const isOnboardingRoute = ONBOARDING_ROUTES.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        )
        
        if (currentUser) {
          // Check if user needs to complete onboarding (only for students)
          const needsOnboarding = !isPublicRoute && 
            !isOnboardingRoute && 
            currentUser.role === "student" && 
            currentUser.onboarding_completed === false
          
          if (needsOnboarding) {
            router.replace("/onboarding/mode-selection")
            return
          }
          
          // Check role-based access
          if (!isPublicRoute && !isOnboardingRoute) {
            const userRole = currentUser.role
            
            // Admin can access everything
            if (userRole !== "admin") {
              // Check if trying to access admin routes
              if (pathname.startsWith("/admin")) {
                router.replace("/dashboard")
                return
              }
              
              // Check if trying to access mentor routes
              if (pathname.startsWith("/mentor") && userRole !== "mentor") {
                router.replace("/dashboard")
                return
              }
            }
          }
        } else {
          // No user in store — try to fetch from API.
          // Covers both:
          //   • Cookie-based OAuth sessions (no Bearer token in storage)
          //   • Token-based sessions where sessionStorage was cleared but
          //     a valid localStorage refresh token still exists
          if (!isPublicRoute && !isOAuthCallback) {
            await refreshUser()
            
            // Re-read from store after refresh attempt
            const refreshedUser = useUserStore.getState().user
            if (!refreshedUser) {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("auth_redirect", pathname)
              }
              router.replace("/login")
              return
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router, isHydrated, user, mounted])

  const logout = async () => {
    try {
      // Call logout API (clears server-side tokens)
      await authApi.logout(false)
      // Also clear HttpOnly OAuth cookies
      try {
        await authApi.oauthLogout()
      } catch {
        // Ignore — may not have been using OAuth
      }
    } catch (error) {
      console.error("Logout API error:", error)
    } finally {
      // Always clear local auth data and user store
      clearAuthData()
      clearUser()
      router.replace("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

/**
 * Hook to require authentication for a page
 * Returns loading state and redirects if not authenticated
 */
export function useRequireAuth(allowedRoles?: string[]) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store redirect destination
        if (typeof window !== "undefined") {
          sessionStorage.setItem("auth_redirect", pathname)
        }
        router.replace("/login")
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User doesn't have the required role
        router.replace("/dashboard")
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname])

  return { isLoading, isAuthenticated, user }
}
