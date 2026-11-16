"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Cloud,
  Code2,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Menu,
  Microscope,
  Palette,
  Phone,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react"
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
    title: "App Development",
    category: "Engineering & AI",
    description:
      "Full-cycle web and mobile application engineering built for speed, reliability, and seamless user journeys across iOS, Android, and modern web platforms.",
    highlights: ["Cross-platform mobile & web apps", "Scalable APIs & microservices", "Performance-first architecture"],
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
    image: "/bg_hero.png",
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
    id: "e-commerce",
    title: "E-Commerce",
    category: "Engineering & AI",
    description:
      "High-converting digital storefronts, multi-currency payment integrations, inventory engines, and omnichannel checkout experiences tailored for growth.",
    highlights: ["Custom storefronts & marketplaces", "Payment & logistics integration", "Conversion rate optimization"],
    image: "/funded.jpg",
  },
  {
    id: "site-reliability-engineer",
    title: "Site Reliability Engineer",
    category: "Cloud & Security",
    description:
      "24/7 production reliability, automated CI/CD delivery pipelines, observability dashboards, and zero-downtime incident engineering for critical infrastructure.",
    highlights: ["SLO/SLA monitoring & alerting", "Automated CI/CD & GitOps", "Incident response & resilience testing"],
    image: "/bg_hero.png",
  },
  {
    id: "cloud-architecture",
    title: "Cloud Architecture",
    category: "Cloud & Security",
    description:
      "Sovereign and resilient multi-cloud infrastructure across AWS, Azure, and GCP using Kubernetes, Infrastructure-as-Code, and FinOps cost optimization.",
    highlights: ["Kubernetes & container orchestration", "Terraform & IaC automation", "Cloud migration & cost tuning"],
    image: "/hub-4.jpg",
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
    id: "corporate-school-training",
    title: "Corporate & School Training",
    category: "Training & Growth",
    description:
      "Tailored corporate upskilling bootcamps, executive AI workshops, and practical school STEM, coding, and engineering programmes for institutions and enterprise teams.",
    highlights: ["Corporate engineering & AI bootcamps", "School coding & STEM academies", "Custom curriculum & mentorship"],
    image: "/bg_hero.png",
  },
]

const CATEGORIES = [
  "All",
  "Engineering & AI",
  "Design & Research",
  "Cloud & Security",
  "Training & Growth",
] as const

const CAPABILITY_METRICS = [
  { label: "Software Engineering, App Development & AI Automation", percent: 95 },
  { label: "Product Design, Project Research & Operational Intelligence", percent: 90 },
  { label: "Cloud Architecture, SRE, Cybersecurity & Training", percent: 92 },
]

const IMPACT_STATS = [
  { value: "3k+", label: "Successful Projects" },
  { value: "200+", label: "Expert Team" },
  { value: "350+", label: "Happy Customers" },
  { value: "16+", label: "Years of Experience" },
]

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

export default function ServicesPageClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [activeServiceId, setActiveServiceId] = useState<string>("product-design")

  const filteredServices =
    selectedCategory === "All"
      ? INITIAL_SERVICES
      : INITIAL_SERVICES.filter((service) => service.category === selectedCategory)

  return (
    <div className="min-h-screen bg-[#f4f7fb] font-sans text-[#071c2d] selection:bg-blue-600/20">
      {/* Top Brand Contact Strip */}
      <div className="relative overflow-hidden bg-[#071c2d] text-xs text-slate-200">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="tel:+2348172992396" className="inline-flex items-center gap-1.5 hover:text-sky-300">
              <Phone className="h-3.5 w-3.5 text-sky-400" />
              <span>+234 8172992396</span>
            </a>
            <a href="mailto:rashnotech@gmail.com" className="inline-flex items-center gap-1.5 hover:text-sky-300">
              <Mail className="h-3.5 w-3.5 text-sky-400" />
              <span>rashnotech@gmail.com</span>
            </a>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              <span>Global Digital Innovation &amp; Research Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-full bg-[#1d4ed8] px-4 py-1 font-bold text-white shadow-sm">
            <span>Enterprise, Research &amp; Institutional Solutions</span>
            <Link href="/contact" className="inline-flex items-center gap-1 text-sky-200 underline hover:text-white">
              <span>Book a Call</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-lg bg-[#1d4ed8] p-1.5 shadow-sm">
              <img src="/mylogo.png" className="h-6 w-6" alt="Rashnotech" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#071c2d]">Rashnotech</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="transition hover:text-[#1d4ed8]">
              Home
            </Link>
            <Link href="/courses" className="transition hover:text-[#1d4ed8]">
              Courses
            </Link>
            <Link href="/services#project-research" className="transition hover:text-[#1d4ed8]">
              Research
            </Link>
            <Link href="/internship" className="transition hover:text-[#1d4ed8]">
              Internship
            </Link>
            <Link href="/services" className="font-bold text-[#1d4ed8] underline decoration-2 underline-offset-8">
              Services
            </Link>
            <Link href="/contact" className="transition hover:text-[#1d4ed8]">
              Contact Us
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden items-center gap-2 rounded-full bg-[#071c2d] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1d4ed8] sm:inline-flex sm:text-sm"
            >
              <span>Get A Quote</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              className="rounded-lg p-2 text-[#071c2d] hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#1d4ed8]">
                Home
              </Link>
              <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#1d4ed8]">
                Courses
              </Link>
              <Link href="/services#project-research" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#1d4ed8]">
                Research
              </Link>
              <Link href="/internship" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#1d4ed8]">
                Internship
              </Link>
              <Link href="/services" onClick={() => setMobileMenuOpen(false)} className="py-2 font-bold text-[#1d4ed8]">
                Services
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-[#1d4ed8]">
                Contact Us
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[#071c2d] px-5 py-2.5 text-center text-sm font-bold text-white"
              >
                Get A Quote
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#f4f7fb] py-16 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage: "radial-gradient(rgba(29, 78, 216, 0.14) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          {/* Left Copy Column */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#1d4ed8] shadow-sm">
              <span>Elevate Your Brand With Us</span>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-[#071c2d] sm:text-5xl lg:text-[54px]">
              Empowering Your Success with Digital Expertise
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              We unify applied AI, project research, resilient cloud architecture, and full-cycle software engineering
              to help enterprises, institutions, and high-growth teams move from complex data to real-world operational
              execution.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a
                href="#our-services"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#071c2d] px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                <span>Explore More</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#our-services"
                className="text-sm font-bold text-[#071c2d] underline decoration-2 underline-offset-4 transition hover:text-[#1d4ed8]"
              >
                View All Services
              </a>
            </div>
          </div>

          {/* Right 4-Panel Angled Bento Collage + Hire Us Stamp Badge */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="mt-8 overflow-hidden rounded-[28px] border-4 border-white bg-[#071c2d] shadow-xl">
                  <img
                    src="/hub-4.jpg"
                    alt="Engineering collaboration"
                    className="h-44 w-full object-cover sm:h-52"
                  />
                </div>
                <div className="overflow-hidden rounded-[28px] border-4 border-white bg-[#071c2d] shadow-xl">
                  <img
                    src="/funded.jpg"
                    alt="Rashnotech leadership and strategy"
                    className="h-44 w-full object-cover object-top sm:h-52"
                  />
                </div>
                <div className="overflow-hidden rounded-[28px] border-4 border-white bg-[#071c2d] shadow-xl">
                  <img
                    src="/bg_hero.png"
                    alt="Digital product design and research"
                    className="h-44 w-full object-cover sm:h-52"
                  />
                </div>
                <div className="-mt-4 overflow-hidden rounded-[28px] border-4 border-white bg-[#071c2d] shadow-xl">
                  <img
                    src="/hub-4.jpg"
                    alt="Corporate and school training sessions"
                    className="h-44 w-full object-cover sm:h-52"
                  />
                </div>
              </div>

              {/* Circular Stamp Badge on bottom-left of collage */}
              <Link
                href="/contact"
                aria-label="Hire Rashnotech"
                className="group absolute -bottom-5 left-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#071c2d] text-white shadow-2xl transition hover:scale-105 sm:left-6 sm:h-28 sm:w-28"
              >
                <div className="absolute inset-1.5 rounded-full border border-dashed border-sky-400/60" />
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1d4ed8] text-white transition group-hover:bg-sky-400 group-hover:text-[#071c2d]">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <span className="sr-only">Hire Us</span>
              </Link>

              {/* Sparkle Accent on bottom-right */}
              <div className="pointer-events-none absolute -bottom-4 right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d4ed8] text-sky-300 shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scrolling Service Ribbon Band */}
      <div className="overflow-hidden border-y border-blue-400/20 bg-[#071c2d] py-4 text-white">
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap px-4">
          {[...INITIAL_SERVICES, ...INITIAL_SERVICES].map((service, idx) => (
            <div key={`${service.id}-${idx}`} className="inline-flex items-center gap-8">
              <span className="text-sm font-extrabold tracking-wide text-white sm:text-base">
                {service.title}
              </span>
              <Sparkles className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>

      {/* About Us & Capability Progress Section */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">
              <span>About Us</span>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#071c2d] sm:text-4xl lg:text-5xl">
              Empowering Your Success with Digital Expertise
            </h2>
          </div>

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-12">
            {/* Left Stacked Dual Photo Collage with Overlapping Circular Badge */}
            <div className="relative lg:col-span-6">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-[#071c2d] shadow-lg">
                  <img
                    src="/hub-4.jpg"
                    alt="Rashnotech engineering and research team"
                    className="h-52 w-full object-cover sm:h-60"
                  />
                </div>
                <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-[#071c2d] shadow-lg">
                  <img
                    src="/funded.jpg"
                    alt="Rashnotech executive training and delivery"
                    className="h-52 w-full object-cover object-top sm:h-60"
                  />
                </div>
              </div>

              {/* Overlapping Circular Badge */}
              <div className="absolute right-6 top-1/2 flex h-24 w-24 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#071c2d] text-white shadow-xl">
                <div className="absolute inset-1.5 rounded-full border border-dashed border-sky-400/70" />
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d4ed8] text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Right Copy + 3 Progress Bars with Circular Knobs */}
            <div className="lg:col-span-6">
              <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
                Inspired by mission-critical operational intelligence, we bridge applied research, sovereign cloud
                engineering, and hands-on corporate and school training so organizations can deploy resilient digital
                systems and upskill their workforce with confidence.
              </p>

              <div className="mt-8 space-y-6">
                {CAPABILITY_METRICS.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-[#071c2d] sm:text-sm">
                      <span>{metric.label}</span>
                      <span>{metric.percent}%</span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full bg-[#071c2d]"
                        style={{ width: `${metric.percent}%` }}
                      />
                      <span
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1d4ed8] bg-white shadow"
                        style={{ left: `${metric.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-9">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#071c2d] px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#1d4ed8]"
                >
                  <span>About Us</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* 4-Column Stats Row */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-slate-200 pt-12 md:grid-cols-4">
            {IMPACT_STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex items-center justify-between px-2 ${
                  index < IMPACT_STATS.length - 1 ? "md:border-r md:border-slate-200 md:pr-6" : ""
                }`}
              >
                <div>
                  <p className="text-3xl font-black tracking-tight text-[#071c2d] sm:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section id="our-services" className="relative overflow-hidden bg-[#071c2d] py-20 text-white lg:py-24">
        {/* Top Diagonal Hatch Strip */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-5 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(56,189,248,0.5) 0px, rgba(56,189,248,0.5) 2px, transparent 2px, transparent 10px)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/15 bg-[#0f2942] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-sky-300">
                <span>Our Services</span>
              </div>
              <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Boost Your Brand with Our Expertise
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold text-[#071c2d] shadow-md transition hover:bg-sky-300 sm:text-sm"
              >
                <span>View All Services</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm ${
                    isSelected
                      ? "bg-[#1d4ed8] text-white shadow-md shadow-blue-950/50"
                      : "border border-white/10 bg-[#0f2942] text-slate-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>

          {/* 3-Column Services Cards Grid (Active card uses bright brand blue with top-text/bottom-image just like reference middle card) */}
          <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const isHighlighted = activeServiceId === service.id
              const IconComponent = getServiceIcon(service.id)

              return (
                <article
                  key={service.id}
                  id={service.id}
                  onMouseEnter={() => setActiveServiceId(service.id)}
                  onClick={() => setActiveServiceId(service.id)}
                  className={`group flex cursor-pointer flex-col justify-between rounded-[28px] border p-5 transition-all duration-300 ${
                    isHighlighted
                      ? "-translate-y-1.5 border-sky-400/60 bg-[#1d4ed8] text-white shadow-[0_24px_60px_rgba(29,78,216,0.45)]"
                      : "border-white/10 bg-[#0f2942] text-white hover:-translate-y-1 hover:border-white/25"
                  }`}
                >
                  {/* Non-highlighted card: Image on top, copy on bottom */}
                  {!isHighlighted && (
                    <div className="relative mb-5 overflow-hidden rounded-2xl bg-[#071c2d]">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#071c2d]/85 px-3 py-1 text-[11px] font-bold text-sky-300 backdrop-blur-md">
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{service.category}</span>
                      </div>
                    </div>
                  )}

                  {/* Copy Block */}
                  <div className="px-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-black tracking-tight text-white">{service.title}</h3>
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isHighlighted ? "bg-white/20 text-white" : "bg-white/5 text-sky-300"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </span>
                    </div>

                    <p
                      className={`mt-3 text-sm leading-relaxed ${
                        isHighlighted ? "text-blue-50" : "text-slate-300"
                      }`}
                    >
                      {service.description}
                    </p>

                    {service.highlights.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {service.highlights.map((item) => (
                          <li
                            key={item}
                            className={`flex items-center gap-2 text-xs font-semibold ${
                              isHighlighted ? "text-sky-100" : "text-slate-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isHighlighted ? "bg-white" : "bg-sky-400"
                              }`}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5">
                      <Link
                        href={`/contact?service=${encodeURIComponent(service.title)}`}
                        className={`inline-flex items-center gap-1.5 text-sm font-extrabold transition ${
                          isHighlighted ? "text-white hover:text-sky-200" : "text-sky-300 hover:text-white"
                        }`}
                      >
                        <span>Learn more</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Highlighted card: Image on bottom (matching center card in the uploaded reference frame) */}
                  {isHighlighted && (
                    <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/20 bg-[#071c2d]">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#071c2d]/85 px-3 py-1 text-[11px] font-bold text-sky-300 backdrop-blur-md">
                        <IconComponent className="h-3.5 w-3.5" />
                        <span>{service.category}</span>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>

        {/* Bottom Diagonal Hatch Strip */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-5 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(56,189,248,0.5) 0px, rgba(56,189,248,0.5) 2px, transparent 2px, transparent 10px)",
          }}
        />
      </section>

      <PublicSiteFooter />
    </div>
  )
}
