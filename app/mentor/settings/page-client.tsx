"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { authApi, getApiErrorMessage, MentorProfileResponse } from "@/lib/api"
import { toast } from "sonner"
import {
  Plus,
  X,
  Save,
  FileText,
  CheckCircle,
  Loader2,
  Building2,
  Languages,
  Briefcase,
} from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [expertise, setExpertise] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [newExpertise, setNewExpertise] = useState("")
  const [newLanguage, setNewLanguage] = useState("")
  const [showAddExpertise, setShowAddExpertise] = useState(false)
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Form state for profile
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    bio: "",
    github_username: "",
    linkedin_username: "",
  })

  // Mentor-specific form state
  const [mentorFormData, setMentorFormData] = useState({
    title: "", // profession
    company: "",
    years_experience: 0,
    timezone: "UTC",
  })

  // Fetch mentor profile
  const { data: mentorProfile, isLoading: isLoadingMentorProfile } = useQuery({
    queryKey: ["mentor-profile"],
    queryFn: () => authApi.getMentorProfile(),
    enabled: !!user,
    staleTime: 30000,
  })

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        bio: user.bio || "",
        github_username: user.github_username || "",
        linkedin_username: user.linkedin_username || "",
      })
      if (user.avatar_url) {
        setProfileImage(user.avatar_url)
      }
    }
  }, [user])

  // Initialize mentor form data when mentor profile loads
  useEffect(() => {
    if (mentorProfile) {
      setMentorFormData({
        title: mentorProfile.title || "",
        company: mentorProfile.company || "",
        years_experience: mentorProfile.years_experience || 0,
        timezone: mentorProfile.timezone || "UTC",
      })
      setExpertise(mentorProfile.expertise || [])
      setLanguages(mentorProfile.languages || [])
    }
  }, [mentorProfile])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; bio?: string; github_username?: string; linkedin_username?: string }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Profile updated successfully!", {
        description: "Your changes have been saved.",
      })
      setHasChanges(false)
      // Invalidate user queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user"] })
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update mentor profile mutation
  const updateMentorProfileMutation = useMutation({
    mutationFn: (data: {
      title?: string
      company?: string
      languages?: string[]
      expertise?: string[]
      years_experience?: number
      timezone?: string
    }) => authApi.updateMentorProfile(data),
    onSuccess: () => {
      toast.success("Mentor profile updated!", {
        description: "Your professional details have been saved.",
      })
      setHasChanges(false)
      queryClient.invalidateQueries({ queryKey: ["mentor-profile"] })
    },
    onError: (error) => {
      toast.error("Failed to update mentor profile", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update avatar mutation
  const updateAvatarMutation = useMutation({
    mutationFn: (avatarUrl: string) => authApi.updateAvatar(avatarUrl),
    onSuccess: () => {
      toast.success("Avatar updated!", {
        description: "Your profile photo has been saved.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
    onError: (error) => {
      toast.error("Failed to update avatar", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleMentorFormChange = (field: string, value: string | number) => {
    setMentorFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSaveChanges = () => {
    // Save basic profile
    updateProfileMutation.mutate({
      full_name: formData.full_name,
      bio: formData.bio,
      github_username: formData.github_username || undefined,
      linkedin_username: formData.linkedin_username || undefined,
    })

    // Save mentor profile
    updateMentorProfileMutation.mutate({
      title: mentorFormData.title || undefined,
      company: mentorFormData.company || undefined,
      languages: languages.length > 0 ? languages : undefined,
      expertise: expertise.length > 0 ? expertise : undefined,
      years_experience: mentorFormData.years_experience || undefined,
      timezone: mentorFormData.timezone || undefined,
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Image = reader.result as string
        setProfileImage(base64Image)
        // For now, we'll use a placeholder URL service
        // In production, upload to cloud storage and get URL
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || Date.now()}`
        updateAvatarMutation.mutate(avatarUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddExpertise = () => {
    if (newExpertise.trim() && !expertise.includes(newExpertise.trim())) {
      setExpertise([...expertise, newExpertise.trim()])
      setNewExpertise("")
      setShowAddExpertise(false)
      setHasChanges(true)
    }
  }

  const handleRemoveExpertise = (skillToRemove: string) => {
    setExpertise(expertise.filter(skill => skill !== skillToRemove))
    setHasChanges(true)
  }

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()])
      setNewLanguage("")
      setShowAddLanguage(false)
      setHasChanges(true)
    }
  }

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(languages.filter(lang => lang !== langToRemove))
    setHasChanges(true)
  }

  // Helper to get user initials
  const getUserInitials = () => {
    if (!user?.full_name) return "M"
    return user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)
  }

  const isSaving = updateProfileMutation.isPending || updateMentorProfileMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm">Manage your mentor profile and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profileImage || user?.avatar_url ? (
                <img 
                  src={profileImage || user?.avatar_url || ""} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {getUserInitials()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                <Plus className="w-4 h-4 text-white" />
                <input 
                  type="file" 
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Photo
                  </span>
                </Button>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
              {profileImage && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 mt-1 p-0 h-auto"
                  onClick={() => setProfileImage(null)}
                >
                  Remove Photo
                </Button>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleFormChange("full_name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
              <input
                type="text"
                value={formData.github_username}
                onChange={(e) => handleFormChange("github_username", e.target.value)}
                placeholder="github-username"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn Username</label>
              <input
                type="text"
                value={formData.linkedin_username}
                onChange={(e) => handleFormChange("linkedin_username", e.target.value)}
                placeholder="linkedin-username"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Profession/Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-1" />
                Profession / Title
              </label>
              <input
                type="text"
                value={mentorFormData.title}
                onChange={(e) => handleMentorFormChange("title", e.target.value)}
                placeholder="e.g., Senior Data Scientist"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Company
              </label>
              <input
                type="text"
                value={mentorFormData.company}
                onChange={(e) => handleMentorFormChange("company", e.target.value)}
                placeholder="e.g., Google, Microsoft"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
              <input
                type="number"
                min="0"
                value={mentorFormData.years_experience}
                onChange={(e) => handleMentorFormChange("years_experience", parseInt(e.target.value) || 0)}
                placeholder="5"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleFormChange("bio", e.target.value)}
                placeholder="Tell students about your experience and expertise..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.bio.length}/500 characters</p>
            </div>

            {/* Languages */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Languages className="w-4 h-4 inline mr-1" />
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {languages.map((lang, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-700 border-0 px-3 py-1">
                    {lang}
                    <button 
                      onClick={() => handleRemoveLanguage(lang)}
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {showAddLanguage ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddLanguage()}
                      placeholder="e.g., English"
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddLanguage} className="h-7 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddLanguage(false); setNewLanguage("") }} className="h-7">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-green-600 border-dashed"
                    onClick={() => setShowAddLanguage(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Language
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Add languages you can communicate in</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Expertise</label>
              <div className="flex flex-wrap gap-2 items-center">
                {expertise.map((skill, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-700 border-0 px-3 py-1">
                    {skill}
                    <button 
                      onClick={() => handleRemoveExpertise(skill)}
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {showAddExpertise ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newExpertise}
                      onChange={(e) => setNewExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddExpertise()}
                      placeholder="Enter skill..."
                      className="px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddExpertise} className="h-7 bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddExpertise(false); setNewExpertise("") }} className="h-7">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-blue-600 border-dashed"
                    onClick={() => setShowAddExpertise(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Expertise
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Add your areas of expertise to help students find you</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "New session requests", description: "Get notified when students request a session" },
            { label: "Session reminders", description: "Receive reminders before scheduled sessions" },
            { label: "New reviews", description: "Get notified when students leave reviews" },
            { label: "Platform updates", description: "Receive updates about new features and improvements" },
          ].map((setting, idx) => (
            <div key={idx} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-500">{setting.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        {hasChanges && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            You have unsaved changes
          </p>
        )}
        <div className="flex-1" />
        <Button 
          onClick={handleSaveChanges}
          disabled={isSaving || !hasChanges}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
