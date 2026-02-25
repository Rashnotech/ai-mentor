"use client"

import { useState, use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  Loader2,
  LogOut,
  User,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { publicCourseApi, studentCoursesApi, CourseListResponse, CourseCurriculumResponse, CourseReviewsListResponse } from "@/lib/api"
import { toast } from "sonner"
import { PaymentModal } from "@/components/payment-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params)
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("curriculum")
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Fetch course details by slug
  const { data: course, isLoading: courseLoading, error: courseError } = useQuery<CourseListResponse>({
    queryKey: ["public-course", slug],
    queryFn: () => publicCourseApi.getCourseBySlug(slug),
    enabled: !!slug,
  })

  // Fetch curriculum by slug
  const { data: curriculum, isLoading: curriculumLoading } = useQuery<CourseCurriculumResponse>({
    queryKey: ["public-curriculum", slug],
    queryFn: () => publicCourseApi.getCurriculumBySlug(slug),
    enabled: !!slug,
  })

  // Fetch reviews by slug
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<CourseReviewsListResponse>({
    queryKey: ["public-reviews", slug],
    queryFn: () => publicCourseApi.getReviewsBySlug(slug, { limit: 10 }),
    enabled: !!slug,
  })

  // Open first module by default when curriculum loads
  useEffect(() => {
    if (curriculum?.modules?.length && Object.keys(openModules).length === 0) {
      setOpenModules({ [`module-${curriculum.modules[0].module_id}`]: true })
    }
  }, [curriculum])

  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }))
  }

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!course?.course_id) throw new Error("Course not found")
      return studentCoursesApi.enrollInCourse(course.course_id)
    },
    onSuccess: () => {
      toast.success("Successfully enrolled! Redirecting to course...")
      queryClient.invalidateQueries({ queryKey: ["my-courses"] })
      router.push(`/courses/${slug}/learn`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to enroll in course")
      setIsEnrolling(false)
    },
  })

  const handleEnroll = () => {
    if (!isAuthenticated) {
      // Store redirect destination and go to login
      if (typeof window !== "undefined") {
        sessionStorage.setItem("auth_redirect", `/courses/${slug}`)
      }
      router.push("/login")
      return
    }

    // Check if course is free or paid
    const coursePrice = course?.min_price || 0
    
    if (coursePrice > 0) {
      // Course has a cost - show payment modal
      setShowPaymentModal(true)
    } else {
      // Course is free - enroll directly
      setIsEnrolling(true)
      enrollMutation.mutate()
    }
  }

  const handlePaymentSuccess = () => {
    // After verified payment, redirect to course learning page
    setShowPaymentModal(false)
    queryClient.invalidateQueries({ queryKey: ["my-courses"] })
    router.push(`/courses/${slug}/learn`)
  }

  const handleLogout = async () => {
    await logout()
  }

  // Difficulty level color mapping
  const getDifficultyColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "BEGINNER":
        return "text-green-400"
      case "INTERMEDIATE":
        return "text-yellow-400"
      case "ADVANCED":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  if (courseLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    )
  }

  if (courseError || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">The course you're looking for doesn't exist or is not available.</p>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

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
              {isAuthenticated && (
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                  My Learning
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user.full_name || user.email}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || "User"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900">
                  Log In
                </Link>
                <Link href="/signup">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign Up</Button>
                </Link>
              </>
            )}
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
                  Courses
                </Link>
                <span>/</span>
                <span className="text-gray-400">{course.title}</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {course.title}
              </h1>
              <p className="text-gray-300 text-lg mb-6 max-w-2xl">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-300">
                {course.average_rating !== undefined && course.average_rating > 0 && (
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{course.average_rating.toFixed(1)}</span>
                    <span className="text-gray-400 font-normal">({course.total_reviews} ratings)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{course.estimated_hours} hours</span>
                </div>
                <div className={`flex items-center gap-1.5 ${getDifficultyColor(course.difficulty_level)}`}>
                  <BarChart className="w-4 h-4" />
                  <span>{course.difficulty_level}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{course.modules_count} modules</span>
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
                {course.what_youll_learn && course.what_youll_learn.length > 0 && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">What You'll Learn</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {course.what_youll_learn.map((item, i) => (
                        <div key={i} className="flex gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

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
                      desc: "Build a professional portfolio by completing real-world projects.",
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
                  {curriculumLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : curriculum?.modules && curriculum.modules.length > 0 ? (
                    <div className="space-y-4">
                      {curriculum.modules.map((module) => (
                        <div key={module.module_id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                          <button
                            onClick={() => toggleModule(`module-${module.module_id}`)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`font-semibold ${openModules[`module-${module.module_id}`] ? "text-blue-600" : "text-gray-900"}`}
                              >
                                {module.title}
                              </span>
                              <span className="text-sm text-gray-500 hidden sm:inline-block">
                                {module.lessons_count} lessons • {module.duration}
                              </span>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform ${openModules[`module-${module.module_id}`] ? "rotate-180" : ""}`}
                            />
                          </button>
                          {openModules[`module-${module.module_id}`] && (
                            <div className="bg-gray-50 border-t border-gray-200 p-2">
                              <div className="space-y-1">
                                {module.items.map((item, idx) =>
                                  item.type === "project" ? (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-3 p-2 rounded bg-blue-50 text-blue-700 text-sm font-medium"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>{item.title}</span>
                                      <span className="ml-auto text-xs">{item.duration}</span>
                                    </div>
                                  ) : (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 text-sm text-gray-700"
                                    >
                                      {item.has_video ? (
                                        <Play className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <FileText className="w-4 h-4 text-gray-400" />
                                      )}
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
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No curriculum available yet.</p>
                    </div>
                  )}
                </section>

                {/* Reviews Summary */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews</h2>
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {reviewsData?.average_rating?.toFixed(1) || "0.0"}
                      </span>
                      <div className="flex gap-1 text-yellow-400">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star 
                            key={n} 
                            className={`w-5 h-5 ${n <= Math.round(reviewsData?.average_rating || 0) ? "fill-current" : "text-gray-300"}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-500">Based on {reviewsData?.total_count || 0} ratings</p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Hands-on Projects</h2>
                <p className="text-gray-600 mb-8">
                  This course includes portfolio-ready projects designed to test your skills in real-world scenarios.
                </p>

                {curriculumLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {curriculum?.modules?.flatMap((module) =>
                      module.items
                        .filter((item) => item.type === "project")
                        .map((project, idx) => (
                          <div
                            key={project.id}
                            className="border border-gray-200 rounded-xl p-6 bg-white hover:border-blue-200 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                  Project
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 mt-2">{project.title}</h3>
                              </div>
                              <FileText className="text-gray-400 w-6 h-6" />
                            </div>
                            <p className="text-gray-500 text-sm mb-4">
                              Part of {module.title}
                            </p>
                            <div className="flex gap-2">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {project.duration}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                    {(!curriculum?.modules || curriculum.modules.flatMap((m) => m.items.filter((i) => i.type === "project")).length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No projects available yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What Students Say</h2>
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviewsData.reviews.map((review) => (
                      <div key={review.review_id} className="bg-white p-6 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                            {review.user_name[0]}
                          </div>
                          <span className="font-semibold text-gray-900">{review.user_name}</span>
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
                      <p className="text-gray-600 leading-relaxed">{review.review_text || "No comment"}</p>
                    </div>
                  ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No reviews yet. Be the first to review this course!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:w-96 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Enrollment Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-700 group cursor-pointer">
                  {/* Video Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-white fill-current ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-2xl font-bold text-green-600">
                      {course.min_price && course.min_price > 0
                        ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(course.min_price)
                        : "Free"}
                    </span>
                    <span className="text-sm text-gray-500">• Includes certificate</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <Button 
                      onClick={handleEnroll}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                      disabled={isEnrolling || enrollMutation.isPending}
                    >
                      {isEnrolling || enrollMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Enrolling...
                        </>
                      ) : !isAuthenticated ? (
                        "Enroll Now"
                      ) : course.min_price && course.min_price > 0 ? (
                        `Enroll for ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(course.min_price)}`
                      ) : (
                        "Start Learning - Free"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-gray-200 hover:bg-gray-50 text-gray-700 bg-transparent"
                    >
                      Add to Wishlist
                    </Button>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-gray-100">
                    {[
                      { icon: Clock, label: "Estimated Time", value: `${course.estimated_hours} hours` },
                      { icon: Layers, label: "Modules", value: `${course.modules_count} modules` },
                      { icon: CheckCircle2, label: "Prerequisites", value: course.prerequisites?.length ? course.prerequisites.join(", ") : "None" },
                      { icon: Award, label: "Certificate", value: course.certificate_on_completion ? "Certificate of Completion" : "No certificate" },
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

              {/* Course Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Course Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Difficulty</span>
                    <span className={`font-medium ${getDifficultyColor(course.difficulty_level)}`}>
                      {course.difficulty_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rating</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      {course.average_rating?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reviews</span>
                    <span className="font-medium text-gray-900">{course.total_reviews}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal — real Nomba integration */}
      {course && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          courseId={course.course_id}
          courseTitle={course.title}
          courseDescription={course.description}
          price={course.min_price || 0}
          currency="NGN"
          slug={slug}
        />
      )}
    </div>
  )
}
