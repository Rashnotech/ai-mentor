"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"
import { getApiErrorMessage, internshipApi } from "@/lib/api"

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
  { id: 1, label: "Create profile", active: true },
  { id: 2, label: "Student verification", active: false },
  { id: 3, label: "Choose track", active: false },
  { id: 4, label: "Get acceptance", active: false },
]

export default function InternshipCreateProfilePage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState("Nigeria")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

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

  const availableStates = useMemo(() => statesByCountry[selectedCountry] ?? [], [selectedCountry])

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
    <div className="min-h-screen bg-gray-50 px-5 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link href="/internship" className="inline-flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900">
            <span aria-hidden>←</span>
            <span>Go to Internship</span>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-gray-200 bg-white p-6">
            <ol className="space-y-0">
              {steps.map((step, index) => (
                <li key={step.id} className="relative flex items-start gap-4 pb-7 last:pb-0">
                  {index < steps.length - 1 && <span className="absolute left-5 top-10 h-8 w-px bg-gray-300" aria-hidden />}
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold ${
                      step.active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className={`pt-1 text-lg font-semibold ${step.active ? "text-gray-900" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Profile</h1>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-900">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-semibold text-gray-900">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-semibold text-gray-900">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last name"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="telephone" className="mb-2 block text-sm font-semibold text-gray-900">
                  Telephone
                </label>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  placeholder="e.g. +234 801 234 5678"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telephone: e.target.value }))}
                  className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label htmlFor="hearAboutUs" className="mb-2 block text-sm font-semibold text-gray-900">
                  How did you hear about us <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <select
                  id="hearAboutUs"
                  name="hearAboutUs"
                  value={formData.hear_about_us}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hear_about_us: e.target.value }))}
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="country" className="mb-2 block text-sm font-semibold text-gray-900">
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
                    className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="state" className="mb-2 block text-sm font-semibold text-gray-900">
                    State or Territory
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    key={selectedCountry}
                    className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="" disabled>
                      Select a state
                    </option>
                    {availableStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="institution" className="mb-2 block text-sm font-semibold text-gray-900">
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
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="" disabled>
                    Select institution type
                  </option>
                  <option value="university">University</option>
                  <option value="polytechnic">Polytechnic</option>
                  <option value="college">College</option>
                </select>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {isSubmitting ? "Creating profile..." : "Continue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
