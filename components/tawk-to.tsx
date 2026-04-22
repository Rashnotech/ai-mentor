"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void
    }
    Tawk_LoadStart?: Date
  }
}

export default function TawkTo() {
  useEffect(() => {
    if (window.Tawk_API) {
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-tawk-to="true"]')
    if (existingScript) {
      return
    }

    const script = document.createElement("script")
    script.async = true
    script.src = "https://embed.tawk.to/68c657d667c586192c678458/1j53ce8f2"
    script.charset = "UTF-8"
    script.setAttribute("crossorigin", "*")
    script.setAttribute("data-tawk-to", "true")

    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    document.head.appendChild(script)

    return () => {
      window.Tawk_API?.hideWidget?.()

      const loadedScript = document.querySelector<HTMLScriptElement>('script[data-tawk-to="true"]')
      loadedScript?.remove()

      delete window.Tawk_API
      delete window.Tawk_LoadStart
    }
  }, [])

  return null
}