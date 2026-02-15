"use client"

import { useRequireAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: string[]
  loadingComponent?: ReactNode
}

/**
 * Wrapper component that protects routes from unauthenticated access
 * Also handles role-based access control
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  loadingComponent 
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useRequireAuth(allowedRoles)

  // Show loading state while checking authentication
  if (isLoading) {
    return loadingComponent || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated or doesn't have required role, don't render children
  // The useRequireAuth hook will handle the redirect
  if (!isAuthenticated) {
    return null
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
