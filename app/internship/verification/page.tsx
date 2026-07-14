"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { getApiErrorMessage, internshipApi } from "@/lib/api"
import { uploadMultipleToCloudinary } from "@/lib/cloudinary"
import InternshipHeader from "../_components/internship-header"
import InternshipStepper from "../_components/internship-stepper"

const steps = [
  { id: 1, label: "Account", status: "done" as const },
  { id: 2, label: "Verify", status: "active" as const },
  { id: 3, label: "Track", status: "locked" as const },
  { id: 4, label: "Accept", status: "locked" as const },
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

const inputClass =
  "h-[60px] w-full rounded-md border border-transparent bg-[#7b8794] px-5 text-base font-semibold text-white outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-white/90 file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#071c2d] hover:file:bg-white focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30"

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
      setUploadProgress("uploading")
      const [itLetterUrl, admissionLetterUrl, idCardUrl] = await uploadMultipleToCloudinary(
        [itLetter, admissionLetter, idCard],
        "internship-documents"
      )

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
    <div className="min-h-screen overflow-x-hidden bg-[#071c2d] px-4 py-6 text-white sm:px-6 md:px-10 md:py-10">
      <InternshipHeader />

      <main className="mx-auto max-w-6xl pt-20 md:pt-24">
        <InternshipStepper steps={steps} />

        <section className="rounded-lg bg-[#24354c] p-6 shadow-2xl shadow-black/20 ring-1 ring-white/5 md:p-9">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-[#071c2d]">
              2
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Student verification</h1>
          </div>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-100">
            Upload your documents for review. This keeps the process simple and lets us match your
            internship application to the right track.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {uploadSections.map((item) => (
              <div key={item.key} className="rounded-lg border border-white/10 bg-[#1d2c42] p-5">
                <label htmlFor={item.key} className="block text-xl font-bold text-white">
                  {item.title}
                </label>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>

                {item.key === "id-card" && (
                  <div className="mt-5">
                    <label htmlFor="idType" className="mb-3 block text-base font-bold text-white">
                      ID type
                    </label>
                    <select
                      id="idType"
                      name="idType"
                      value={idType}
                      onChange={(e) => setIdType(e.target.value as "" | "school-id" | "voters-card" | "nin-slip")}
                      className={inputClass}
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
                  className={`mt-5 ${inputClass}`}
                />
                <p className="mt-3 text-xs font-semibold text-slate-400">{item.hint}</p>
              </div>
            ))}

            {error && (
              <p className="rounded-md border border-red-300/50 bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100">
                {error}
              </p>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-emerald-400 px-6 text-sm font-bold text-[#071c2d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
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
      </main>
    </div>
  )
}
