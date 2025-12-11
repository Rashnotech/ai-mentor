"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Star,
  Clock,
  BarChart,
  Users,
  Play,
  CheckCircle2,
  ChevronDown,
  FileText,
  Award,
  Layout,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CourseDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("curriculum")
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    "module-1": true,
  })

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }))
  }

  const curriculum = [
    {
      id: "module-1",
      title: "Module 1: Figma Fundamentals",
      lessons: "5 lessons • 45m",
      items: [
        { title: "Introduction to the Figma Interface", duration: "10m", type: "video" },
        { title: "Working with Frames and Shapes", duration: "15m", type: "video" },
        { title: "Project 1: Design a Simple Logo", duration: "20m", type: "project" },
      ],
    },
    {
      id: "module-2",
      title: "Module 2: Auto Layout & Constraints",
      lessons: "4 lessons • 1h 15m",
      items: [
        { title: "Understanding Auto Layout", duration: "25m", type: "video" },
        { title: "Constraint Resizing", duration: "20m", type: "video" },
        { title: "Project 2: Responsive Card Component", duration: "30m", type: "project" },
      ],
    },
    {
      id: "module-3",
      title: "Module 3: Components and Variants",
      lessons: "6 lessons • 2h",
      items: [
        { title: "Creating Reusable Components", duration: "30m", type: "video" },
        { title: "Component Properties", duration: "40m", type: "video" },
        { title: "Project 3: Design System Basics", duration: "50m", type: "project" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold text-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Layout className="w-5 h-5 text-white" />
              </div>
              LearnTech
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/courses" className="text-blue-600 hover:text-blue-700 transition-colors">
                Courses
              </Link>
              <Link href="/workspace" className="text-gray-600 hover:text-gray-900 transition-colors">
                My Learning
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900">
              Log In
            </Link>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign Up</Button>
          </div>
        </div>
      </nav>

      {/* Header / Hero */}
      <div className="bg-[#0f172a] text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-blue-400 mb-4">
                <Link href="/" className="hover:text-blue-300">
                  Home
                </Link>
                <span>/</span>
                <Link href="/courses" className="hover:text-blue-300">
                  Design Courses
                </Link>
                <span>/</span>
                <span className="text-gray-400">Advanced Figma</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Advanced Figma: From Beginner to Pro in 10 Projects
              </h1>
              <p className="text-gray-300 text-lg mb-6 max-w-2xl">
                Master UI/UX design with our hands-on, AI-powered Figma course. Build a portfolio that gets you hired.
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-300">
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span>4.8</span>
                  <span className="text-gray-400 font-normal">(1,250 ratings)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>65 hours</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BarChart className="w-4 h-4" />
                  <span>Intermediate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>15,432 students</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab("curriculum")}
                className={`${activeTab === "curriculum" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"} border-b-2 pb-4 font-semibold whitespace-nowrap transition-colors`}
              >
                Curriculum
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`${activeTab === "projects" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"} border-b-2 pb-4 font-medium whitespace-nowrap transition-colors`}
              >
                Projects
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`${activeTab === "reviews" ? "text-blue-600 border-blue-600" : "text-gray-500 border-transparent hover:text-gray-900"} border-b-2 pb-4 font-medium whitespace-nowrap transition-colors`}
              >
                Reviews
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "curriculum" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* What You'll Learn */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Learn</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      "Master advanced Figma features like Auto Layout, Variants, and Components.",
                      "Design and prototype 10 real-world projects for your portfolio.",
                      "Understand UI/UX design principles and best practices.",
                      "Collaborate effectively with developers and stakeholders.",
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Features Grid */}
                <section className="grid md:grid-cols-3 gap-6 mb-12">
                  {[
                    {
                      icon: MessageSquare,
                      title: "AI Mentor",
                      desc: "Get instant feedback and guidance from our AI-powered mentor 24/7.",
                    },
                    {
                      icon: Layout,
                      title: "Hands-On Projects",
                      desc: "Build a professional portfolio by completing 10 real-world design projects.",
                    },
                    {
                      icon: Users,
                      title: "Peer Community",
                      desc: "Connect with fellow learners, share your work, and grow together.",
                    },
                  ].map((feature, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <feature.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                  ))}
                </section>

                {/* Curriculum Accordion */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Curriculum</h2>
                  <div className="space-y-4">
                    {curriculum.map((module) => (
                      <div key={module.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-semibold ${openModules[module.id] ? "text-blue-600" : "text-gray-900"}`}
                            >
                              {module.title}
                            </span>
                            <span className="text-sm text-gray-500 hidden sm:inline-block">{module.lessons}</span>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${openModules[module.id] ? "rotate-180" : ""}`}
                          />
                        </button>
                        {openModules[module.id] && (
                          <div className="bg-gray-50 border-t border-gray-200 p-2">
                            <div className="space-y-1">
                              {module.items.map((item, idx) =>
                                item.type === "project" ? (
                                  <Link
                                    key={idx}
                                    href={`/courses/${params.id}/learn`}
                                    className="flex items-center gap-3 p-2 rounded bg-blue-50 text-blue-700 text-sm font-medium cursor-pointer hover:bg-blue-100"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span>{item.title}</span>
                                    <span className="ml-auto text-xs">{item.duration}</span>
                                  </Link>
                                ) : (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 text-sm text-gray-700 cursor-pointer"
                                  >
                                    <Play className="w-4 h-4 text-gray-400" />
                                    <span>{item.title}</span>
                                    <span className="ml-auto text-gray-400 text-xs">{item.duration}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Reviews Summary */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews</h2>
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-4xl font-bold text-gray-900">4.8</span>
                      <div className="flex gap-1 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className="w-5 h-5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-500">Based on 1,250 ratings</p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Hands-on Projects</h2>
                <p className="text-gray-600 mb-8">
                  This course includes 10 portfolio-ready projects designed to test your skills in real-world scenarios.
                </p>

                <div className="grid gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="border border-gray-200 rounded-xl p-6 bg-white hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            Project {n}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900 mt-2">Design a Mobile Banking App</h3>
                        </div>
                        <FileText className="text-gray-400 w-6 h-6" />
                      </div>
                      <p className="text-gray-500 text-sm mb-4">
                        Create a complete user flow for a fintech application, focusing on accessibility and secure
                        authentication patterns.
                      </p>
                      <div className="flex gap-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Figma</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Prototyping</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What Students Say</h2>
                <div className="space-y-6">
                  {[
                    {
                      name: "Alex Johnson",
                      comment:
                        "This course is a game-changer. The project-based approach really helps solidify the concepts. The AI mentor is surprisingly helpful for getting unstuck!",
                      rating: 5,
                    },
                    {
                      name: "Maria Garcia",
                      comment:
                        "I went from knowing nothing about Figma to designing a full app prototype. Highly recommended for anyone looking to break into UI/UX design.",
                      rating: 5,
                    },
                    {
                      name: "David Kim",
                      comment: "Great content, but the pace is a bit fast in module 3. Rewatching the videos helped.",
                      rating: 4,
                    },
                  ].map((review, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                            {review.name[0]}
                          </div>
                          <span className="font-semibold text-gray-900">{review.name}</span>
                        </div>
                        <div className="flex gap-1 text-yellow-400">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3 h-3 ${n <= review.rating ? "fill-current" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:w-96 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Enrollment Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="relative h-48 bg-gray-900 group cursor-pointer">
                  {/* Video Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white fill-current ml-1" />
                    </div>
                  </div>
                  <img
                    src="/placeholder.svg?height=400&width=600&text=Video+Preview"
                    alt="Preview"
                    className="w-full h-full object-cover opacity-50"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-3xl font-bold text-gray-900">$99</span>
                    <span className="text-lg text-gray-400 line-through mb-1">$149</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <Link href={`/courses/${params.id}/learn`} className="block w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6">Enroll Now</Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full border-gray-200 hover:bg-gray-50 text-gray-700 bg-transparent"
                    >
                      Add to Wishlist
                    </Button>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    {[
                      { icon: Clock, label: "Estimated Time", value: "65 hours" },
                      { icon: FileText, label: "Projects", value: "10 portfolio-ready projects" },
                      { icon: CheckCircle2, label: "Prerequisites", value: "None" },
                      { icon: Award, label: "Certificate", value: "Certificate of Completion" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <item.icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="block font-medium text-gray-900">{item.label}</span>
                          <span className="text-gray-500">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instructor */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Instructor</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <img
                      src="/placeholder.svg?height=100&width=100&text=Jane"
                      alt="Jane"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Jane Cooper</p>
                    <p className="text-sm text-gray-500">Principal Designer at Google</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
