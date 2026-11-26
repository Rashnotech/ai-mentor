"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Cpu,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  Menu,
  MessageCircle,
  Microscope,
  Palette,
  Phone,
  Quote,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  X,
  Zap,
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

const VALUE_PILLARS = [
  {
    title: "Cost-Effectiveness",
    description: "Predictable sprint pricing and lean cloud architecture that eliminate wasted engineering spend.",
    icon: TrendingUp,
  },
  {
    title: "Innovative Technology",
    description: "Production AI automation, modern web frameworks, and resilient DevOps tailored to your roadmap.",
    icon: Cpu,
  },
  {
    title: "Industry Expertise",
    description: "Proven delivery across E-Commerce, FinTech, EdTech, Cybersecurity, and corporate skill academies.",
    icon: Award,
  },
  {
    title: "Built-in Scalability",
    description: "Systems engineered from day one to scale from first launch to hundreds of thousands of users.",
    icon: Zap,
  },
]

const INDUSTRIES = [
  { name: "E-Commerce & Retail", image: "/funded.jpg" },
  { name: "EdTech & Schools", image: "/ai_mentor.jpg" },
  { name: "FinTech & Payments", image: "/hub-4.jpg" },
  { name: "Logistics & Field Ops", image: "/funded.jpg" },
  { name: "Corporate Enterprise", image: "/ai_mentor.jpg" },
  { name: "SaaS & AI Startups", image: "/hub-4.jpg" },
]

const CAPABILITY_TABS = [
  {
    id: "challenges",
    label: "Your IT Challenges",
    cards: [
      {
        title: "Legacy Systems & Slow Releases",
        description:
          "Modernize monolithic codebases into fast, modular Next.js, FastAPI, and cloud-native services with automated CI/CD.",
        icon: Code2,
      },
      {
        title: "Security Gaps & Downtime",
        description:
          "Eliminate vulnerabilities with VAPT audits, zero-trust auth, and 24/7 SRE observability before incidents happen.",
        icon: ShieldCheck,
      },
      {
        title: "Digital Skill Shortages",
        description:
          "Upskill your workforce or students with structured corporate bootcamps, school academies, and 1-on-1 mentor coaching.",
        icon: GraduationCap,
      },
    ],
  },
  {
    id: "stack",
    label: "Our Tech Stack",
    cards: [
      {
        title: "Mobile, Web & E-Commerce",
        description:
          "Next.js, React Native, TypeScript, Paystack/Stripe settlement, and edge-cached storefronts built for conversion.",
        icon: ShoppingBag,
      },
      {
        title: "AI Automation & Research",
        description:
          "Custom LLM workflows, autonomous agents, RAG pipelines, and applied data modeling validated against real metrics.",
        icon: Bot,
      },
      {
        title: "Cloud & Reliability",
        description:
          "AWS, Azure, GCP, Kubernetes, Terraform, and automated incident alerting engineered for 99.99% availability.",
        icon: Cloud,
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Model",
    cards: [
      {
        title: "Weekly Live Demos",
        description:
          "Every sprint ships testable staging builds so your stakeholders see real progress every week, not slides.",
        icon: Video,
      },
      {
        title: "Direct Mentor & Lead Access",
        description:
          "Work directly with senior architects via WhatsApp, scheduled video calls, and dedicated Slack/GitHub channels.",
        icon: Users,
      },
      {
        title: "Documentation & Handover",
        description:
          "Clean source code, automated test suites, runbooks, and team training so you own your platform with confidence.",
        icon: Layers,
      },
    ],
  },
] as const

const TESTIMONIALS = [
  {
    quote:
      "Rashnotech rebuilt our e-commerce and settlement pipeline from scratch. Checkout speed doubled, and their security hardening gave our enterprise partners complete confidence.",
    author: "Adebayo Ogunleye",
    role: "Head of Digital Operations, Lagos",
  },
  {
    quote:
      "Their Corporate & School Digital Skill Training transformed how our engineering and product teams ship software. Having 1-on-1 mentor access made every concept stick.",
    author: "Chidinma Nwosu",
    role: "Director of Learning & Talent, Abuja",
  },
  {
    quote:
      "From UI/UX prototyping to AWS Kubernetes deployment and 24/7 SRE monitoring, Rashnotech delivered like an embedded senior engineering department.",
    author: "Ibrahim Musa",
    role: "Founder & CTO, FinTech Partner",
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
  direction = "up",
}: {
  children: React.ReactNode
  className?: string
  delayMs?: number
  direction?: "up" | "left" | "right" | "scale"
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
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const hiddenTransform =
    direction === "left"
      ? "opacity-0 -translate-x-6"
      : direction === "right"
        ? "opacity-0 translate-x-6"
        : direction === "scale"
          ? "opacity-0 scale-95"
          : "opacity-0 translate-y-6"

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        visible ? "opacity-100 translate-x-0 translate-y-0 scale-100" : hiddenTransform
      } ${className}`}
    >
      {children}
    </div>
  )
}

function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [count, setCount] = useState(target)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      setCount(target)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 900
          const start = performance.now()
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(target * eased))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function ServicesPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [activeCapTab, setActiveCapTab] = useState<(typeof CAPABILITY_TABS)[number]["id"]>("challenges")
  const [testimonialIndex, setTestimonialIndex] = useState(0)

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

  const activeTabData =
    CAPABILITY_TABS.find((t) => t.id === activeCapTab) ?? CAPABILITY_TABS[0]

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
      toast.error("Could not submit online right now. Please try WhatsApp or phone.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#071c2d] selection:bg-[#2563EB]/20">
      <style jsx global>{`
        @keyframes rashno-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes rashno-dot-pulse {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        .animate-rashno-float {
          animation: rashno-float 4.5s ease-in-out infinite;
        }
        .animate-rashno-dot {
          animation: rashno-dot-pulse 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-rashno-float,
          .animate-rashno-dot {
            animation: none;
          }
        }
      `}</style>

      {/* Clean Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <img
              src="/mylogo.png"
              alt="Rashnotech Logo"
              className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-[#071c2d]">
                Rashnotech
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563EB]">
                Engineering &amp; Academy
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <Link href="/" className="hover:text-[#2563EB] transition-colors">
              Home
            </Link>
            <a href="#solutions" className="hover:text-[#2563EB] transition-colors">
              Solutions
            </a>
            <a href="#industries" className="hover:text-[#2563EB] transition-colors">
              Industries
            </a>
            <a href="#our-services" className="hover:text-[#2563EB] transition-colors">
              Projects
            </a>
            <a href="#partner-form" className="hover:text-[#2563EB] transition-colors">
              Contact
            </a>
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="text-right leading-tight">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Client Support
              </span>
              <a
                href="tel:+2348172992396"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#071c2d] hover:text-[#2563EB] transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>+234 8172992396</span>
              </a>
            </div>
            <button
              type="button"
              onClick={() => openAppointmentModal("video")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Book Video Appointment</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-[#071c2d] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3 text-sm font-semibold text-[#071c2d]">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)}>
                Solutions
              </a>
              <a href="#industries" onClick={() => setMobileMenuOpen(false)}>
                Industries
              </a>
              <a href="#our-services" onClick={() => setMobileMenuOpen(false)}>
                Projects
              </a>
              <a href="#partner-form" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </a>
              <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <a
                  href="tel:+2348172992396"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#071c2d]"
                >
                  <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                  +234 8172992396
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-2 text-xs font-bold text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openAppointmentModal("video")
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-bold text-white"
                >
                  <Video className="h-3.5 w-3.5" />
                  Book Video Appointment
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 1. Editorial Split Hero (White background + Framed Team Picture Section) */}
      <section className="relative overflow-hidden bg-white pt-10 pb-14 lg:pt-14 lg:pb-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6">
            <RevealSection delayMs={0}>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-[#eff6ff] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#2563EB]">
                <span className="h-2 w-2 rounded-full bg-[#2563EB] animate-ping motion-reduce:animate-none" />
                <span>Elevate Your Brand With Us</span>
              </div>
            </RevealSection>

            <RevealSection delayMs={80}>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#071c2d] sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                We engineer your IT, so you can scale your business.
              </h1>
            </RevealSection>

            <RevealSection delayMs={150}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Empowering Your Success with Digital Expertise. From E-Commerce, Mobile &amp; Web
                Applications, and Cybersecurity to Digital Skill Training, Rashnotech builds and
                secures the technology behind ambitious organizations.
              </p>
            </RevealSection>

            <RevealSection delayMs={220}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openAppointmentModal("video")}
                  className="group inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                >
                  <Video className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>Book Video Appointment</span>
                </button>

                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700 active:scale-[0.97] transition-all duration-200"
                >
                  <MessageCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6" />
                  <span>WhatsApp Us</span>
                </a>

                <a
                  href="tel:+2348172992396"
                  className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#071c2d] hover:border-[#2563EB] hover:text-[#2563EB] active:scale-[0.97] transition-all duration-200"
                >
                  <Phone className="h-4 w-4 text-[#2563EB]" />
                  <span>Call Us</span>
                </a>
              </div>
            </RevealSection>
          </div>

          <div className="lg:col-span-6">
            <RevealSection direction="right" delayMs={120}>
              <div className="relative">
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-lg">
                  <img
                    src="/hub-4.jpg"
                    alt="Rashnotech engineering and digital consulting team"
                    className="h-[320px] w-full object-cover sm:h-[400px] transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Floating live card with subtle motion */}
                <div className="animate-rashno-float absolute -bottom-5 left-4 sm:left-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563EB]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#071c2d]">
                        99.99% Uptime &amp; 1-on-1 Mentors
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        Direct Video, Call &amp; WhatsApp Support
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* 2. Metrics / Trust Bar */}
      <section className="border-y border-slate-200 bg-white py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 md:grid-cols-5 lg:px-8">
          <div className="col-span-2 md:col-span-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-amber-400">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} className="h-4 w-4 fill-amber-400" />
              ))}
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-[#071c2d]">4.9 / 5.0 Rating</p>
            <p className="text-xs text-slate-500">Verified Client Reviews</p>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <p className="text-2xl font-extrabold text-[#071c2d]">
              <AnimatedCounter target={10} suffix="+" />
            </p>
            <p className="text-xs font-medium text-slate-500">Years Engineering Experience</p>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <p className="text-2xl font-extrabold text-[#071c2d]">
              <AnimatedCounter target={98} suffix="%" />
            </p>
            <p className="text-xs font-medium text-slate-500">Client Retention Rate</p>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <p className="text-2xl font-extrabold text-[#071c2d]">
              <AnimatedCounter target={3000} suffix="+" />
            </p>
            <p className="text-xs font-medium text-slate-500">Projects &amp; Learners Trained</p>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <p className="text-2xl font-extrabold text-[#071c2d]">24/7</p>
            <p className="text-xs font-medium text-slate-500">SRE &amp; Security Response</p>
          </div>
        </div>
      </section>

      {/* 3. Dark "What We Do" Architectural Banner + 4-Column Value Strip */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="relative overflow-hidden rounded-2xl bg-[#071c2d] px-6 py-10 text-white sm:px-10 sm:py-12">
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <span className="inline-block rounded bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
                    What We Do
                  </span>
                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Simplifying IT &amp; digital growth for a complex world.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                    Led by Abdulrasheed Aliyu, Rashnotech unifies full-stack product engineering,
                    enterprise cybersecurity, and hands-on digital skill training under one roof.
                  </p>
                </div>

                {/* Animated geometric dot matrix */}
                <div className="hidden lg:col-span-5 lg:flex lg:justify-end">
                  <div className="grid grid-cols-7 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                    {Array.from({ length: 28 }).map((_, idx) => (
                      <span
                        key={idx}
                        style={{ animationDelay: `${(idx % 7) * 180}ms` }}
                        className={`h-2.5 w-2.5 rounded-full animate-rashno-dot ${
                          idx % 3 === 0
                            ? "bg-[#38bdf8]"
                            : idx % 2 === 0
                              ? "bg-[#2563EB]"
                              : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon
              return (
                <RevealSection key={pillar.title} delayMs={idx * 70}>
                  <div className="group rounded-xl border border-slate-100 bg-white p-5 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563EB] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#2563EB] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-extrabold text-[#071c2d]">{pillar.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {pillar.description}
                    </p>
                  </div>
                </RevealSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. Solutions / Services Grid (Soft Ice-Blue Band matching Reference) */}
      <section id="solutions" className="bg-[#eff6ff] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <span className="inline-block rounded bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
                  How We Do It
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#071c2d] sm:text-4xl">
                  Solutions
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
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                        active
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-blue-100/70 hover:text-[#071c2d]"
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            </div>
          </RevealSection>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, idx) => {
              const Icon = getServiceIcon(service.id)
              return (
                <RevealSection key={service.id} delayMs={(idx % 3) * 75}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm hover:-translate-y-1.5 hover:border-[#2563EB] hover:shadow-lg transition-all duration-300">
                    {/* Picture section inside each service card */}
                    <div className="relative h-40 overflow-hidden bg-slate-100">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-[#071c2d]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        {service.category}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563EB] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#2563EB] group-hover:text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-extrabold text-[#071c2d] leading-snug">
                          {service.title}
                        </h3>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {service.description}
                      </p>

                      <ul className="mt-4 space-y-1.5">
                        {service.highlights.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 text-xs font-medium text-slate-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto pt-5">
                        <button
                          type="button"
                          onClick={() => openAppointmentModal("video", service.title)}
                          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2563EB] hover:text-[#1d4ed8] cursor-pointer"
                        >
                          <span>Learn more &amp; Book</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </RevealSection>
              )
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => openAppointmentModal("video")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-[0.97] transition-all duration-200 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Schedule a Strategy Session</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Industries Strip with Circular Picture Thumbnails */}
      <section id="industries" className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            <span className="inline-block rounded bg-[#eff6ff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2563EB]">
              Who We Serve
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#071c2d] sm:text-4xl">
              Solving digital challenges in every industry, every day.
            </h2>
          </RevealSection>

          <RevealSection delayMs={100}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.name}
                  type="button"
                  onClick={() => openAppointmentModal("video", industry.name)}
                  className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-[#f8fafc] py-2 pr-5 pl-2 text-xs font-bold text-[#071c2d] hover:-translate-y-0.5 hover:border-[#2563EB] hover:bg-white hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={industry.image}
                    alt={industry.name}
                    className="h-8 w-8 rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <span>{industry.name}</span>
                </button>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* 6. Dark Interactive Capabilities Switcher */}
      <section className="bg-[#071c2d] py-16 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="text-center">
              <span className="inline-block rounded bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
                How We Deliver
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Bringing the best engineering &amp; talent to you.
              </h2>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1.5">
                {CAPABILITY_TABS.map((tab) => {
                  const active = activeCapTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCapTab(tab.id)}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                        active
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </RevealSection>

          <div
            key={activeTabData.id}
            className="mt-10 grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {activeTabData.cards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 hover:-translate-y-1 hover:border-[#38bdf8]/50 hover:bg-white/[0.06] transition-all duration-300"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2563EB]/20 text-[#38bdf8] transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{card.description}</p>
                  <button
                    type="button"
                    onClick={() => openAppointmentModal("video", card.title)}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:text-white cursor-pointer"
                  >
                    <span>Discuss this with us</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 7. Delivered Projects / Success Stories (Preserves #our-services contract) */}
      <section id="our-services" className="relative overflow-hidden bg-[#070b14] py-16 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="inline-block rounded bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
                  Success Stories &amp; Projects
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Boost Your Brand with Our Expertise
                </h2>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#38bdf8] hover:text-white transition-colors"
              >
                <span>Request a Custom Case Study</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </RevealSection>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {DELIVERED_PROJECTS.map((project, idx) => (
              <RevealSection key={project.id} delayMs={idx * 80}>
                <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1526] hover:-translate-y-1.5 hover:border-[#2563EB] transition-all duration-300">
                  <div className="relative h-44 overflow-hidden bg-[#071c2d]">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3 rounded-full bg-[#2563EB] px-3 py-1 text-[10px] font-bold text-white">
                      {project.outcome}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                      {project.sector}
                    </span>
                    <h3 className="mt-1.5 text-base font-extrabold text-white leading-snug">
                      {project.title}
                    </h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                      {project.summary}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {project.stack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAppointmentModal("video", project.title)}
                      className="mt-auto pt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:text-white cursor-pointer"
                    >
                      <span>Build something similar</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </button>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Client Testimonial Carousel */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563EB]">
              <Quote className="h-6 w-6" />
            </div>

            <div key={testimonialIndex} className="mt-6 animate-in fade-in duration-300">
              <p className="text-xl font-bold leading-relaxed text-[#071c2d] sm:text-2xl">
                &ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;
              </p>
              <p className="mt-5 text-sm font-extrabold text-[#071c2d]">
                {TESTIMONIALS[testimonialIndex].author}
              </p>
              <p className="text-xs font-medium text-slate-500">
                {TESTIMONIALS[testimonialIndex].role}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={() =>
                  setTestimonialIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB] active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {TESTIMONIALS.map((t, i) => (
                  <button
                    key={t.author}
                    type="button"
                    aria-label={`View testimonial ${i + 1}`}
                    onClick={() => setTestimonialIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      i === testimonialIndex ? "w-6 bg-[#2563EB]" : "w-2 bg-slate-300"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next testimonial"
                onClick={() => setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB] active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* 9. Partner With Us / Consultation & Floating White Form (Split Dark + Soft Blue) */}
      <section id="partner-form" className="bg-[#eff6ff]">
        <div className="bg-[#071c2d] py-12 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <span className="inline-block rounded bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#38bdf8]">
              Contact Us
            </span>
            <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Partner with Us for Comprehensive IT &amp; Digital Growth
            </h2>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-sm leading-relaxed text-slate-700">
              We are ready to architect your next mobile or web product, launch your e-commerce
              platform, harden your cybersecurity, or train your engineering team.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="tel:+2348172992396"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#071c2d] shadow-sm hover:text-[#2563EB] transition-colors"
              >
                <Phone className="h-4 w-4 text-[#2563EB]" />
                <span>+234 8172992396</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Chat</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-semibold text-slate-700">
              {[
                "E-Commerce & Payments",
                "Mobile & Web Apps",
                "Digital Skill Training",
                "Cybersecurity & VAPT",
                "Cloud & SRE",
                "AI Automation",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-blue-200 pt-6">
              <p className="text-sm font-extrabold text-[#071c2d]">What happens next?</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { step: "1", text: "Share your project goals or training needs" },
                  { step: "2", text: "Join a 30-min Video or Call discovery session" },
                  { step: "3", text: "Receive a clear roadmap, timeline & proposal" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#2563EB] shadow-sm">
                      {item.step}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:-mt-28">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
              <h3 className="text-xl font-extrabold text-[#071c2d]">
                Schedule a Free Consultation
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Choose Video Appointment, Phone Call, or WhatsApp and we will confirm promptly.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "video", label: "Video Call", icon: Video },
                    { id: "call", label: "Phone Call", icon: Phone },
                    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  ] as const
                ).map((mode) => {
                  const Icon = mode.icon
                  const active = appointmentMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAppointmentMode(mode.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "border-[#2563EB] bg-[#eff6ff] text-[#2563EB]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  )
                })}
              </div>

              <form onSubmit={handleAppointmentSubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#071c2d]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#071c2d] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#071c2d]">Work Email</label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#071c2d] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#071c2d]">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#071c2d] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#071c2d]">
                      Service Needed
                    </label>
                    <select
                      value={selectedServiceTitle}
                      onChange={(e) => setSelectedServiceTitle(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#071c2d] focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="Mobile & Web Applications">Mobile &amp; Web Applications</option>
                      <option value="E-Commerce">E-Commerce</option>
                      <option value="Digital Skill Training">Digital Skill Training</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="AI Automation">AI Automation</option>
                      <option value="Cloud Architecture">Cloud Architecture</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#071c2d]">
                    Project Brief
                  </label>
                  <textarea
                    rows={3}
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    placeholder="Tell us about your goals, timeline, or team size..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#071c2d] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {appointmentMode === "whatsapp"
                          ? "Continue on WhatsApp"
                          : "Book Consultation"}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter />

      {/* Floating WhatsApp / Call / Video Dock */}
      <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-2 sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={() => openAppointmentModal("video")}
          aria-label="Book Video Appointment"
          className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-[#1d4ed8] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">Book Video</span>
        </button>
        <a
          href="tel:+2348172992396"
          aria-label="Call Rashnotech"
          className="inline-flex items-center gap-2 rounded-full bg-[#071c2d] px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
        >
          <Phone className="h-4 w-4 text-[#38bdf8]" />
          <span className="hidden sm:inline">Call Us</span>
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="inline-flex items-center gap-2 rounded-full bg-[#16A34A] px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-green-700 hover:scale-105 active:scale-95 transition-all"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>

      {/* Interactive Appointment Modal */}
      <Dialog open={isAppointmentOpen} onOpenChange={setIsAppointmentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#071c2d]">
              Book an Appointment with Rashnotech
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Schedule a Video session, Phone Call, or WhatsApp consultation for{" "}
              <span className="font-bold text-[#2563EB]">{selectedServiceTitle}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAppointmentSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "video", label: "Video Call", icon: Video },
                  { id: "call", label: "Phone Call", icon: Phone },
                  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon
                const active = appointmentMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setAppointmentMode(mode.id)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "border-[#2563EB] bg-[#eff6ff] text-[#2563EB]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{mode.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#071c2d]">Full Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#071c2d]">Email</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#071c2d]">
                  Preferred Date &amp; Time
                </label>
                <input
                  type="text"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  placeholder="e.g. Tomorrow 2:00 PM WAT"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#071c2d]">Phone</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#071c2d]">Project Brief</label>
              <textarea
                rows={3}
                value={projectBrief}
                onChange={(e) => setProjectBrief(e.target.value)}
                placeholder="Briefly describe your goals or training needs..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAppointmentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              >
                {isSubmitting ? "Sending..." : "Confirm Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
