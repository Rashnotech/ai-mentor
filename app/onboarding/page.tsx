"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronRight, BookOpen, Rocket, Briefcase, Trophy, Code2, Brain, Check } from "lucide-react"

// Steps:
// 1. Goal Selection
// 2. Skill Assessment (Quiz)
// 3. Adaptive Processing
// 4. Result/Recommendation

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

const quizQuestions = [
  {
    id: 1,
    question: "How would you rate your current coding experience?",
    options: [
      "Total beginner (Never wrote code)",
      "Beginner (Know basic syntax)",
      "Intermediate (Built a few projects)",
      "Advanced (Professional experience)",
    ],
  },
  {
    id: 2,
    question: "Which area interests you the most?",
    options: [
      "Building websites & apps (Web Dev)",
      "Analyzing data & AI (Data Science)",
      "Designing interfaces (UI/UX)",
      "Mobile Apps (iOS/Android)",
    ],
  },
  {
    id: 3,
    question: "What is your preferred learning style?",
    options: ["Video tutorials", "Reading documentation", "Hands-on projects", "Interactive quizzes"],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)

  // Quiz State
  const [quizStep, setQuizStep] = useState(0) // 0 means not started, 1-3 are questions
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})

  // Simulation for the adaptive assessment
  const [assessmentProgress, setAssessmentProgress] = useState(0)

  useEffect(() => {
    if (step === 3) {
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
  }, [step])

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleStartQuiz = () => {
    setQuizStep(1)
  }

  const handleQuizAnswer = (answer: string) => {
    setQuizAnswers({ ...quizAnswers, [quizStep]: answer })
    if (quizStep < quizQuestions.length) {
      setQuizStep(quizStep + 1)
    } else {
      // Quiz complete
      handleNext()
    }
  }

  const handleComplete = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
        </div>
        <div className="text-sm text-gray-500">Step {step} of 4</div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100">
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

          {step === 2 && (
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {quizStep === 0 ? (
                <>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">Let's check your current level</h1>
                  <p className="text-gray-500 mb-8">
                    We'll ask you a quick set of adaptive questions to find the perfect starting point.
                  </p>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 mb-8 text-center">
                    <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">3-5 Minute Adaptive Assessment</h3>
                    <p className="text-blue-700 max-w-md mx-auto">
                      This short quiz analyzes your coding knowledge, problem-solving skills, and tech stack
                      familiarity.
                    </p>
                  </div>

                  <button
                    onClick={handleStartQuiz}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 mx-auto"
                  >
                    Start Assessment <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full text-left">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Question {quizStep} of {quizQuestions.length}
                    </span>
                    <span className="text-sm text-blue-600 font-medium">Adaptive</span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-8">{quizQuestions[quizStep - 1].question}</h2>

                  <div className="space-y-3">
                    {quizQuestions[quizStep - 1].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(option)}
                        className="w-full p-4 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-gray-700 hover:text-blue-700"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="60" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="#2563EB"
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

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your skills...</h2>
              <p className="text-gray-500 animate-pulse">
                {assessmentProgress < 30
                  ? "Evaluating syntax knowledge..."
                  : assessmentProgress < 60
                    ? "Checking problem-solving patterns..."
                    : assessmentProgress < 90
                      ? "Generating learning path..."
                      : "Finalizing recommendations..."}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Recommended Path
                  </div>
                  <div className="font-semibold text-gray-900">Full Stack Web Development</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">First Project</div>
                  <div className="font-semibold text-gray-900">Interactive Personal Portfolio</div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 w-full sm:w-auto"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
