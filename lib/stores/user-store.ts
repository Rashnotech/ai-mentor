import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// User types
export type UserRole = 'student' | 'mentor' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_verified: boolean
  avatar_url?: string | null
  bio?: string | null
  github_username?: string | null
  linkedin_username?: string | null
  timezone?: string
  created_at?: string
  last_login?: string | null
}

export interface UserProfile extends User {
  // Extended profile fields for student
  skill_level?: string | null
  learning_mode?: string | null
  learning_style?: string | null
  primary_goal?: string | null
  preferred_language?: string
  total_xp?: number
  streak_days?: number
  courses_in_progress?: number
  projects_completed?: number
  onboarding_completed?: boolean
}

interface UserState {
  // User data
  user: UserProfile | null
  isHydrated: boolean
  
  // Actions
  setUser: (user: UserProfile | null) => void
  updateUser: (updates: Partial<UserProfile>) => void
  clearUser: () => void
  setHydrated: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isHydrated: false,
      
      setUser: (user) => set({ user }),
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      clearUser: () => set({ user: null }),
      
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
)

// Selector hooks for common use cases
export const useUser = () => useUserStore((state) => state.user)
export const useIsAuthenticated = () => useUserStore((state) => !!state.user)
export const useUserRole = () => useUserStore((state) => state.user?.role ?? null)
export const useOnboardingCompleted = () => useUserStore((state) => state.user?.onboarding_completed ?? false)
