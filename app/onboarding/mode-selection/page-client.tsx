"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  CheckCircle2, 
  Users, 
  Sparkles, 
  Calendar, 
  Clock, 
  Brain, 
  Target,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Zap,
  Route,
  Loader2
} from "lucide-react"
import { onboardingApi, getApiErrorMessage } from "@/lib/api"
import type { LearningMode, LearningModeConfig, ModeFeature } from "@/types/registration"

// ============================================
// MODE CONFIGURATION DATA
// ============================================

const BOOTCAMP_MODE: LearningModeConfig = {
  id: "bootcamp",
  title: "Bootcamp Mode",
  tagline: "Structured learning with a cohort",
  description: "Join a cohort of learners. Follow a fixed curriculum with deadlines. AI provides personalized help, but the task order stays the same for everyone.",
  icon: "Users",
  badge: "Popular",
  features: [
    { id: "cohort", text: "Join a cohort of peers", available: true },
    { id: "fixed-path", text: "Fixed curriculum order", available: true },
    { id: "deadlines", text: "Weekly deadlines to stay on track", available: true },
    { id: "ai-help", text: "AI-powered hints and explanations", available: true },
    { id: "reorder", text: "AI can reorder your tasks", available: false },
    { id: "skip", text: "Skip topics you already know", available: false },
  ],
  warnings: [
    "You must meet weekly deadlines to stay enrolled",
    "Task order cannot be changed once you start",
    "Missing 2+ deadlines may require restarting with a new cohort",
  ],
  recommended: true,
}

const SELF_PACED_MODE: LearningModeConfig = {
  id: "self-paced",
  title: "Self-Paced Mode",
  tagline: "AI adapts everything to you",
  description: "Learn at your own pace. AI analyzes your progress and dynamically adjusts what you learn next. Revisit lessons anytime, but submissions after deadlines won't be graded.",
  icon: "Sparkles",
  badge: "Flexible",
  features: [
    { id: "revisit", text: "Revisit lessons anytime (ungraded after deadline)", available: true },
    { id: "ai-path", text: "AI creates your unique learning path", available: true },
    { id: "adaptive", text: "Tasks reorder based on your progress", available: true },
    { id: "skip-known", text: "Skip topics you already know", available: true },
    { id: "cohort", text: "Cohort peer interaction", available: false },
    { id: "fixed-schedule", text: "Fixed weekly schedule", available: false },
  ],
  warnings: [
    "Submissions after deadlines will not be graded",
    "Requires self-discipline to stay consistent",
    "Progress depends entirely on your commitment",
  ],
}

const MODES: LearningModeConfig[] = [BOOTCAMP_MODE, SELF_PACED_MODE]

// ============================================
// FEATURE ITEM COMPONENT
// ============================================

function FeatureItem({ feature, isSelected }: { feature: ModeFeature; isSelected: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${
      feature.available 
        ? isSelected ? "text-blue-900" : "text-gray-700"
        : "text-gray-400 line-through"
    }`}>
      {feature.available ? (
        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
          isSelected ? "text-blue-600" : "text-green-500"
        }`} />
      ) : (
        <div className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
      )}
      {feature.text}
    </li>
  )
}

// ============================================
// MODE CARD COMPONENT
// ============================================

interface ModeCardProps {
  mode: LearningModeConfig
  isSelected: boolean
  onSelect: () => void
}

function ModeCard({ mode, isSelected, onSelect }: ModeCardProps) {
  const IconComponent = mode.id === "bootcamp" ? Users : Sparkles
  
  return (
    <button
      onClick={onSelect}
      className={`relative w-full p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 ring-offset-2"
          : "border-gray-200 bg-white hover:border-blue-300"
      }`}
    >
      {/* Badge */}
      {mode.badge && (
        <span className={`absolute -top-3 left-4 px-3 py-1 text-xs font-semibold rounded-full ${
          isSelected 
            ? "bg-blue-600 text-white" 
            : mode.recommended 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-600"
        }`}>
          {mode.badge}
        </span>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
        }`}>
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
            {mode.title}
          </h3>
          <p className={`text-sm ${isSelected ? "text-blue-700" : "text-gray-500"}`}>
            {mode.tagline}
          </p>
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-4 leading-relaxed ${isSelected ? "text-blue-800" : "text-gray-600"}`}>
        {mode.description}
      </p>

      {/* Features */}
      <ul className="space-y-2">
        {mode.features.map((feature) => (
          <FeatureItem key={feature.id} feature={feature} isSelected={isSelected} />
        ))}
      </ul>
    </button>
  )
}

// ============================================
// WARNING BANNER COMPONENT
// ============================================

function WarningBanner({ warnings, modeName }: { warnings: string[]; modeName: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-900 mb-2">
            Important: {modeName} Considerations
          </h4>
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ModeSelectionPage() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<LearningMode | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const selectedModeConfig = MODES.find(m => m.id === selectedMode)

  // Check onboarding profile status - profile was created on login
  const { isLoading: isChecking, isError: checkError } = useQuery({
    queryKey: ["onboarding", "profile"],
    queryFn: onboardingApi.getProfile,
    retry: 1,
  })

  // Mutation for updating learning mode
  const updateModeMutation = useMutation({
    mutationFn: async (mode: LearningMode) => {
      // Send learning_mode to backend
      return onboardingApi.update({ learning_mode: mode })
    },
    onSuccess: (_, mode) => {
      // Store mode locally for UI purposes
      localStorage.setItem("learningMode", mode)
      
      toast.success("Learning mode saved!", {
        description: mode === "bootcamp" 
          ? "Let's select your cohort..." 
          : "Continuing to course selection...",
      })
      
      // Route based on mode
      if (mode === "bootcamp") {
        router.push("/onboarding/cohort-select")
      } else {
        router.push("/onboarding")
      }
    },
    onError: (error) => {
      toast.error("Failed to save learning mode", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const handleModeSelect = (mode: LearningMode) => {
    setSelectedMode(mode)
    setShowConfirmation(false)
  }

  const handleContinue = () => {
    if (!selectedMode) return
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    if (!selectedMode) return
    updateModeMutation.mutate(selectedMode)
  }

  const handleBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false)
    } else {
      router.push("/dashboard")
    }
  }

  // Show loading state while checking profile
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Show error state if profile check failed
  if (checkError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load profile</h2>
          <p className="text-gray-500 mb-4">Please make sure you're logged in and try again.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900">LearnTech</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Step 2 of 4</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <div className="w-2 h-2 rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-500" 
          style={{ width: showConfirmation ? "60%" : "50%" }} 
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {!showConfirmation ? (
            /* MODE SELECTION STATE */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  How do you want to learn?
                </h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                  Choose your learning style. This affects how content is delivered and paced.
                  <span className="block mt-1 text-sm font-medium text-amber-600">
                    ⚠️ This choice cannot be changed later
                  </span>
                </p>
              </div>

              {/* Mode Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {MODES.map((mode) => (
                  <ModeCard
                    key={mode.id}
                    mode={mode}
                    isSelected={selectedMode === mode.id}
                    onSelect={() => handleModeSelect(mode.id)}
                  />
                ))}
              </div>

              {/* Continue Button */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleContinue}
                  disabled={!selectedMode}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all ${
                    selectedMode
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* CONFIRMATION STATE */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              {/* Title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center">
                  {selectedMode === "bootcamp" ? (
                    <Users className="w-8 h-8 text-blue-600" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Confirm: {selectedModeConfig?.title}
                </h1>
                <p className="text-gray-500">
                  Please review before confirming. This choice is permanent.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">You're choosing:</h3>
                <p className="text-gray-600 mb-4">{selectedModeConfig?.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {selectedModeConfig?.features.filter(f => f.available).map(feature => (
                    <span 
                      key={feature.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {feature.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Warning Banner */}
              {selectedModeConfig && (
                <div className="mb-6">
                  <WarningBanner 
                    warnings={selectedModeConfig.warnings} 
                    modeName={selectedModeConfig.title} 
                  />
                </div>
              )}

              {/* Permanent Choice Notice */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">
                      This choice is permanent
                    </h4>
                    <p className="text-sm text-red-700">
                      Once confirmed, you cannot switch between Bootcamp and Self-Paced modes.
                      Your learning path structure will be locked to this mode.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={updateModeMutation.isPending}
                  className="px-6 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Go Back & Change
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={updateModeMutation.isPending}
                  className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateModeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Confirm {selectedModeConfig?.title}
                      <Zap className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          Need help choosing?{" "}
          <a href="#" className="text-blue-600 hover:underline">
            Compare modes in detail
          </a>
        </div>
      </footer>
    </div>
  )
}
