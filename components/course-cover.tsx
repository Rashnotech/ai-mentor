"use client"

import { useState } from "react"

/** Native images accept admin-provided hosts without a Next image allowlist. */
export function CourseCover({ src, title }: { src?: string | null; title: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = src?.trim()
  if (!url || url === failedSrc) return null
  return (
    <img
      src={url}
      alt={`${title} cover`}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setFailedSrc(url)}
    />
  )
}
