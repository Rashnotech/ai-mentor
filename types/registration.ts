/**
 * Registration and Learning Mode Types
 * 
 * USER FLOW:
 * 1. Sign Up (email, password) → /signup
 * 2. Mode Selection (bootcamp vs self-paced) → /onboarding/mode-selection
 * 3. Mode Confirmation → /onboarding/confirm
 * 4. Profile Setup (goals, skills) → /onboarding
 * 5. Dashboard → /dashboard
 */

export type LearningMode = "bootcamp" | "self-paced"

export interface ModeFeature {
  id: string
  text: string
  available: boolean
}

export interface LearningModeConfig {
  id: LearningMode
  title: string
  tagline: string
  description: string
  icon: string // Icon name from lucide-react
  features: ModeFeature[]
  warnings: string[]
  recommended?: boolean
  badge?: string // e.g., "Popular", "Flexible"
}

export interface CohortInfo {
  id: string
  name: string
  startDate: string
  endDate: string
  spotsRemaining: number
  totalSpots: number
  timezone: string
}

export interface ModeSelectionState {
  selectedMode: LearningMode | null
  confirmed: boolean
  cohortId?: string // Only for bootcamp mode
}

export interface RegistrationState {
  step: RegistrationStep
  email: string
  username?: string
  modeSelection: ModeSelectionState
  profileComplete: boolean
}

export type RegistrationStep = 
  | "credentials"    // Step 1: Email/password
  | "mode-selection" // Step 2: Choose learning mode
  | "mode-confirm"   // Step 3: Confirm choice with warnings
  | "cohort-select"  // Step 3b: Select cohort (bootcamp only)
  | "profile-setup"  // Step 4: Goals, skills, preferences
  | "complete"       // Done

// API Types
export interface ModeSelectionRequest {
  userId: string
  mode: LearningMode
  cohortId?: string
}

export interface ModeSelectionResponse {
  success: boolean
  mode: LearningMode
  cohortId?: string
  nextStep: string
}

// Component Props Types
export interface ModeCardProps {
  mode: LearningModeConfig
  isSelected: boolean
  onSelect: (mode: LearningMode) => void
  disabled?: boolean
}

export interface ModeConfirmationProps {
  selectedMode: LearningModeConfig
  onConfirm: () => void
  onGoBack: () => void
  isLoading?: boolean
}

export interface CohortSelectorProps {
  cohorts: CohortInfo[]
  selectedCohortId: string | null
  onSelect: (cohortId: string) => void
  onContinue: () => void
  onGoBack: () => void
}
