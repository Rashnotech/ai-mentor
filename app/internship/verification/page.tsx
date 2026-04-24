"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { getApiErrorMessage, internshipApi } from "@/lib/api"
import { uploadMultipleToCloudinary } from "@/lib/cloudinary"
import InternshipHeader from "../_components/internship-header"

const steps = [
  { id: 1, label: "Create profile", status: "done" },
  { id: 2, label: "Student verification", status: "active" },
  { id: 3, label: "Choose track", status: "locked" },
  { id: 4, label: "Get acceptance", status: "locked" },
]

const uploadSections = [
  {
    key: "it-letter",
    title: "School IT Letter",
    description: "Upload your industrial training letter issued by your school.",
    hint: "PDF, PNG or JPG. Max size 10MB.",
  },
  {
    key: "admission-letter",
    title: "Admission Letter",
    description: "Upload your admission letter to confirm your enrollment.",
    hint: "PDF preferred. Max size 10MB.",
  },
  {
    key: "id-card",
    title: "Identity Verification",
    description: "Upload one valid identity document: School ID, Voter's Card, or NIN Slip.",
    hint: "Clear photo or scan, front side visible.",
  },
]

export default function InternshipVerificationPage() {
  const router = useRouter()
  const [idType, setIdType] = useState<"" | "school-id" | "voters-card" | "nin-slip">("")
  const [itLetter, setItLetter] = useState<File | null>(null)
  const [admissionLetter, setAdmissionLetter] = useState<File | null>(null)
  const [idCard, setIdCard] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState<"" | "uploading" | "saving">("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const storedId = localStorage.getItem("internship_application_id")
    const applicationId = storedId ? Number(storedId) : NaN

    if (!applicationId || Number.isNaN(applicationId)) {
      setError("Application was not found. Please complete your profile first.")
      return
    }

    setIsSubmitting(true)
    try {
      // Step 1: Upload all files to Cloudinary
      setUploadProgress("uploading")
      const [itLetterUrl, admissionLetterUrl, idCardUrl] = await uploadMultipleToCloudinary(
        [itLetter, admissionLetter, idCard],
        "internship-documents"
      )

      // Step 2: Send Cloudinary URLs to backend
      setUploadProgress("saving")
      await internshipApi.uploadDocuments(applicationId, {
        it_letter_url: itLetterUrl || undefined,
        admission_letter_url: admissionLetterUrl || undefined,
        id_card_url: idCardUrl || undefined,
        id_type: idType || undefined,
      })

      router.push("/internship/choose-track")
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
      setUploadProgress("")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_8%_12%,#dbeafe_0%,transparent_35%),radial-gradient(circle_at_90%_0%,#bfdbfe_0%,transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_65%,#dbeafe_100%)] px-4 py-6 sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute left-0 top-10 h-48 w-48 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="pt-20" />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur md:p-6">
            <ol className="space-y-0">
              {steps.map((step, index) => (
                <li key={step.id} className="relative flex items-start gap-4 pb-7 last:pb-0">
                  {index < steps.length - 1 && <span className="absolute left-5 top-10 h-8 w-px bg-gray-300" aria-hidden />}
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-base font-semibold ${
                      step.status === "active"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : step.status === "done"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-500"
                    }`}
                  >
                    {step.id}
                  </span>
                  <span
                    className={`pt-1 text-lg font-semibold ${
                      step.status === "active" || step.status === "done"
                        ? "text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </aside>

          <section className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/70 backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Step 2 of 4</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Student Verification</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload the required documents for review. Once approved, you can move to learning track selection.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {uploadSections.map((item) => (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <label htmlFor={item.key} className="block text-sm font-semibold text-slate-900">
                    {item.title}
                  </label>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>

                  {item.key === "id-card" && (
                    <div className="mt-3">
                      <label htmlFor="idType" className="mb-2 block text-sm font-medium text-slate-700">
                        ID type
                      </label>
                      <select
                        id="idType"
                        name="idType"
                        value={idType}
                        onChange={(e) => setIdType(e.target.value as "" | "school-id" | "voters-card" | "nin-slip")}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="" disabled>
                          Select ID type
                        </option>
                        <option value="school-id">School ID</option>
                        <option value="voters-card">Voter's Card</option>
                        <option value="nin-slip">NIN Slip</option>
                      </select>
                    </div>
                  )}

                  <input
                    id={item.key}
                    name={item.key}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      if (item.key === "it-letter") setItLetter(file)
                      if (item.key === "admission-letter") setAdmissionLetter(file)
                      if (item.key === "id-card") setIdCard(file)
                    }}
                    className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
                </div>
              ))}

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-75 md:w-auto"
                >
                  {uploadProgress === "uploading"
                    ? "Uploading documents..."
                    : uploadProgress === "saving"
                      ? "Saving documents..."
                      : isSubmitting
                        ? "Submitting..."
                        : "Submit for verification"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
