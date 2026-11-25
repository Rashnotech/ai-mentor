"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Calendar,
  CheckCircle2,
  Cloud,
  Code2,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Microscope,
  Palette,
  Phone,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Video,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { contactApi } from "@/lib/api"
import { toast } from "sonner"
import PublicSiteFooter from "@/components/public-site-footer"

export interface ServiceItem {
  id: string
  title: string
  category: "Engineering & AI" | "Design & Research" | "Cloud & Security" | "Training & Growth"
  description: string
  highlights: string[]
  image: string
}

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: "app-development",
    title: "App Development (Mobile & Web)",
    category: "Engineering & AI",
    description:
      "Full-cycle web and mobile application engineering built for speed, reliability, and seamless user journeys across iOS, Android, and modern web platforms.",
    highlights: ["Cross-platform mobile & web apps", "Scalable APIs & microservices", "Performance-first architecture"],
    image: "/hub-4.jpg",
  },
  {
    id: "e-commerce",
    title: "E-Commerce",
    category: "Engineering & AI",
    description:
      "High-converting digital storefronts, multi-currency payment integrations, inventory engines, and omnichannel checkout experiences tailored for growth.",
    highlights: ["Custom storefronts & marketplaces", "Payment & logistics integration", "Conversion rate optimization"],
    image: "/funded.jpg",
  },
  {
    id: "corporate-school-training",
    title: "Corporate & School Training (Digital Skill Training)",
    category: "Training & Growth",
    description:
      "Tailored corporate upskilling bootcamps, executive AI workshops, 1-on-1 mentor coaching, and practical school STEM & coding academies.",
    highlights: ["Corporate engineering & AI bootcamps", "School coding & STEM academies", "1-on-1 mentor-led tracks"],
    image: "/ai_mentor.jpg",
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    category: "Cloud & Security",
    description:
      "Proactive security audits, penetration testing, zero-trust identity architecture, and compliance hardening to protect mission-critical systems and data integrity.",
    highlights: ["Penetration testing & VAPT", "Zero-trust & cloud security", "ISO-aligned security hardening"],
    image: "/funded.jpg",
  },
  {
    id: "ai-automation",
    title: "AI Automation",
    category: "Engineering & AI",
    description:
      "Intelligent workflow automation, autonomous decision layers, and custom LLM copilots that connect data visibility directly to real-world operational execution.",
    highlights: ["Custom AI agents & copilots", "Workflow & CRM automation", "Predictive operational intelligence"],
    image: "/hub-4.jpg",
  },
  {
    id: "product-design",
    title: "Product Design",
    category: "Design & Research",
    description:
      "Human-centered UI/UX design systems, interactive prototypes, and conversion-focused product experiences that turn complex workflows into intuitive interfaces.",
    highlights: ["Design systems & UI kits", "Interactive prototyping", "Usability testing & UX audits"],
    image: "/funded.jpg",
  },
  {
    id: "project-research",
    title: "Project Research",
    category: "Design & Research",
    description:
      "Applied AI, operational intelligence, academic, and technical project research that unifies real-world data streams, simulation models, and publication-grade validation.",
    highlights: ["Applied AI & operational modeling", "Technical feasibility & prototyping", "Industry & academic research"],
    image: "/hub-4.jpg",
  },
  {
    id: "cloud-architecture",
    title: "Cloud Architecture",
    category: "Cloud & Security",
    description:
      "Resilient multi-cloud infrastructure across AWS, Azure, and GCP using Kubernetes, Infrastructure-as-Code, and FinOps cost optimization.",
    highlights: ["Kubernetes & container orchestration", "Terraform & IaC automation", "Cloud migration & cost tuning"],
    image: "/hub-4.jpg",
  },
  {
    id: "site-reliability-engineer",
    title: "Site Reliability Engineer",
    category: "Cloud & Security",
    description:
      "24/7 production reliability, automated CI/CD delivery pipelines, observability dashboards, and zero-downtime incident engineering for critical infrastructure.",
    highlights: ["SLO/SLA monitoring & alerting", "Automated CI/CD & GitOps", "Incident response & resilience testing"],
    image: "/hub-4.jpg",
  },
]

const CATEGORIES = [
  "All",
  "Engineering & AI",
  "Training & Growth",
  "Cloud & Security",
  "Design & Research",
] as const

interface DeliveredProject {
  id: string
  title: string
  sector: string
  outcome: string
  summary: string
  stack: string[]
  image: string
}

const DELIVERED_PROJECTS: DeliveredProject[] = [
  {
    id: "omnichannel-commerce",
    title: "Omnichannel E-Commerce & Settlement Engine",
    sector: "Retail & FinTech",
    outcome: "+140% Checkout Conversion",
    summary:
      "Engineered a multi-vendor storefront with real-time inventory sync, instant Paystack/Stripe settlement, and automated order tracking.",
    stack: ["Next.js", "FastAPI", "PostgreSQL", "Paystack"],
    image: "/funded.jpg",
  },
  {
    id: "ai-mentor-academy",
    title: "AI-Powered Digital Skills & Mentor Platform",
    sector: "EdTech & Workforce",
    outcome: "3,000+ Learners Trained",
    summary:
      "Built an adaptive learning platform featuring 1-on-1 live mentor booking, project milestones, GitHub repo pre-checks, and AI project interviews.",
    stack: ["TypeScript", "Python", "Groq AI", "Cloud"],
    image: "/ai_mentor.jpg",
  },
  {
    id: "zero-trust-security",
    title: "Enterprise Cloud Hardening & Security Audit",
    sector: "Financial Services",
    outcome: "99.99% Uptime & Zero Breaches",
    summary:
      "Conducted end-to-end penetration testing, RBAC token hardening, automated CI/CD security gates, and SOC-ready observability.",
    stack: ["AWS", "Kubernetes", "Zero-Trust", "VAPT"],
    image: "/hub-4.jpg",
  },
  {
    id: "mobile-field-ops",
    title: "Cross-Platform Mobile Operations Suite",
    sector: "Logistics & Enterprise",
    outcome: "45% Faster Dispatch Cycles",
    summary:
      "Delivered an offline-capable mobile & web operations dashboard connecting field teams, live analytics, and automated executive reporting.",
    stack: ["React Native", "Node.js", "Redis", "Docker"],
    image: "/hub-4.jpg",
  },
]

const PILLAR_CARDS = [
  {
    id: "app-development",
    title: "Mobile & Web Applications",
    description:
      "Bespoke web platforms, mobile apps, and high-converting e-commerce systems engineered with architectural precision.",
    icon: Code2,
    theme: "light" as const,
  },
  {
    id: "corporate-school-training",
    title: "Digital Skill Training",
    description:
      "Practical bootcamps, 1-on-1 mentor coaching, and corporate or school academies built to close real skill gaps.",
    icon: GraduationCap,
    theme: "blue" as const,
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity & Cloud",
    description:
      "Zero-trust audits, penetration testing, and resilient multi-cloud infrastructure engineered for mission-critical uptime.",
    icon: ShieldCheck,
    theme: "navy" as const,
  },
]

const WHATSAPP_URL =
  "https://wa.me/2348172992396?text=Hello%20Rashnotech%2C%20I%20would%20like%20to%20book%20a%20consultation%20for%20your%20services."

function getServiceIcon(id: string) {
  switch (id) {
    case "app-development":
      return Code2
    case "product-design":
      return Palette
    case "project-research":
      return Microscope
    case "ai-automation":
      return Bot
    case "e-commerce":
      return ShoppingBag
    case "site-reliability-engineer":
      return ServerCog
    case "cloud-architecture":
      return Cloud
    case "cybersecurity":
      return ShieldCheck
    case "corporate-school-training":
      return GraduationCap
    default:
      return Layers
  }
}

function RevealSection({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode
  className?: string
  delayMs?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function ServicesPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false)
  const [appointmentMode, setAppointmentMode] = useState<"video" | "call" | "whatsapp">("video")
  const [selectedServiceTitle, setSelectedServiceTitle] = useState("Mobile & Web Applications")
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [projectBrief, setProjectBrief] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredServices =
    selectedCategory === "All"
      ? INITIAL_SERVICES
      : INITIAL_SERVICES.filter((service) => service.category === selectedCategory)

  const openAppointmentModal = (
    mode: "video" | "call" | "whatsapp" = "video",
    serviceTitle?: string
  ) => {
    setAppointmentMode(mode)
    if (serviceTitle) setSelectedServiceTitle(serviceTitle)
    setIsAppointmentOpen(true)
  }

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !clientEmail.trim()) return

    if (appointmentMode === "whatsapp") {
      const msg = encodeURIComponent(
        `Hello Rashnotech, I am ${clientName.trim()} (${clientEmail.trim()}). I'd like to book a WhatsApp consultation for ${selectedServiceTitle}${
          preferredDate ? ` on ${preferredDate}` : ""
        }. ${projectBrief.trim()}`
      )
      window.open(`https://wa.me/2348172992396?text=${msg}`, "_blank", "noopener,noreferrer")
      setIsAppointmentOpen(false)
      toast.success("Opening WhatsApp to confirm your consultation!")
      return
    }

    setIsSubmitting(true)
    try {
      const [firstName, ...rest] = clientName.trim().split(/\s+/)
      const lastName = rest.join(" ") || "-"
      await contactApi.submit({
        first_name: firstName,
        last_name: lastName,
        email: clientEmail.trim(),
        phone: clientPhone.trim() || undefined,
        interest: `${selectedServiceTitle} (${appointmentMode.toUpperCase()} Appointment)`,
        learner_type: "Enterprise / Service Client",
        message: `Preferred Mode: ${appointmentMode.toUpperCase()}\nPreferred Date/Time: ${
          preferredDate || "Flexible"
        }\n\nBrief:\n${projectBrief.trim() || "Requesting consultation."}`,
      })
      toast.success("Appointment request sent! Our team will confirm your slot shortly.")
      setIsAppointmentOpen(false)
      setClientName("")
      setClientEmail("")
      setClientPhone("")
      setPreferredDate("")
      setProjectBrief("")
    } catch {
      toast.error("Could not submit online right now. Opening email/WhatsApp option.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#071c2d] selection:bg-[#2563EB]/20">
      {/* Top Luxury Contact Bar */}
      <div className="bg-[#051320] border-b border-white/10 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a
              href="tel:+2348172992396"
              className="inline-flex items-center gap-1.5 hover:text-[#38bdf8] transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>+234 8172992396</span>
            </a>
            <a
              href="mailto:rashnotech@gmail.com"
              className="inline-flex items-center gap-1.5 hover:text-[#38bdf8] transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>rashnotech@gmail.com</span>
            </a>
            <span className="hidden items-center gap-1.5 md:inline-flex text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-[#38bdf8]" />
              <span>Global Engineering, Security &amp; Digital Skills Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A] px-3 py-1 font-semibold text-white hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => openAppointmentModal("video")}
              className="inline-flex items-center gap-1 rounded-full bg-[#2563EB] px-3.5 py-1 font-semibold text-white hover:bg-[#1D4ED8] transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Video Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/mylogo.png" alt="Rashnotech" className="h-8 w-8 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-[#071c2d]">
              Rashnotech
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-700">
            <Link href="/" className="hover:text-[#2563EB] transition-colors">
              Home
            </Link>
            <Link href="/courses" className="hover:text-[#2563EB] transition-colors">
              Courses
            </Link>
            <Link href="/services" className="text-[#2563EB]">
              Services
            </Link>
            <Link href="/internship" className="hover:text-[#2563EB] transition-colors">
              Internship
            </Link>
            <Link href="/contact" className="hover:text-[#2563EB] transition-colors">
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              type="button"
              onClick={() => openAppointmentModal("video")}
              className="rounded-full bg-[#071c2d] hover:bg-[#2563EB] text-white px-5 text-xs font-bold tracking-wide transition-colors"
            >
              Book Appointment
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 text-sm font-semibold">
            <Link href="/" className="block py-1.5 text-slate-700">Home</Link>
            <Link href="/courses" className="block py-1.5 text-slate-700">Courses</Link>
            <Link href="/services" className="block py-1.5 text-[#2563EB]">Services</Link>
            <Link href="/internship" className="block py-1.5 text-slate-700">Internship</Link>
            <Link href="/contact" className="block py-1.5 text-slate-700">Contact</Link>
            <Button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                openAppointmentModal("video")
              }}
              className="w-full rounded-xl bg-[#2563EB] text-white"
            >
              Book Appointment
            </Button>
          </div>
        )}
      </header>

      {/* Architectural Luxury Hero Section */}
      <section className="relative overflow-hidden bg-[#071c2d] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Editorial Copy */}
            <div className="lg:col-span-7 space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-sky-200">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>Elevate Your Brand With Us · Empowering Your Success with Digital Expertise</span>
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight leading-[1.08] sm:text-5xl lg:text-[52px]">
                Engineering{" "}
                <span className="text-[#38bdf8]">Excellence</span>
                <br />
                For Modern Enterprises
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300">
                From high-converting E-Commerce and Mobile &amp; Web Applications to enterprise
                Cybersecurity, Cloud Architecture, and Digital Skill Training—we craft resilient
                systems built to outlast market shifts.
              </p>

              {/* Direct Appointment & Contact Action Trio: Video, Call, WhatsApp */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => openAppointmentModal("video")}
                  className="rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-6 text-sm font-bold shadow-lg transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Book Video Appointment
                </Button>

                <a
                  href="tel:+2348172992396"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Phone className="h-4 w-4 text-[#38bdf8]" />
                  <span>Call Us</span>
                </a>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#16A34A] px-5 py-3 text-sm font-bold text-white hover:bg-green-700 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Architectural Framed Media */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-white/15 bg-[#0c263c] p-3 shadow-2xl">
                <div className="relative h-[320px] sm:h-[380px] overflow-hidden rounded-2xl">
                  <img
                    src="/ai_mentor.jpg"
                    alt="Rashnotech Engineering & Mentorship Leadership"
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-[#071c2d]/90 px-5 py-4 border-t border-white/10">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#38bdf8]">
                      Precision Delivery
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      Software Engineering · Cybersecurity · Skill Academies
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Card Signature Pillars (White / Royal Blue / Deep Navy matching uploaded layout) */}
      <section className="border-b border-slate-200/80 bg-[#f4f7fb] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2563EB]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Our Approach
                </span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#071c2d] sm:text-4xl">
                  Essential capabilities for modern digital growth
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-slate-600">
                Every engagement combines architectural discipline, measurable outcomes, and
                transparent delivery milestones from discovery to production.
              </p>
            </div>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-3">
            {PILLAR_CARDS.map((card, idx) => {
              const Icon = card.icon
              const isBlue = card.theme === "blue"
              const isNavy = card.theme === "navy"
              return (
                <RevealSection key={card.id} delayMs={idx * 90}>
                  <div
                    className={`group h-full rounded-[24px] p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl ${
                      isBlue
                        ? "bg-[#2563EB] text-white"
                        : isNavy
                        ? "bg-[#071c2d] text-white"
                        : "bg-white text-[#071c2d] border border-slate-200"
                    }`}
                  >
                    <div>
                      <div
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-6 ${
                          isBlue
                            ? "bg-white/15 text-white"
                            : isNavy
                            ? "bg-white/10 text-[#38bdf8]"
                            : "bg-blue-50 text-[#2563EB]"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight mb-3">{card.title}</h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          isBlue
                            ? "text-blue-100"
                            : isNavy
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        {card.description}
                      </p>
                    </div>

                    <div className="mt-8 pt-4">
                      <button
                        type="button"
                        onClick={() => openAppointmentModal("video", card.title)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                          isBlue
                            ? "bg-white text-[#2563EB] hover:bg-blue-50"
                            : isNavy
                            ? "bg-[#2563EB] text-white hover:bg-blue-600"
                            : "bg-[#071c2d] text-white hover:bg-[#2563EB]"
                        }`}
                      >
                        <span>Book Consultation</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </RevealSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Company Profile, Trust & Achievements ("Who We Are" Bento Grid) */}
      <section className="border-b border-slate-200/80 bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Achievement Bento */}
            <RevealSection className="lg:col-span-6">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 h-56 sm:h-64 overflow-hidden rounded-3xl border border-slate-200">
                  <img
                    src="/hub-4.jpg"
                    alt="Rashnotech Innovation & Collaboration Hub"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="col-span-5 rounded-3xl bg-[#2563EB] p-6 text-white flex flex-col justify-between">
                  <CheckCircle2 className="h-7 w-7 text-blue-100" />
                  <div className="mt-6">
                    <div className="text-3xl sm:text-4xl font-black tracking-tight">3K+</div>
                    <p className="text-xs font-medium text-blue-100 mt-1">
                      Projects &amp; Graduates Delivered
                    </p>
                  </div>
                </div>

                <div className="col-span-7 h-44 overflow-hidden rounded-3xl border border-slate-200">
                  <img
                    src="/funded.jpg"
                    alt="Rashnotech Engineering Team"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </RevealSection>

            {/* Right Story & Trust Profile */}
            <RevealSection className="lg:col-span-6 space-y-6" delayMs={120}>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2563EB]">
                <Sparkles className="h-3.5 w-3.5" />
                Who We Are
              </span>

              <h2 className="text-3xl font-extrabold tracking-tight leading-[1.15] text-[#071c2d] sm:text-4xl">
                Built on Precision. Striving for Excellence in Everything We Deliver.
              </h2>

              <p className="text-base leading-relaxed text-slate-600">
                Rashnotech is a technology engineering, security, and talent-development firm
                trusted by startups, schools, and growing enterprises. Whether we are launching an
                e-commerce marketplace, hardening cloud infrastructure, or training teams in modern
                digital skills, our standard is simple: measurable excellence.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                  <div className="flex items-center gap-1 text-amber-400 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <div className="text-2xl font-black text-[#071c2d]">
                    4.9<span className="text-sm font-semibold text-slate-400"> / 5.0</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Average client &amp; partner rating</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#071c2d] mb-2.5">
                    Core Specialties
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["E-Commerce", "Mobile & Web", "Cybersecurity", "AI & Cloud", "Skill Training"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button
                  type="button"
                  onClick={() => openAppointmentModal("video")}
                  className="rounded-full bg-[#071c2d] hover:bg-[#2563EB] text-white px-6 py-5 text-xs font-bold"
                >
                  <Video className="mr-2 h-4 w-4" />
                  Schedule Video Briefing
                </Button>
                <div className="flex items-center gap-2.5">
                  <img
                    src="/ai_mentor.jpg"
                    alt="Abdulrasheed Aliyu"
                    className="h-10 w-10 rounded-full object-cover object-top border border-slate-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#071c2d]">Abdulrasheed Aliyu</p>
                    <p className="text-[11px] text-slate-500">Founder &amp; Lead Architect</p>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Complete Filterable Services Catalog */}
      <section className="border-b border-slate-200/80 bg-[#f8fafc] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#2563EB]">
                  Our Services
                </span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#071c2d] sm:text-4xl">
                  End-to-End Digital Solutions &amp; Training
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const active = selectedCategory === category
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                        active
                          ? "bg-[#071c2d] text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-[#2563EB]"
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            </div>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, idx) => {
              const Icon = getServiceIcon(service.id)
              return (
                <RevealSection key={service.id} delayMs={(idx % 3) * 70}>
                  <article className="group h-full rounded-3xl border border-slate-200 bg-white p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-[#2563EB] hover:shadow-lg">
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071c2d] text-white group-hover:bg-[#2563EB] transition-colors">
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                          {service.category}
                        </span>
                      </div>

                      <h3 className="text-lg font-extrabold text-[#071c2d] mb-2">
                        {service.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-5">
                        {service.description}
                      </p>

                      <ul className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-700">
                        {service.highlights.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openAppointmentModal("video", service.title)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-[#071c2d]"
                      >
                        <span>Book This Service</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#16A34A] hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </article>
                </RevealSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Delivered Projects Showcase */}
      <section id="our-services" className="relative overflow-hidden bg-[#070b14] border-b border-slate-200/80 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#38bdf8]">
                  Boost Your Brand with Our Expertise
                </span>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Selected Projects &amp; Client Impact
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-300 leading-relaxed">
                Real systems shipped across commerce, enterprise security, mobile operations, and
                workforce training.
              </p>
            </div>
          </RevealSection>

          <div className="grid gap-6 md:grid-cols-2">
            {DELIVERED_PROJECTS.map((proj, idx) => (
              <RevealSection key={proj.id} delayMs={idx * 80}>
                <article className="group rounded-3xl border border-white/10 bg-[#0c2438] overflow-hidden flex flex-col sm:flex-row transition-all duration-300 hover:border-[#38bdf8]/50">
                  <div className="relative h-52 sm:h-auto sm:w-48 shrink-0 overflow-hidden bg-slate-900">
                    <img
                      src={proj.image}
                      alt={proj.title}
                      className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                          {proj.sector}
                        </span>
                        <span className="rounded-full bg-[#16A34A] px-2.5 py-0.5 text-[11px] font-bold text-white">
                          {proj.outcome}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{proj.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed mb-4">{proj.summary}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
                      {proj.stack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final Direct Appointment Banner */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#2563EB] p-8 sm:p-12 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ready to Start Your Project or Training Programme?
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Choose how you want to connect—book a live video consultation, call our team
                directly, or message us on WhatsApp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                type="button"
                onClick={() => openAppointmentModal("video")}
                className="rounded-full bg-white text-[#2563EB] hover:bg-blue-50 font-bold px-5"
              >
                <Video className="mr-2 h-4 w-4" />
                Video Call
              </Button>
              <a
                href="tel:+2348172992396"
                className="inline-flex items-center gap-2 rounded-full bg-[#071c2d] px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-900"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#16A34A] px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter />

      {/* Floating Quick-Appointment Dock (WhatsApp, Call, Video) */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          title="Chat on WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-lg hover:bg-green-700 transition-transform hover:scale-105"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <a
          href="tel:+2348172992396"
          aria-label="Call Rashnotech"
          title="Call Rashnotech"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#071c2d] text-white shadow-lg hover:bg-slate-800 transition-transform hover:scale-105"
        >
          <Phone className="h-5 w-5" />
        </a>
        <button
          type="button"
          onClick={() => openAppointmentModal("video")}
          aria-label="Book Video Appointment"
          title="Book Video Appointment"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg hover:bg-[#1D4ED8] transition-transform hover:scale-105"
        >
          <Video className="h-5 w-5" />
        </button>
      </div>

      {/* Interactive Book Appointment Modal */}
      <Dialog open={isAppointmentOpen} onOpenChange={setIsAppointmentOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#071c2d]">
              <Calendar className="h-5 w-5 text-[#2563EB]" />
              Book an Appointment
            </DialogTitle>
            <DialogDescription>
              Pick Video Call, Phone Call, or WhatsApp and share your project or training goals.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAppointmentSubmit} className="space-y-4 py-1">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "video", label: "Video Call", icon: Video },
                  { id: "call", label: "Phone Call", icon: Phone },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                ] as const
              ).map((m) => {
                const ModeIcon = m.icon
                const active = appointmentMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAppointmentMode(m.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                      active
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <ModeIcon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service *</label>
              <select
                value={selectedServiceTitle}
                onChange={(e) => setSelectedServiceTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {INITIAL_SERVICES.map((s) => (
                  <option key={s.id} value={s.title}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project or Training Brief
              </label>
              <textarea
                rows={3}
                value={projectBrief}
                onChange={(e) => setProjectBrief(e.target.value)}
                placeholder="Tell us about your app, e-commerce store, security audit, or team training..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAppointmentOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : appointmentMode === "whatsapp" ? (
                  "Continue on WhatsApp"
                ) : (
                  "Confirm Appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
