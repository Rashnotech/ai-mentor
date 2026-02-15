"use client"

import { DashboardView } from "./_components"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  const handleChangeView = (view: string) => {
    // Map old view names to new routes
    const routeMap: Record<string, string> = {
      "my-courses": "/dashboard/courses",
      "projects": "/dashboard/projects",
      "community": "/dashboard/community",
      "profile": "/dashboard/profile",
      "dashboard": "/dashboard",
    }
    
    const route = routeMap[view] || "/dashboard"
    router.push(route)
  }

  return <DashboardView onChangeView={handleChangeView} />
}

