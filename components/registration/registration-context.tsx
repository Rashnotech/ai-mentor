"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { 
  LearningMode, 
  RegistrationState, 
  RegistrationStep,
  ModeSelectionState 
} from "@/types/registration"

// ============================================
// CONTEXT TYPE
// ============================================

interface RegistrationContextType {
  state: RegistrationState
  setStep: (step: RegistrationStep) => void
  setEmail: (email: string) => void
  setUsername: (username: string) => void
  setLearningMode: (mode: LearningMode) => void
  confirmModeSelection: () => void
  setCohortId: (cohortId: string) => void
  completeProfile: () => void
  reset: () => void
  isLoading: boolean
}

// ============================================
// INITIAL STATE
// ============================================

const initialModeSelection: ModeSelectionState = {
  selectedMode: null,
  confirmed: false,
  cohortId: undefined,
}

const initialState: RegistrationState = {
  step: "credentials",
  email: "",
  username: undefined,
  modeSelection: initialModeSelection,
  profileComplete: false,
}

// ============================================
// CONTEXT
// ============================================

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================

interface RegistrationProviderProps {
  children: ReactNode
}

export function RegistrationProvider({ children }: RegistrationProviderProps) {
  const [state, setState] = useState<RegistrationState>(initialState)
  const [isLoading, setIsLoading] = useState(true)

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("registrationState")
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RegistrationState
        setState(parsed)
      } catch (e) {
        console.error("Failed to parse registration state:", e)
      }
    }
    setIsLoading(false)
  }, [])

  // Persist state to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("registrationState", JSON.stringify(state))
    }
  }, [state, isLoading])

  const setStep = (step: RegistrationStep) => {
    setState(prev => ({ ...prev, step }))
  }

  const setEmail = (email: string) => {
    setState(prev => ({ ...prev, email }))
  }

  const setUsername = (username: string) => {
    setState(prev => ({ ...prev, username }))
  }

  const setLearningMode = (mode: LearningMode) => {
    setState(prev => ({
      ...prev,
      modeSelection: {
        ...prev.modeSelection,
        selectedMode: mode,
        confirmed: false,
      },
    }))
  }

  const confirmModeSelection = () => {
    setState(prev => ({
      ...prev,
      modeSelection: {
        ...prev.modeSelection,
        confirmed: true,
      },
      step: prev.modeSelection.selectedMode === "bootcamp" 
        ? "cohort-select" 
        : "profile-setup",
    }))
  }

  const setCohortId = (cohortId: string) => {
    setState(prev => ({
      ...prev,
      modeSelection: {
        ...prev.modeSelection,
        cohortId,
      },
      step: "profile-setup",
    }))
  }

  const completeProfile = () => {
    setState(prev => ({
      ...prev,
      profileComplete: true,
      step: "complete",
    }))
  }

  const reset = () => {
    setState(initialState)
    localStorage.removeItem("registrationState")
  }

  return (
    <RegistrationContext.Provider
      value={{
        state,
        setStep,
        setEmail,
        setUsername,
        setLearningMode,
        confirmModeSelection,
        setCohortId,
        completeProfile,
        reset,
        isLoading,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useRegistration() {
  const context = useContext(RegistrationContext)
  if (context === undefined) {
    throw new Error("useRegistration must be used within a RegistrationProvider")
  }
  return context
}

// ============================================
// HELPER HOOKS
// ============================================

export function useLearningMode() {
  const { state } = useRegistration()
  return {
    mode: state.modeSelection.selectedMode,
    confirmed: state.modeSelection.confirmed,
    cohortId: state.modeSelection.cohortId,
    isBootcamp: state.modeSelection.selectedMode === "bootcamp",
    isSelfPaced: state.modeSelection.selectedMode === "self-paced",
  }
}

export function useRegistrationStep() {
  const { state, setStep } = useRegistration()
  return {
    currentStep: state.step,
    setStep,
    isComplete: state.step === "complete",
  }
}
