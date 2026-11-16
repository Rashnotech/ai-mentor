export const COOKIE_CONSENT_NAME = "rashnotech_cookie_consent"
export const UX_PROFILE_COOKIE_NAME = "rashnotech_ux_profile"
export const CUSTOM_SERVICES_STORAGE_KEY = "rashnotech_custom_services"
export const COOKIE_CONSENT_EVENT = "rashnotech:cookie-consent-change"

export type CookieConsentStatus = "accepted" | "rejected" | "customized"

export interface CookieConsentState {
  status: CookieConsentStatus
  essential: true
  analytics: boolean
  preferences: boolean
  updatedAt: string
}

export interface UserExperienceProfile {
  lastVisitedPath: string
  lastVisitedLabel: string
  preferredServiceCategory: string
  visitCount: number
  updatedAt: string
}

export function createConsentState(
  decision: "accepted" | "rejected" | { analytics?: boolean; preferences?: boolean },
  now: Date = new Date()
): CookieConsentState {
  const updatedAt = now.toISOString()
  if (decision === "accepted") {
    return {
      status: "accepted",
      essential: true,
      analytics: true,
      preferences: true,
      updatedAt,
    }
  }
  if (decision === "rejected") {
    return {
      status: "rejected",
      essential: true,
      analytics: false,
      preferences: false,
      updatedAt,
    }
  }
  const analytics = Boolean(decision.analytics)
  const preferences = Boolean(decision.preferences)
  return {
    status: analytics && preferences ? "accepted" : !analytics && !preferences ? "rejected" : "customized",
    essential: true,
    analytics,
    preferences,
    updatedAt,
  }
}

export function serializeCookieConsent(state: CookieConsentState): string {
  return encodeURIComponent(JSON.stringify(state))
}

export function parseCookieConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidates = [trimmed]
  try {
    candidates.unshift(decodeURIComponent(trimmed))
  } catch {
    // ignore malformed URI encoding and try raw string
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<CookieConsentState>
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.status === "accepted" || parsed.status === "rejected" || parsed.status === "customized") &&
        typeof parsed.analytics === "boolean" &&
        typeof parsed.preferences === "boolean"
      ) {
        return {
          status: parsed.status,
          essential: true,
          analytics: parsed.analytics,
          preferences: parsed.preferences,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        }
      }
    } catch {
      // continue
    }
  }

  return null
}

export function extractCookieValue(cookieHeader: string, cookieName: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (rawKey === cookieName) {
      return rest.join("=")
    }
  }
  return null
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null
  const fromCookie = extractCookieValue(document.cookie || "", COOKIE_CONSENT_NAME)
  const parsedCookie = parseCookieConsent(fromCookie)
  if (parsedCookie) return parsedCookie

  try {
    const fromStorage = window.localStorage.getItem(COOKIE_CONSENT_NAME)
    return parseCookieConsent(fromStorage)
  } catch {
    return null
  }
}

export function saveCookieConsent(
  decision: "accepted" | "rejected" | { analytics?: boolean; preferences?: boolean }
): CookieConsentState {
  const state = createConsentState(decision)
  if (typeof window !== "undefined") {
    const serialized = serializeCookieConsent(state)
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    document.cookie = `${COOKIE_CONSENT_NAME}=${serialized}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
    try {
      window.localStorage.setItem(COOKIE_CONSENT_NAME, JSON.stringify(state))
      if (!state.preferences) {
        window.localStorage.removeItem(UX_PROFILE_COOKIE_NAME)
        document.cookie = `${UX_PROFILE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
      }
    } catch {
      // ignore storage quota errors
    }
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: state }))
  }
  return state
}

export function parseUserExperienceProfile(raw: string | null | undefined): UserExperienceProfile | null {
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidates = [trimmed]
  try {
    candidates.unshift(decodeURIComponent(trimmed))
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<UserExperienceProfile>
      if (parsed && typeof parsed === "object" && typeof parsed.lastVisitedPath === "string") {
        return {
          lastVisitedPath: parsed.lastVisitedPath,
          lastVisitedLabel: typeof parsed.lastVisitedLabel === "string" ? parsed.lastVisitedLabel : "Explore Courses",
          preferredServiceCategory:
            typeof parsed.preferredServiceCategory === "string" ? parsed.preferredServiceCategory : "All",
          visitCount: typeof parsed.visitCount === "number" && parsed.visitCount > 0 ? parsed.visitCount : 1,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        }
      }
    } catch {
      // continue
    }
  }
  return null
}

export function readUserExperienceProfile(): UserExperienceProfile | null {
  if (typeof window === "undefined") return null
  const consent = readCookieConsent()
  if (!consent?.preferences) return null

  const fromCookie = extractCookieValue(document.cookie || "", UX_PROFILE_COOKIE_NAME)
  const parsedCookie = parseUserExperienceProfile(fromCookie)
  if (parsedCookie) return parsedCookie

  try {
    const fromStorage = window.localStorage.getItem(UX_PROFILE_COOKIE_NAME)
    return parseUserExperienceProfile(fromStorage)
  } catch {
    return null
  }
}

export function recordUserExperienceVisit(update: {
  path?: string
  label?: string
  preferredServiceCategory?: string
}): UserExperienceProfile | null {
  if (typeof window === "undefined") return null
  const consent = readCookieConsent()
  if (!consent?.preferences) return null

  const existing = readUserExperienceProfile()
  const nextProfile: UserExperienceProfile = {
    lastVisitedPath: update.path || existing?.lastVisitedPath || "/courses",
    lastVisitedLabel: update.label || existing?.lastVisitedLabel || "Explore Courses",
    preferredServiceCategory:
      update.preferredServiceCategory || existing?.preferredServiceCategory || "All",
    visitCount: (existing?.visitCount || 0) + (update.path ? 1 : 0),
    updatedAt: new Date().toISOString(),
  }

  const maxAge = 60 * 60 * 24 * 180 // 180 days
  const serialized = encodeURIComponent(JSON.stringify(nextProfile))
  document.cookie = `${UX_PROFILE_COOKIE_NAME}=${serialized}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  try {
    window.localStorage.setItem(UX_PROFILE_COOKIE_NAME, JSON.stringify(nextProfile))
  } catch {
    // ignore
  }
  return nextProfile
}
