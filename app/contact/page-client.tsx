"use client"

import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import PublicSiteFooter from "@/components/public-site-footer"
import PublicSiteHeader from "@/components/public-site-header"
import { contactApi, type ContactSubmissionPayload } from "@/lib/api"
import { type ChangeEvent, FormEvent, useState } from "react"

const interestOptions = [
  "Course or learning guidance",
  "Internship enquiry",
  "Business training",
  "Consultancy or services",
  "Partnership",
  "General enquiry",
]

const audienceOptions = [
  "Student / individual learner",
  "Business / organization",
  "School / institution",
  "Founder / team lead",
  "Parent or sponsor",
  "Other",
]

const initialForm: ContactSubmissionPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  interest: "",
  learner_type: "",
  message: "",
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

export default function ContactPageClient() {
  const [formData, setFormData] = useState<ContactSubmissionPayload>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const updateField = (field: keyof ContactSubmissionPayload) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage("")
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const payload: ContactSubmissionPayload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        interest: formData.interest,
        learner_type: formData.learner_type,
        message: formData.message.trim(),
      }
      const response = await contactApi.submit(payload)
      setSuccessMessage(response.message || "Email sent successfully. We will contact you in a few hours.")
      setFormData(initialForm)
    } catch {
      setErrorMessage("We could not send your message right now. Please email rashnotech@gmail.com directly.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#071c2d] font-sans text-white">
      <PublicSiteHeader />

      <main className="relative overflow-hidden pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "150px 150px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(37,99,235,0.24),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.16),transparent_32%)]" />

        <section className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-blue-300 sm:text-sm">
              Contact Rashnotech
            </p>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              Tell us what you need help with
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-300 md:text-lg">
              For learning, internships, consulting, business services, or partnerships, send the details
              and we will route your enquiry to the right Rashnotech team member.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#contact-form"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-400"
              >
                Send an enquiry
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:rashnotech@gmail.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Email Rashnotech
              </Link>
            </div>
          </div>

          <div id="contact-form" className="rounded-lg bg-white p-4 text-[#071c2d] shadow-2xl shadow-black/30 sm:p-6 md:p-7">
            <h2 className="text-center text-xl font-black sm:text-2xl md:text-3xl">Contact Rashnotech</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm font-medium text-slate-600">
              Submit the form and we will send your enquiry directly to the Rashnotech team.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-bold">
                    First name*
                  </label>
                  <input id="firstName" required value={formData.first_name} onChange={updateField("first_name")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-bold">
                    Last name*
                  </label>
                  <input id="lastName" required value={formData.last_name} onChange={updateField("last_name")} className={inputClass} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold">
                    Email address*
                  </label>
                  <input id="email" type="email" required value={formData.email} onChange={updateField("email")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-bold">
                    Phone number
                  </label>
                  <input id="phone" type="tel" value={formData.phone || ""} onChange={updateField("phone")} className={inputClass} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="interest" className="mb-2 block text-sm font-bold">
                    What do you need help with?*
                  </label>
                  <select id="interest" required value={formData.interest} onChange={updateField("interest")} className={`${inputClass} bg-white`}>
                    <option value="">Select one</option>
                    {interestOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="learnerType" className="mb-2 block text-sm font-bold">
                    This enquiry is for*
                  </label>
                  <select id="learnerType" required value={formData.learner_type} onChange={updateField("learner_type")} className={`${inputClass} bg-white`}>
                    <option value="">Select one</option>
                    {audienceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-bold">
                  Message*
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={updateField("message")}
                  className="w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div aria-live="polite" className="space-y-2">
                {successMessage && (
                  <p className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    {successMessage}
                  </p>
                )}
                {errorMessage && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {errorMessage}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-500 px-6 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send enquiry"
                )}
              </button>

              <p className="text-xs leading-5 text-slate-500">
                By contacting us, you agree that Rashnotech may reply using the details you provide.
              </p>
            </form>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
