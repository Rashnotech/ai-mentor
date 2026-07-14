import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Mail, MapPin, MessageCircle, PhoneCall } from "lucide-react"
import PublicSiteFooter from "@/components/public-site-footer"
import PublicSiteHeader from "@/components/public-site-header"

export const metadata: Metadata = {
  title: "Contact Rashnotech | Tech Training, Internships, and Support",
  description:
    "Contact Rashnotech for course guidance, internship questions, school partnerships, tech training, and learner support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Rashnotech",
    description: "Talk to Rashnotech about courses, internships, tech training, and learning support.",
    url: "/contact",
    type: "website",
  },
}

const interestOptions = [
  "Course guidance",
  "Internship programme",
  "School or team training",
  "Mentorship support",
  "Partnership",
  "Other",
]

const contactCards = [
  {
    title: "Email support",
    description: "Send us your question and the Rashnotech team will respond.",
    value: "support@rashnotech.tech",
    href: "mailto:support@rashnotech.tech",
    icon: Mail,
  },
  {
    title: "Learning help",
    description: "Need help choosing a course, learning path, or internship track?",
    value: "Request guidance",
    href: "#contact-form",
    icon: MessageCircle,
  },
  {
    title: "Office visit",
    description: "For school, team, or community training conversations.",
    value: "Book a conversation",
    href: "#contact-form",
    icon: MapPin,
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#071c2d] font-sans text-white">
      <PublicSiteHeader />

      <main className="relative overflow-hidden pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "180px 180px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(37,99,235,0.24),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.16),transparent_32%)]" />

        <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">
              Contact Rashnotech
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
              Let us help you choose the right tech path
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-300">
              Talk to us about courses, internships, mentorship, team training, or the best way to start
              learning with Rashnotech.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#contact-form"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-6 py-3 text-sm font-bold text-[#071c2d] transition hover:bg-emerald-300"
              >
                Send a message
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:support@rashnotech.tech"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Email support
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                ["24-48h", "Typical response"],
                ["Courses", "Learning guidance"],
                ["Internship", "Student support"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="contact-form" className="rounded-lg bg-white p-6 text-[#071c2d] shadow-2xl shadow-black/30 md:p-8">
            <h2 className="text-center text-2xl font-black md:text-3xl">Get in touch with Rashnotech</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm font-medium text-slate-600">
              Fill the form and send it through your email app, or contact us directly at support@rashnotech.tech.
            </p>

            <form
              className="mt-8 space-y-5"
              action="mailto:support@rashnotech.tech"
              method="post"
              encType="text/plain"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-sm font-bold">
                    First name*
                  </label>
                  <input id="firstName" name="firstName" required className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-sm font-bold">
                    Last name*
                  </label>
                  <input id="lastName" name="lastName" required className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold">
                    Email address*
                  </label>
                  <input id="email" name="email" type="email" required className="h-12 w-full rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-bold">
                    Phone number
                  </label>
                  <div className="flex gap-3">
                    <div className="flex h-12 w-20 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-sm font-bold">
                      +234
                    </div>
                    <input id="phone" name="phone" type="tel" className="h-12 min-w-0 flex-1 rounded-md border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="interest" className="mb-2 block text-sm font-bold">
                    What do you need help with?*
                  </label>
                  <select id="interest" name="interest" required className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
                    I am a*
                  </label>
                  <select id="learnerType" name="learnerType" required className="h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value="">Select one</option>
                    <option value="student">Student</option>
                    <option value="graduate">Graduate</option>
                    <option value="working-professional">Working professional</option>
                    <option value="parent-or-sponsor">Parent or sponsor</option>
                    <option value="school-or-business">School or business</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-bold">
                  Message*
                </label>
                <textarea id="message" name="message" required rows={5} className="w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-md bg-emerald-400 px-6 text-sm font-black text-[#071c2d] transition hover:bg-emerald-300"
              >
                Send message
              </button>

              <p className="text-xs leading-5 text-slate-500">
                By contacting us, you agree that Rashnotech may reply to your message using the details you provide.
              </p>
            </form>
          </div>
        </section>

        <section className="relative bg-white px-6 py-16 text-slate-900">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Support channels</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">How Rashnotech can help</h2>
              </div>
              <Link href="#contact-form" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                <PhoneCall className="h-4 w-4" />
                Request a call from the form
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {contactCards.map((card) => {
                const Icon = card.icon

                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-black">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                    <p className="mt-5 text-sm font-bold text-blue-700">{card.value}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
