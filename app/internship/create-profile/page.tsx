"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { getApiErrorMessage, internshipApi } from "@/lib/api"
import InternshipHeader from "../_components/internship-header"
import InternshipStepper from "../_components/internship-stepper"

const getStatesFromApi = async () => {
  const response = await fetch("https://nga-states-lga.onrender.com/fetch")

  if (!response.ok) {
    throw new Error("Failed to fetch states")
  }

  const json: unknown = await response.json()

  if (Array.isArray(json)) {
    return json.filter((item): item is string => typeof item === "string")
  }

  if (json && typeof json === "object" && "states" in json) {
    const states = (json as { states?: unknown }).states
    if (Array.isArray(states)) {
      return states.filter((item): item is string => typeof item === "string")
    }
  }

  return []
}

const countries = ["Nigeria", "United States", "Canada", "United Kingdom", "Ghana", "Kenya"]

const statesByCountry: Record<string, string[]> = {
  Nigeria: ["Lagos", "Abuja", "Rivers", "Oyo", "Kano"],
  "United States": ["California", "Texas", "Florida", "New York", "Illinois"],
  Canada: ["Ontario", "Alberta", "British Columbia", "Quebec", "Manitoba"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Ghana: ["Greater Accra", "Ashanti", "Western", "Volta", "Central"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu"],
}

const steps = [
  { id: 1, label: "Account", status: "active" as const },
  { id: 2, label: "Verify", status: "locked" as const },
  { id: 3, label: "Track", status: "locked" as const },
  { id: 4, label: "Accept", status: "locked" as const },
]

const inputClass =
  "h-[58px] w-full rounded-md border border-transparent bg-[#7b8794] px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-300/30 disabled:cursor-not-allowed disabled:opacity-70"

const labelClass = "mb-2 block text-base font-bold text-white"

export default function InternshipCreateProfilePage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState("Nigeria")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [apiStates, setApiStates] = useState<string[]>([])
  const [isLoadingStates, setIsLoadingStates] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    telephone: "",
    hear_about_us: "",
    country: "Nigeria",
    state: "",
    institution_type: "" as "" | "university" | "polytechnic" | "college",
  })

  useEffect(() => {
    let isMounted = true

    const loadStates = async () => {
      setIsLoadingStates(true)
      try {
        const states = await getStatesFromApi()
        if (isMounted && Array.isArray(states)) {
          setApiStates(states)
        }
      } catch {
        if (isMounted) {
          setApiStates([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingStates(false)
        }
      }
    }

    loadStates()

    return () => {
      isMounted = false
    }
  }, [])

  const availableStates = useMemo(() => {
    if (selectedCountry === "Nigeria" && apiStates.length > 0) {
      return apiStates
    }
    return statesByCountry[selectedCountry] ?? []
  }, [apiStates, selectedCountry])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!formData.state) {
      setError("Please select your state or territory.")
      return
    }
    if (!formData.institution_type) {
      setError("Please select your institution type.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await internshipApi.createProfile({
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        telephone: formData.telephone.trim(),
        hear_about_us: formData.hear_about_us || undefined,
        country: formData.country,
        state: formData.state,
        institution_type: formData.institution_type,
      })

      localStorage.setItem("internship_application_id", String(response.application_id))
      router.push("/internship/verification")
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071c2d] px-4 py-6 text-white sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />

      <main className="mx-auto max-w-6xl pt-20">
        <InternshipStepper steps={steps} />

        <section className="rounded-lg bg-[#24354c] p-5 shadow-2xl shadow-black/20 ring-1 ring-white/5 md:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-[#071c2d]">
              1
            </span>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Account details</h1>
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-100 md:text-base">
            Create your internship profile so we can review your application.
          </p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="telephone" className={labelClass}>
                  Phone Number
                </label>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  placeholder="+234"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telephone: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  value={selectedCountry}
                  onChange={(e) => {
                    const nextCountry = e.target.value
                    setSelectedCountry(nextCountry)
                    setFormData((prev) => ({ ...prev, country: nextCountry, state: "" }))
                  }}
                  className={inputClass}
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="state" className={labelClass}>
                  State or Territory
                </label>
                <select
                  id="state"
                  name="state"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  key={selectedCountry}
                  disabled={selectedCountry === "Nigeria" && isLoadingStates}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {selectedCountry === "Nigeria" && isLoadingStates ? "Loading states..." : "Select a state"}
                  </option>
                  {availableStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="institution" className={labelClass}>
                  Institution
                </label>
                <select
                  id="institution"
                  name="institution"
                  required
                  value={formData.institution_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      institution_type: e.target.value as "" | "university" | "polytechnic" | "college",
                    }))
                  }
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select institution type
                  </option>
                  <option value="university">University</option>
                  <option value="polytechnic">Polytechnic</option>
                  <option value="college">College</option>
                </select>
              </div>

              <div>
                <label htmlFor="hearAboutUs" className={labelClass}>
                  How did you hear about us <span className="text-base font-medium text-slate-300">Optional</span>
                </label>
                <select
                  id="hearAboutUs"
                  name="hearAboutUs"
                  value={formData.hear_about_us}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hear_about_us: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="friend">Friend or colleague</option>
                  <option value="social-media">Social media</option>
                  <option value="school">School or lecturer</option>
                  <option value="search">Google/Search engine</option>
                  <option value="event">Event or community</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-red-300/50 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
                {error}
              </p>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-500 px-6 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
              >
                {isSubmitting ? "Creating profile..." : "Continue"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
