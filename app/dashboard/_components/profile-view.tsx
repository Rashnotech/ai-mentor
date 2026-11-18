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
  Mail,
  Calendar,
  Zap,
  Flame,
  ExternalLink,
  User,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useUserStore } from "@/lib/stores/user-store"
import { useAuth } from "@/lib/auth-context"
import { authApi, gamificationApi, rewardsApi, type CertificateResponse } from "@/lib/api"

export function ProfileView() {
  const [isEditing, setIsEditing] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [certificates, setCertificates] = useState<CertificateResponse[]>([])

  // Get user from Zustand store
  const user = useUserStore((state) => state.user)
  const updateUser = useUserStore((state) => state.updateUser)

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
      const [profileResponse, gamificationResponse, certificateResponse] = await Promise.all([
        authApi.getMe(),
        gamificationApi.getMyGamification().catch(() => null),
        rewardsApi.getMyCertificates().catch(() => []),
      ])
      setCertificates(certificateResponse)

      if (profileResponse?.user) {
        updateUser({
          full_name: profileResponse.user.full_name,
          email: profileResponse.user.email,
          bio: profileResponse.user.bio,
          github_username: profileResponse.user.github_username,
          linkedin_username: profileResponse.user.linkedin_username,
          avatar_url: profileResponse.user.avatar_url,
          is_verified: profileResponse.user.is_verified,
          ...(gamificationResponse && {
            total_xp: gamificationResponse.total_xp,
            streak_days: gamificationResponse.current_streak,
          }),
        })
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

  useEffect(() => {
    fetchProfile()
  }, [])

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return "Recently"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }

  const formatCertificateDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await authApi.updateProfile({
        full_name: formData.full_name,
        bio: formData.bio || undefined,
        github_username: formData.github_username || undefined,
        linkedin_username: formData.linkedin_username || undefined,
      })

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your student identity, social profiles, and earned certificates
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchProfile}
          disabled={isLoading}
          className="text-gray-600 hover:text-gray-900 rounded-xl border-gray-200"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading profile...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Three Solid Color Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#2563EB] text-white shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-100 mb-1">Total XP</div>
                <div className="text-4xl font-bold tracking-tight">
                  {user?.total_xp?.toLocaleString() || "0"}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#1D4ED8] flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#EA580C] text-white shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-orange-100 mb-1">Learning Streak</div>
                <div className="text-4xl font-bold tracking-tight">
                  {user?.streak_days || 0} <span className="text-lg font-semibold">Days</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#C2410C] flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#16A34A] text-white shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-100 mb-1">Certificates Earned</div>
                <div className="text-4xl font-bold tracking-tight">{certificates.length}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#15803D] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Main Two-Column Profile Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Identity Card & Account Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="h-24 bg-[#1E293B]" />
                <div className="px-6 pb-6">
                  <div className="relative -mt-12 mb-4 flex items-end justify-between">
                    <div className="relative">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-24 h-24 rounded-2xl border-4 border-white object-cover bg-white shadow-xs"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl border-4 border-white bg-[#2563EB] flex items-center justify-center text-2xl font-bold text-white shadow-xs">
                          {getInitials(user?.full_name || "User")}
                        </div>
                      )}
                      {user?.is_verified && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-[#16A34A] text-white rounded-full p-1 border-2 border-white"
                          title="Verified Student"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {user?.role && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#EBF2FF] text-[#2563EB] capitalize">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {user.role}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">{user?.full_name || "User"}</h3>
                  <div className="mt-2 space-y-1.5 text-xs text-gray-500">
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{user?.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Joined {formatJoinDate(user?.created_at)}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Connected Accounts
                    </p>
                    <div className="flex flex-col gap-2">
                      {user?.github_username ? (
                        <a
                          href={`https://github.com/${user.github_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-3.5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <Github className="w-4 h-4" />@{user.github_username}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F4F5F7] text-gray-400 rounded-xl text-xs">
                          <Github className="w-4 h-4" />
                          <span>GitHub not connected</span>
                        </div>
                      )}

                      {user?.linkedin_username ? (
                        <a
                          href={`https://linkedin.com/in/${user.linkedin_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between px-3.5 py-2.5 bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors text-xs font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <Linkedin className="w-4 h-4" />@{user.linkedin_username}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F4F5F7] text-gray-400 rounded-xl text-xs">
                          <Linkedin className="w-4 h-4" />
                          <span>LinkedIn not connected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Settings & Sign Out Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Account &amp; Preferences</h4>
                <button
                  type="button"
                  onClick={() => setShowAccountSettings(!showAccountSettings)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F4F5F7] text-gray-700 text-xs font-semibold flex items-center justify-between border border-gray-200 transition-colors cursor-pointer"
                >
                  <span>Account Settings</span>
                  <Settings className="w-4 h-4 text-gray-500" />
                </button>

                {showAccountSettings && (
                  <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Email Notifications</p>
                        <p className="text-[11px] text-gray-500">Receive updates via email</p>
                      </div>
                      <button
                        type="button"
                        className="w-10 h-5 bg-[#2563EB] rounded-full relative"
                        aria-label="Toggle email notifications"
                      >
                        <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">AI Mentor Feedback</p>
                        <p className="text-[11px] text-gray-500">Enable real-time code reviews</p>
                      </div>
                      <button
                        type="button"
                        className="w-10 h-5 bg-[#2563EB] rounded-full relative"
                        aria-label="Toggle AI mentor feedback"
                      >
                        <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Public Profile</p>
                        <p className="text-[11px] text-gray-500">Show your profile to other learners</p>
                      </div>
                      <button
                        type="button"
                        className="w-10 h-5 bg-gray-300 rounded-full relative"
                        aria-label="Toggle public profile"
                      >
                        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all" />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-600 flex items-center justify-between transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Right Column (2 Cols): Profile Details / Edit Form + Certificates */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF2FF] text-[#2563EB] flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
                      <p className="text-xs text-gray-400">Your public bio and developer links</p>
                    </div>
                  </div>
                  <Button
                    variant={isEditing ? "outline" : "default"}
                    size="sm"
                    onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                    className={
                      isEditing
                        ? "rounded-xl border-gray-200"
                        : "rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                    }
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bio</label>
                      <textarea
                        rows={3}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us about your learning goals and background..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          GitHub Username
                        </label>
                        <div className="relative">
                          <Github className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.github_username}
                            onChange={(e) =>
                              setFormData({ ...formData, github_username: e.target.value })
                            }
                            placeholder="yourusername"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          LinkedIn Username
                        </label>
                        <div className="relative">
                          <Linkedin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={formData.linkedin_username}
                            onChange={(e) =>
                              setFormData({ ...formData, linkedin_username: e.target.value })
                            }
                            placeholder="yourusername"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <Button
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6"
                        onClick={handleSave}
                        disabled={isSaving}
                      >
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
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 bg-[#F8F9FA] rounded-xl border border-gray-100">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                        About Me
                      </label>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {user?.bio || (
                          <span className="text-gray-400 italic">
                            No bio added yet. Click &ldquo;Edit Profile&rdquo; to add one.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F8F9FA] rounded-xl border border-gray-100">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          Full Name
                        </label>
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.full_name || "User"}
                        </p>
                      </div>
                      <div className="p-4 bg-[#F8F9FA] rounded-xl border border-gray-100">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                          Primary Email
                        </label>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Achievements & Certificates Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Achievements &amp; Certificates
                      </h3>
                      <p className="text-xs text-gray-400">
                        Verified credentials from your completed courses
                      </p>
                    </div>
                  </div>
                </div>

                {certificates.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certificates.map((certificate) => (
                      <div
                        key={certificate.certificate_id}
                        className="border border-gray-200 rounded-2xl overflow-hidden hover:border-[#4E89FF] hover:shadow-md transition-all group flex flex-col justify-between"
                      >
                        <div className="bg-[#1E293B] p-5 flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
                              <Award className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block">
                                Verified Credential
                              </span>
                              <span className="text-xs font-semibold text-white">
                                Rashnotech Academy
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">
                              {certificate.course_title || `Course #${certificate.course_id}`}
                            </h4>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-1">
                              {certificate.path_title || "Course completion certificate"}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">
                              {formatCertificateDate(certificate.issued_at)}
                            </span>
                            <a
                              href={certificate.certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EBF2FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white text-xs font-semibold transition-colors"
                            >
                              View
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#F8F9FA] rounded-2xl border border-dashed border-gray-200">
                    <Award className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">No certifications yet</p>
                    <p className="text-xs text-gray-400">
                      Complete your enrolled courses and projects to earn verified certificates!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
