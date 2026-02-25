"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, ChevronRight, BookOpen, Rocket, Briefcase, Trophy, Code2, Brain, Check, Users, Sparkles, Database, Globe, Smartphone, Loader2 } from "lucide-react"
import { onboardingApi, publicCourseApi, getApiErrorMessage, type UserGoal, type CourseListResponse } from "@/lib/api"
import { useUserStore } from "@/lib/stores/user-store"

// Steps:
// Bootcamp: Goal Selection → Result (quiz skipped - course already selected)
// Self-Paced: Goal Selection → Course Selection → Processing → Result

const goals = [
  {
    id: "job",
    title: "Get a job",
    icon: Briefcase,
    description: "Land a role in tech as a developer or designer.",
  },
  {
    id: "startup",
    title: "Build a startup",
    icon: Rocket,
    description: "Launch your own product or MVP.",
  },
  {
    id: "fundamentals",
    title: "Learn fundamentals",
    icon: BookOpen,
    description: "Master the core concepts of computer science.",
  },
  {
    id: "certification",
    title: "Earn certification",
    icon: Trophy,
    description: "Get certified to boost your resume.",
  },
  {
    id: "project",
    title: "Build a specific project",
    icon: Code2,
    description: "Bring a specific idea to life right now.",
  },
]

// Self-Paced courses interface
interface SelfPacedCourse {
  id: string
  title: string
  description: string
  icon: "code" | "database" | "globe" | "mobile"
  duration: string
  modules: number
  level: "Beginner" | "Intermediate" | "Advanced"
  skills: string[]
}

// Map API difficulty levels to UI levels
function mapDifficultyToLevel(difficulty: string): "Beginner" | "Intermediate" | "Advanced" {
  switch (difficulty.toUpperCase()) {
    case "BEGINNER":
      return "Beginner"
    case "INTERMEDIATE":
      return "Intermediate"
    case "ADVANCED":
      return "Advanced"
    default:
      return "Beginner"
  }
}

// Map course title keywords to icons
function getIconForCourse(title: string): "code" | "database" | "globe" | "mobile" {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes("mobile") || lowerTitle.includes("app")) return "mobile"
  if (lowerTitle.includes("backend") || lowerTitle.includes("database") || lowerTitle.includes("api")) return "database"
  if (lowerTitle.includes("frontend") || lowerTitle.includes("react") || lowerTitle.includes("ui")) return "code"
  return "globe" // Default for full-stack/web
}

// Transform API response to UI format
function mapCourseToSelfPaced(course: CourseListResponse): SelfPacedCourse {
  return {
    id: course.course_id.toString(),
    title: course.title,
    description: course.description,
    icon: getIconForCourse(course.title),
    duration: "Self-paced",
    modules: course.modules_count || 0,
    level: mapDifficultyToLevel(course.difficulty_level),
    skills: course.what_youll_learn?.slice(0, 4) || [],
  }
}

// Course Icon component
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

// Mode badge component
function ModeBadge({ mode }: { mode: string | null }) {
  if (mode === "bootcamp") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-medium">
        <Users className="w-4 h-4" />
        Bootcamp Mode
      </span>
    )
  }
  if (mode === "self-paced") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full font-medium">
        <Sparkles className="w-4 h-4" />
        Self-Paced Mode
      </span>
    )
  }
  return null
}

export default function OnboardingPage() {
  const router = useRouter()
  const updateUser = useUserStore((state) => state.updateUser)
  const [step, setStep] = useState(1)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [learningMode, setLearningMode] = useState<string | null>(null)
  const [cohortId, setCohortId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Simulation for the adaptive assessment
  const [assessmentProgress, setAssessmentProgress] = useState(0)

  // Fetch available courses for self-paced mode
  const { data: coursesData, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["public", "courses"],
    queryFn: () => publicCourseApi.listCourses(),
    staleTime: 60000,
    enabled: learningMode === "self-paced", // Only fetch if in self-paced mode
  })

  // Transform API courses to UI format
  const selfPacedCourses: SelfPacedCourse[] = coursesData?.map(mapCourseToSelfPaced) || []

  // Map frontend goal IDs to backend UserGoal enum values
  const goalToApiMap: Record<string, UserGoal> = {
    job: "Get a job",
    startup: "Build a startup",
    fundamentals: "Learn fundamentals",
    certification: "Earn certification",
    project: "Build a specific project",
  }

  // Mutation for updating goal
  const updateGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const apiGoal = goalToApiMap[goalId]
      if (!apiGoal) throw new Error("Invalid goal")
      return onboardingApi.update({ primary_goal: apiGoal })
    },
    onError: (error) => {
      toast.error("Failed to save goal", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Mutation for completing onboarding
  const completeOnboardingMutation = useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: () => {
      // Update Zustand store with onboarding status
      updateUser({ onboarding_completed: true })
      
      toast.success("Onboarding complete!", {
        description: "Welcome to LearnTech!",
      })
      router.push("/dashboard")
    },
    onError: (error) => {
      toast.error("Failed to complete onboarding", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Load learning mode from localStorage
  useEffect(() => {
    const mode = localStorage.getItem("learningMode")
    const cohort = localStorage.getItem("selectedCohortId")
    const course = localStorage.getItem("selectedCourseId")
    
    if (!mode) {
      // If no mode selected, redirect to mode selection
      router.push("/onboarding/mode-selection")
      return
    }
    
    setLearningMode(mode)
    if (cohort) setCohortId(cohort)
    if (course) setSelectedCourseId(course)
  }, [router])

  // Processing animation for self-paced mode
  useEffect(() => {
    if (step === 3 && learningMode === "self-paced") {
      const interval = setInterval(() => {
        setAssessmentProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setStep(4), 500)
            return 100
          }
          return prev + 2
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [step, learningMode])

  const handleNext = async () => {
    // Save goal to backend when moving from step 1
    if (step === 1 && selectedGoal) {
      updateGoalMutation.mutate(selectedGoal)
    }
    
    // Bootcamp mode: Skip step 2 (course selection) and step 3 (processing)
    // Go directly from goals (step 1) to result (step 4)
    if (learningMode === "bootcamp" && step === 1) {
      setStep(4) // Skip to result
    } else {
      setStep(step + 1)
    }
  }

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    localStorage.setItem("selectedCourseId", courseId)
  }

  const handleComplete = () => {
    // Complete onboarding via API
    completeOnboardingMutation.mutate()
  }

  const selectedCourse = selfPacedCourses.find(c => c.id === selectedCourseId)

  // Get total steps based on mode
  const getTotalSteps = () => (learningMode === "bootcamp" ? 4 : 5)
  const getCurrentStepDisplay = () => {
    if (learningMode === "bootcamp") {
      return step === 1 ? 4 : 5 // Bootcamp: step 1 = 4 of 5, step 4 = 5 of 5
    }
    return step + 2 // Self-paced: normal flow
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
        </div>
        <div className="text-sm text-gray-500">Step {getCurrentStepDisplay()} of {getTotalSteps()}</div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
        {/* Mode Badge - Shows selected learning mode */}
        {learningMode && (
          <div className="px-8 pt-4 flex justify-center">
            <ModeBadge mode={learningMode} />
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100 mt-4">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center text-center">
          {step === 1 && (
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">What is your primary goal?</h1>
              <p className="text-gray-500 mb-8">
                We'll personalize your learning path based on what you want to achieve.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
                {goals.map((goal) => {
                  const Icon = goal.icon
                  return (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      className={`p-6 rounded-xl border text-left transition-all duration-200 group hover:border-blue-300 hover:shadow-md ${
                        selectedGoal === goal.id
                          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors ${
                          selectedGoal === goal.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3
                        className={`font-semibold mb-1 ${selectedGoal === goal.id ? "text-blue-900" : "text-gray-900"}`}
                      >
                        {goal.title}
                      </h3>
                      <p className={`text-sm ${selectedGoal === goal.id ? "text-blue-700" : "text-gray-500"}`}>
                        {goal.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end w-full">
                <button
                  onClick={handleNext}
                  disabled={!selectedGoal}
                  className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                    selectedGoal
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && learningMode === "self-paced" && (
            <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Choose Your Course</h1>
              <p className="text-gray-500 mb-8 text-center">
                Select a course to start your self-paced learning journey. AI will personalize your path within this course.
              </p>

              {isLoadingCourses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="ml-3 text-gray-500">Loading courses...</span>
                </div>
              ) : selfPacedCourses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No courses available at the moment. Please check back later.
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {selfPacedCourses.map((course) => {
                  const isSelected = selectedCourseId === course.id
                  const levelColors = {
                    Beginner: "bg-green-100 text-green-700",
                    Intermediate: "bg-blue-100 text-blue-700",
                    Advanced: "bg-purple-100 text-purple-700",
                  }
                  
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course.id)}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-offset-2"
                          : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}>
                          <CourseIcon icon={course.icon} className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${isSelected ? "text-purple-900" : "text-gray-900"}`}>
                              {course.title}
                            </h3>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${levelColors[course.level]}`}>
                              {course.level}
                            </span>
                            <span className="text-sm text-gray-500">{course.modules} modules</span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className={`text-sm mb-3 ${isSelected ? "text-purple-700" : "text-gray-600"}`}>
                        {course.description}
                      </p>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {course.skills.map((skill) => (
                          <span 
                            key={skill}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              isSelected ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
              )}

              {/* Info Banner */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">
                      AI-Personalized Learning
                    </h4>
                    <p className="text-sm text-purple-800">
                      AI will analyze your progress and adapt the curriculum to your pace. 
                      You can revisit lessons anytime, but submissions after deadlines won't be graded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end w-full">
                <button
                  onClick={handleNext}
                  disabled={!selectedCourseId}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all ${
                    selectedCourseId
                      ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && learningMode === "self-paced" && (
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="#9333EA"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * assessmentProgress) / 100}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{assessmentProgress}%</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalizing your path...</h2>
              <p className="text-gray-500 animate-pulse">
                {assessmentProgress < 30
                  ? "Analyzing your selected course..."
                  : assessmentProgress < 60
                    ? "Matching with your learning goals..."
                    : assessmentProgress < 90
                      ? "Creating adaptive curriculum..."
                      : "Finalizing personalized path..."}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">You're all set!</h1>
              <p className="text-gray-500 mb-8 max-w-lg mx-auto">
                We've crafted a personalized curriculum based on your goal to{" "}
                <strong>{goals.find((g) => g.id === selectedGoal)?.title}</strong>.
              </p>

              {/* Mode-specific info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-left">
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Learning Mode
                  </div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {learningMode === "bootcamp" ? (
                      <>
                        <Users className="w-4 h-4 text-blue-600" />
                        Bootcamp
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Self-Paced
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {learningMode === "bootcamp" ? "Schedule" : "Path Style"}
                  </div>
                  <div className="font-semibold text-gray-900">
                    {learningMode === "bootcamp" ? "Weekly Deadlines" : "AI-Personalized"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Your Course
                  </div>
                  <div className="font-semibold text-gray-900">
                    {selectedCourse?.title || "Full Stack Web Development"}
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">First Project</div>
                  <div className="font-semibold text-gray-900">Interactive Personal Portfolio</div>
                </div>
              </div>

              {/* Mode-specific reminder */}
              {learningMode === "bootcamp" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-blue-800">
                    <strong>Bootcamp Reminder:</strong> Your course starts soon. You'll receive weekly tasks with deadlines. 
                    AI will provide personalized hints, but task order is fixed for everyone.
                  </p>
                </div>
              )}
              
              {learningMode === "self-paced" && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-purple-800">
                    <strong>Self-Paced Mode:</strong> AI will continuously adapt your learning path based on your progress.
                    You can revisit lessons anytime, but submissions after deadlines won't be graded.
                  </p>
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={completeOnboardingMutation.isPending}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {completeOnboardingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finishing setup...
                  </>
                ) : (
                  "Go to Dashboard"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
