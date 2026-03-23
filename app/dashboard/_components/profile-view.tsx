"use client"

import { useState, useEffect } from "react"
import {
  LogOut,
  Award,
  Edit2,
  Github,
  Linkedin,
  Settings,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useUserStore } from "@/lib/stores/user-store"
import { useAuth } from "@/lib/auth-context"
import { authApi, gamificationApi } from "@/lib/api"

export function ProfileView() {
  const [isEditing, setIsEditing] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get user from Zustand store
  const user = useUserStore((state) => state.user)
  const updateUser = useUserStore((state) => state.updateUser)
  const setUser = useUserStore((state) => state.setUser)

  // Get logout from auth context
  const { logout } = useAuth()

  // Local form state for editing
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    bio: user?.bio || "",
    email: user?.email || "",
    github_username: user?.github_username || "",
    linkedin_username: user?.linkedin_username || "",
  })

  // Fetch fresh profile data from backend
  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      // Fetch profile and gamification data in parallel
      const [profileResponse, gamificationResponse] = await Promise.all([
        authApi.getMe(),
        gamificationApi.getMyGamification().catch(() => null), // Don't fail if gamification fails
      ])
      
      if (profileResponse?.user) {
        // Update Zustand store with fresh data including gamification
        updateUser({
          full_name: profileResponse.user.full_name,
          email: profileResponse.user.email,
          bio: profileResponse.user.bio,
          github_username: profileResponse.user.github_username,
          linkedin_username: profileResponse.user.linkedin_username,
          avatar_url: profileResponse.user.avatar_url,
          is_verified: profileResponse.user.is_verified,
          // Add gamification data if available
          ...(gamificationResponse && {
            total_xp: gamificationResponse.total_xp,
            streak_days: gamificationResponse.current_streak,
          }),
        })
        // Update form data
        setFormData({
          full_name: profileResponse.user.full_name || "",
          bio: profileResponse.user.bio || "",
          email: profileResponse.user.email || "",
          github_username: profileResponse.user.github_username || "",
          linkedin_username: profileResponse.user.linkedin_username || "",
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
      toast.error("Failed to load profile data")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [])

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Sync form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        bio: user.bio || "",
        email: user.email || "",
        github_username: user.github_username || "",
        linkedin_username: user.linkedin_username || "",
      })
    }
  }, [user])

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Format join date
  const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return "Recently"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Call API to update profile
      const response = await authApi.updateProfile({
        full_name: formData.full_name,
        bio: formData.bio || undefined,
        github_username: formData.github_username || undefined,
        linkedin_username: formData.linkedin_username || undefined,
      })
      
      // Update Zustand store with response from server
      if (response.user) {
        updateUser({
          full_name: response.user.full_name,
          bio: response.user.bio,
          github_username: response.user.github_username,
          linkedin_username: response.user.linkedin_username,
        })
      }
      
      setIsEditing(false)
      toast.success("Profile updated successfully!")
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to current user values
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        bio: user.bio || "",
        email: user.email || "",
        github_username: user.github_username || "",
        linkedin_username: user.linkedin_username || "",
      })
    }
    setIsEditing(false)
  }

  const achievements = [
    {
      id: 1,
      title: "React Fundamentals",
      course: "React for Beginners",
      date: "Jan 15, 2025",
      image: "/placeholder.svg?height=100&width=150",
    },
    {
      id: 2,
      title: "Python Basics",
      course: "The Complete Python Bootcamp",
      date: "Dec 20, 2024",
      image: "/placeholder.svg?height=100&width=150",
    },
    {
      id: 3,
      title: "Web Development",
      course: "Web Development Fundamentals",
      date: "Nov 10, 2024",
      image: "/placeholder.svg?height=100&width=150",
    },
  ]

  return (
    <div className="max-w-4xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchProfile}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading profile...</p>
          </div>
        </div>
      ) : (
        <>
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                {getInitials(user?.full_name || "User")}
              </div>
            )}
            {user?.is_verified && (
              <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{user?.full_name || "User"}</h3>
                <p className="text-gray-500">
                  Joined {formatJoinDate(user?.created_at)}
                </p>
                {user?.role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {user.role}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Editable Profile Fields */}
          {isEditing ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <input
                  type="text"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Username</label>
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.github_username}
                    onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                    placeholder="yourusername"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Username</label>
                <div className="flex items-center gap-2">
                  <Linkedin className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.linkedin_username}
                    onChange={(e) => setFormData({ ...formData, linkedin_username: e.target.value })}
                    placeholder="yourusername"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-5 mb-6">
              {/* Bio Section */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-500 mb-2">About</label>
                <p className="text-gray-900">
                  {user?.bio || <span className="text-gray-400 italic">No bio added yet. Click "Edit Profile" to add one.</span>}
                </p>
              </div>
              
              {/* Email Section */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              
              {/* Social Links Section */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Social Links</label>
                <div className="flex flex-wrap gap-3">
                  {user?.github_username ? (
                    <a
                      href={`https://github.com/${user.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      <span className="text-sm font-medium">@{user.github_username}</span>
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg">
                      <Github className="w-4 h-4" />
                      <span className="text-sm">Not connected</span>
                    </div>
                  )}
                  {user?.linkedin_username ? (
                    <a
                      href={`https://linkedin.com/in/${user.linkedin_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span className="text-sm font-medium">@{user.linkedin_username}</span>
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg">
                      <Linkedin className="w-4 h-4" />
                      <span className="text-sm">Not connected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-gray-500 text-sm mb-1">Total XP</div>
                <div className="text-xl font-bold text-gray-900">{user?.total_xp?.toLocaleString() || "0"}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-gray-500 text-sm mb-1">Streak</div>
                <div className="text-xl font-bold text-gray-900">{user?.streak_days || 0} Days</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Settings</h4>
              <button
                onClick={() => setShowAccountSettings(!showAccountSettings)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center justify-between border border-gray-100"
              >
                <span>Account Settings</span>
                <Settings className="w-4 h-4 text-gray-400" />
              </button>

              {showAccountSettings && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Email Notifications</p>
                        <p className="text-xs text-gray-500">Receive updates via email</p>
                      </div>
                      <button className="w-11 h-6 bg-blue-600 rounded-full relative">
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">AI Mentor Feedback</p>
                        <p className="text-xs text-gray-500">Enable real-time code reviews</p>
                      </div>
                      <button className="w-11 h-6 bg-blue-600 rounded-full relative">
                        <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">Public Profile</p>
                        <p className="text-xs text-gray-500">Show your profile to other learners</p>
                      </div>
                      <button className="w-11 h-6 bg-gray-300 rounded-full relative">
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all"></span>
                      </button>
                    </div>
                    <button className="w-full mt-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors">
                      Delete Account
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-sm text-red-600 flex items-center justify-between border border-red-100 disabled:opacity-50"
              >
                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements/Certifications Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Achievements & Certificates</h3>
        </div>
        {achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                  <img
                    src={achievement.image || "/placeholder.svg"}
                    alt={achievement.title}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 mb-1">{achievement.title}</h4>
                  <p className="text-sm text-gray-500 mb-2">{achievement.course}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{achievement.date}</span>
                    <button className="text-xs text-blue-600 hover:underline">View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No certifications yet. Complete courses to earn them!</p>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
