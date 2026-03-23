"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  CheckCircle2, 
  Users, 
  Calendar, 
  Clock, 
  BookOpen,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Code2,
  Database,
  Globe,
  Smartphone
} from "lucide-react"
import { onboardingApi, getApiErrorMessage, bootcampAdminApi, type BootcampListResponse } from "@/lib/api"
import type { CohortInfo } from "@/types/registration"

// ============================================
// BOOTCAMP COURSE TYPE
// ============================================

interface BootcampCourse {
  id: string
  title: string
  description: string
  icon: "code" | "database" | "globe" | "mobile"
  duration: string
  modules: number
  level: "Beginner" | "Intermediate" | "Advanced"
  startDate: string
  endDate: string
  spotsRemaining: number
  totalSpots: number
  skills: string[]
  enrollmentOpen: boolean
}

// ============================================
// HELPER FUNCTION TO CONVERT API RESPONSE
// ============================================

function mapBootcampToBootcampCourse(bootcamp: BootcampListResponse): BootcampCourse {
  // Determine icon based on bootcamp name
  const getIcon = (name: string): "code" | "database" | "globe" | "mobile" => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("mobile") || lowerName.includes("app")) return "mobile"
    if (lowerName.includes("backend") || lowerName.includes("database") || lowerName.includes("data")) return "database"
    if (lowerName.includes("frontend") || lowerName.includes("react")) return "code"
    return "globe" // default for fullstack/web
  }

  // Determine level (default to Beginner if not specified in curriculum)
  const getLevel = (bootcamp: BootcampListResponse): "Beginner" | "Intermediate" | "Advanced" => {
    const desc = (bootcamp.description || "").toLowerCase()
    if (desc.includes("advanced")) return "Advanced"
    if (desc.includes("intermediate")) return "Intermediate"
    return "Beginner"
  }

  // Extract skills from curriculum or use defaults
  const getSkills = (bootcamp: BootcampListResponse): string[] => {
    if (bootcamp.curriculum && bootcamp.curriculum.length > 0) {
      return bootcamp.curriculum.slice(0, 4) // Take first 4 items as skills
    }
    return ["Programming", "Problem Solving", "Best Practices"]
  }

  // Calculate module count from curriculum or use default
  const getModuleCount = (bootcamp: BootcampListResponse): number => {
    if (bootcamp.curriculum) {
      return bootcamp.curriculum.length
    }
    return 6 // default
  }

  return {
    id: String(bootcamp.bootcamp_id),
    title: bootcamp.name,
    description: bootcamp.description || "Join this bootcamp to accelerate your learning journey.",
    icon: getIcon(bootcamp.name),
    duration: bootcamp.duration || "12 weeks",
    modules: getModuleCount(bootcamp),
    level: getLevel(bootcamp),
    startDate: bootcamp.start_date,
    endDate: bootcamp.end_date,
    spotsRemaining: bootcamp.spots_remaining,
    totalSpots: bootcamp.max_capacity,
    skills: getSkills(bootcamp),
    enrollmentOpen: bootcamp.enrollment_open,
  }
}

// ============================================
// COURSE ICON COMPONENT
// ============================================

function CourseIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "code":
      return <Code2 className={className} />
    case "database":
      return <Database className={className} />
    case "globe":
      return <Globe className={className} />
    case "mobile":
      return <Smartphone className={className} />
    default:
      return <BookOpen className={className} />
  }
}

// ============================================
// COURSE CARD COMPONENT
// ============================================

interface CourseCardProps {
  course: BootcampCourse
  isSelected: boolean
  onSelect: () => void
}

function CourseCard({ course, isSelected, onSelect }: CourseCardProps) {
  const startDate = new Date(course.startDate)
  const enrolledCount = course.totalSpots - course.spotsRemaining
  const fillPercentage = (enrolledCount / course.totalSpots) * 100
  const isFull = course.spotsRemaining === 0
  const isLowSpots = course.spotsRemaining <= 5 && course.spotsRemaining > 0
  const isDisabled = !course.enrollmentOpen

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const levelColors = {
    Beginner: "bg-green-100 text-green-700",
    Intermediate: "bg-blue-100 text-blue-700",
    Advanced: "bg-purple-100 text-purple-700",
  }

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`relative w-full p-5 rounded-xl border-2 text-left transition-all duration-200 ${
        isDisabled 
          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
          : isSelected
            ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2"
            : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Status Badge */}
      {!course.enrollmentOpen && !isFull ? (
        <span className="absolute -top-2 right-4 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-600">
          Enrollment Closed
        </span>
      ) : isFull ? (
        <span className="absolute -top-2 right-4 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-600">
          Full
        </span>
      ) : isLowSpots ? (
        <span className="absolute -top-2 right-4 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
          {course.spotsRemaining} spots left
        </span>
      ) : null}

      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        }`}>
          <CourseIcon icon={course.icon} className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
              {course.title}
            </h3>
            {isSelected && !isDisabled && (
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelColors[course.level]}`}>
              {course.level}
            </span>
            <span className="text-sm text-gray-500">{course.duration} • {course.modules} modules</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm mb-3 ${isSelected ? "text-blue-700" : "text-gray-600"}`}>
        {course.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {course.skills.map((skill) => (
          <span 
            key={skill}
            className={`px-2 py-0.5 text-xs rounded-full ${
              isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>Starts {formatDate(startDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{enrolledCount}/{course.totalSpots} enrolled</span>
        </div>
      </div>

      {/* Enrollment Progress */}
      <div className="space-y-1">
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isFull 
                ? "bg-red-500" 
                : isLowSpots 
                  ? "bg-amber-500" 
                  : isSelected 
                    ? "bg-blue-600" 
                    : "bg-green-500"
            }`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>
    </button>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function CohortSelectPage() {
  const router = useRouter()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [learningMode, setLearningMode] = useState<string | null>(null)

  // Fetch bootcamps from API
  const { data: bootcamps, isLoading, error } = useQuery({
    queryKey: ["bootcamps", "active"],
    queryFn: () => bootcampAdminApi.listBootcamps({ status: "published" as const }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Transform bootcamps to courses format
  const courses: BootcampCourse[] = bootcamps?.map(mapBootcampToBootcampCourse) ?? []

  // Mutation to save selected course to backend
  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      // Save selected course ID to backend
      return onboardingApi.update({ selected_course_id: courseId })
    },
    onSuccess: (_, courseId) => {
      // Store course selection locally for UI purposes
      localStorage.setItem("selectedCourseId", courseId)
      
      toast.success("Course selected!", {
        description: "Almost done with your setup...",
      })
      
      router.push("/onboarding")
    },
    onError: (error) => {
      toast.error("Failed to enroll", {
        description: getApiErrorMessage(error),
      })
    },
  })

  useEffect(() => {
    // Check if user selected bootcamp mode
    const mode = localStorage.getItem("learningMode")
    setLearningMode(mode)
    
    if (mode !== "bootcamp") {
      router.push("/onboarding/mode-selection")
      return
    }
  }, [router])

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  const handleContinue = async () => {
    if (!selectedCourseId) return
    enrollMutation.mutate(selectedCourseId)
  }

  const handleBack = () => {
    router.push("/onboarding/mode-selection")
  }

  if (learningMode !== "bootcamp") {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Step 3 of 4</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: "75%" }} />
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to mode selection
          </button>

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              Bootcamp Mode
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Select Your Course
            </h1>
            <p className="text-gray-500 max-w-lg mx-auto">
              Choose the bootcamp course you want to join. Each course has a structured curriculum with weekly deadlines.
            </p>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500">Loading available courses...</p>
            </div>
          ) : (
            <>
              {/* Course Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isSelected={selectedCourseId === course.id}
                    onSelect={() => setSelectedCourseId(course.id)}
                  />
                ))}
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      What happens after you enroll?
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• You'll receive weekly task assignments with deadlines</li>
                      <li>• AI will provide personalized hints, but task order is fixed</li>
                      <li>• You'll have access to cohort forums and peer collaboration</li>
                      <li>• Mentors will review your projects and provide feedback</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleContinue}
                  disabled={!selectedCourseId || enrollMutation.isPending}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all ${
                    selectedCourseId && !enrollMutation.isPending
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      Continue to Profile Setup
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Selected Summary */}
              {selectedCourse && (
                <div className="mt-6 text-center text-sm text-gray-500">
                  You'll enroll in <span className="font-medium text-gray-700">{selectedCourse.title}</span> starting{" "}
                  <span className="font-medium text-gray-700">
                    {new Date(selectedCourse.startDate).toLocaleDateString("en-US", { 
                      month: "long", 
                      day: "numeric", 
                      year: "numeric" 
                    })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
