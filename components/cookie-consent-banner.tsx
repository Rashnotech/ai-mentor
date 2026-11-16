"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { ArrowRight, Check, Cookie, Settings2, ShieldCheck, Sparkles, X } from "lucide-react"
import {
  COOKIE_CONSENT_EVENT,
  type CookieConsentState,
  type UserExperienceProfile,
  readCookieConsent,
  readUserExperienceProfile,
  recordUserExperienceVisit,
  saveCookieConsent,
} from "@/lib/cookie-consent"

function formatPathLabel(pathname: string): string {
  if (pathname === "/services") return "Rashnotech Services"
  if (pathname === "/courses") return "Course Catalog"
  if (pathname.startsWith("/courses/")) {
    const slug = pathname.replace("/courses/", "").replace(/-/g, " ")
    return `Course: ${slug.replace(/\b\w/g, (c) => c.toUpperCase())}`
  }
  if (pathname.startsWith("/internship")) return "Internship Application"
  if (pathname === "/contact") return "Contact & Consultation"
  return "Rashnotech Home"
}

export default function CookieConsentBanner() {
  const pathname = usePathname() || "/"
  const [hydrated, setHydrated] = useState(false)
  const [consent, setConsent] = useState<CookieConsentState | null>(null)
  const [bannerOpen, setBannerOpen] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [preferencesEnabled, setPreferencesEnabled] = useState(true)
  const [uxProfile, setUxProfile] = useState<UserExperienceProfile | null>(null)
  const [resumeDismissed, setResumeDismissed] = useState(false)

  useEffect(() => {
    const existing = readCookieConsent()
    setConsent(existing)
    if (!existing) {
      setBannerOpen(true)
    } else {
      setAnalyticsEnabled(existing.analytics)
      setPreferencesEnabled(existing.preferences)
      if (existing.preferences) {
        setUxProfile(readUserExperienceProfile())
      }
    }
    setHydrated(true)

    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail || readCookieConsent()
      setConsent(detail)
      if (detail) {
        setAnalyticsEnabled(detail.analytics)
        setPreferencesEnabled(detail.preferences)
        setUxProfile(detail.preferences ? readUserExperienceProfile() : null)
      }
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange)
  }, [])

  // Record route visits into UX personalization cookie when preferences consent is enabled
  useEffect(() => {
    if (!hydrated || !consent?.preferences) return
    if (pathname && pathname !== "/") {
      const updated = recordUserExperienceVisit({
        path: pathname,
        label: formatPathLabel(pathname),
      })
      if (updated) {
        setUxProfile(updated)
      }
    } else {
      setUxProfile(readUserExperienceProfile())
    }
  }, [pathname, hydrated, consent?.preferences])

  const handleAcceptAll = () => {
    const saved = saveCookieConsent("accepted")
    setConsent(saved)
    setBannerOpen(false)
    setCustomizing(false)
    const updated = recordUserExperienceVisit({
      path: pathname !== "/" ? pathname : "/courses",
      label: pathname !== "/" ? formatPathLabel(pathname) : "Explore Courses",
    })
    setUxProfile(updated)
  }

  const handleRejectNonEssential = () => {
    const saved = saveCookieConsent("rejected")
    setConsent(saved)
    setBannerOpen(false)
    setCustomizing(false)
    setUxProfile(null)
  }

  const handleSavePreferences = () => {
    const saved = saveCookieConsent({
      analytics: analyticsEnabled,
      preferences: preferencesEnabled,
    })
    setConsent(saved)
    setBannerOpen(false)
    setCustomizing(false)
    if (saved.preferences) {
      const updated = recordUserExperienceVisit({
        path: pathname !== "/" ? pathname : "/courses",
        label: pathname !== "/" ? formatPathLabel(pathname) : "Explore Courses",
      })
      setUxProfile(updated)
    } else {
      setUxProfile(null)
    }
  }

  if (!hydrated) {
    return null
  }

  const showQuickResume =
    !bannerOpen &&
    !resumeDismissed &&
    consent?.preferences &&
    uxProfile &&
    pathname === "/" &&
    uxProfile.lastVisitedPath &&
    uxProfile.lastVisitedPath !== "/"

  return (
    <>
      {consent?.analytics && <Analytics />}

      {/* Personalized UX Quick-Resume Bar when returning to homepage with UX cookies accepted */}
      {showQuickResume && (
        <div
          role="region"
          aria-label="Personalized session resume"
          className="fixed bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-blue-400/30 bg-[#071c2d]/95 px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1d4ed8] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Continue where you left off
            </p>
            <Link
              href={uxProfile.lastVisitedPath}
              className="mt-0.5 inline-flex items-center gap-1.5 truncate text-sm font-bold text-white hover:text-sky-300"
            >
              <span className="truncate">{uxProfile.lastVisitedLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setResumeDismissed(true)}
            aria-label="Dismiss session resume"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subtle Cookie Preferences trigger when banner is closed */}
      {!bannerOpen && !showQuickResume && (
        <button
          type="button"
          onClick={() => setBannerOpen(true)}
          aria-label="Manage cookie preferences"
          className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#071c2d]/90 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md transition hover:border-blue-400/40 hover:bg-[#0f2942] hover:text-white"
        >
          <Cookie className="h-3.5 w-3.5 text-sky-400" />
          <span>Cookie Preferences</span>
        </button>
      )}

      {/* Main Cookie Notification Dialog */}
      {bannerOpen && (
        <aside
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent notification"
          className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6"
        >
          <div className="mx-auto max-w-5xl rounded-2xl border border-blue-400/25 bg-[#071c2d]/95 p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/30 bg-[#1d4ed8]/25 text-sky-300">
                  <Cookie className="h-6 w-6" />
                </div>
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                      We use cookies to improve your experience
                    </h2>
                    <span className="hidden items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 sm:inline-flex">
                      <ShieldCheck className="h-3 w-3" />
                      Privacy First
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    Rashnotech uses essential cookies to keep the platform secure and optional cookies to remember your
                    learning path, service filters, and session progress so we can personalize your experience. Read our{" "}
                    <Link href="/privacy-policy" className="font-semibold text-sky-300 underline hover:text-white">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCustomizing((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:text-sm"
                >
                  <Settings2 className="h-4 w-4 text-sky-300" />
                  <span>{customizing ? "Hide Options" : "Customize"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 sm:text-sm"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 sm:text-sm"
                >
                  <Check className="h-4 w-4" />
                  <span>Accept All</span>
                </button>
              </div>
            </div>

            {customizing && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-[#0f2942]/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Essential Cookies</span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        Always Active
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      Required for authentication, secure enrollment, payments, and core site navigation.
                    </p>
                  </div>

                  <label className="flex cursor-pointer flex-col justify-between rounded-xl border border-white/10 bg-[#0f2942]/70 p-4 transition hover:border-blue-400/40">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">UX & Personalization</span>
                        <input
                          type="checkbox"
                          checked={preferencesEnabled}
                          onChange={(e) => setPreferencesEnabled(e.target.checked)}
                          className="h-4 w-4 accent-[#1d4ed8]"
                        />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        Remembers your last visited course or service category and enables quick-resume navigation.
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer flex-col justify-between rounded-xl border border-white/10 bg-[#0f2942]/70 p-4 transition hover:border-blue-400/40">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Analytics & Performance</span>
                        <input
                          type="checkbox"
                          checked={analyticsEnabled}
                          onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                          className="h-4 w-4 accent-[#1d4ed8]"
                        />
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        Helps us measure page speed, popular courses, and improve platform reliability.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-[#071c2d] transition hover:bg-sky-400 sm:text-sm"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  )
}
