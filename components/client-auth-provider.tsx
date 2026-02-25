"use client"

import { useState, useEffect, type ReactNode } from "react"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "sonner"

/**
 * Client-only providers wrapper.
 *
 * During Next.js 16 prerender (/_not-found, /_global-error, etc.), client
 * components that use navigation hooks (useRouter, usePathname) crash with
 * "Expected workUnitAsyncStorage to have a store". This wrapper defers all
 * providers until after client mount, rendering only the children during
 * SSR/prerender.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // During SSR / prerender: render children without any providers.
    return <>{children}</>
  }

  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryProvider>
  )
}
