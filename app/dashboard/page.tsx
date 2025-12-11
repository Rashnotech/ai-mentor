"use client"

import { useState } from "react"
import {
  Bell,
  Search,
  Folder,
  BookOpen,
  User,
  Menu,
  LayoutDashboard,
  Settings,
  LogOut,
  Award,
  Star,
  Edit2,
  Github,
  Linkedin,
  Users,
  MessageSquare,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// --- Mock Data ---
const COURSES = [
  {
    id: 1,
    title: "Advanced Python Bootcamp",
    progress: 75,
    totalModules: 12,
    completedModules: 9,
    image: "/placeholder.svg?height=100&width=200",
    category: "Development",
  },
  {
    id: 2,
    title: "React for Beginners",
    progress: 40,
    totalModules: 8,
    completedModules: 3,
    image: "/placeholder.svg?height=100&width=200",
    category: "Frontend",
  },
  {
    id: 3,
    title: "Data Science Fundamentals",
    progress: 10,
    totalModules: 15,
    completedModules: 1,
    image: "/placeholder.svg?height=100&width=200",
    category: "Data Science",
  },
]

const PROJECTS = [
  {
    id: 101,
    title: "E-commerce API",
    status: "In Progress",
    tech: ["Node.js", "Express", "MongoDB"],
    lastEdited: "2 hours ago",
  },
  {
    id: 102,
    title: "Portfolio Website",
    status: "Completed",
    tech: ["React", "Tailwind"],
    lastEdited: "1 week ago",
  },
  {
    id: 103,
    title: "Weather Dashboard",
    status: "Not Started",
    tech: ["JavaScript", "API"],
    lastEdited: "-",
  },
]

const NOTIFICATIONS = [
  { id: 1, text: "Your project 'Portfolio' was reviewed by AI.", time: "1 hour ago", read: false },
  { id: 2, text: "New module unlocked in Advanced Python.", time: "3 hours ago", read: false },
  { id: 3, text: "You earned the 'Bug Squasher' badge!", time: "1 day ago", read: true },
]

// --- Sub-Components ---

function DashboardView({ onChangeView }: { onChangeView: (view: string) => void }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Stats */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Alex!</h1>
        <p className="text-gray-500">Let's continue your learning journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Courses in Progress", value: "3", color: "bg-blue-50 text-blue-700" },
          { label: "Projects Completed", value: "5", color: "bg-green-50 text-green-700" },
          { label: "Skills Mastered", value: "12", color: "bg-purple-50 text-purple-700" },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border border-gray-100 ${stat.color} bg-opacity-50`}>
            <div className="text-sm font-medium opacity-80 mb-1">{stat.label}</div>
            <div className="text-4xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col - Courses */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
            <Button
              variant="ghost"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => onChangeView("my-courses")}
            >
              View All
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {COURSES.slice(0, 2).map((course) => (
              <div
                key={course.id}
                className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  {/* Placeholder for image */}
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-300">
                    <BookOpen className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {course.completedModules}/{course.totalModules} Modules
                </p>
                <div className="w-full bg-gray-100 h-2 rounded-full mb-4">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${course.progress}%` }} />
                </div>
                <Link
                  href={`/courses/${course.id}/learn`}
                  className="block w-full text-center py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors"
                >
                  Continue Learning
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col - Next Steps & Feedback */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-blue-700 font-medium">
              <Award className="w-5 h-5" />
              Your Next Steps
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Based on your progress in <span className="font-semibold text-gray-900">Advanced Python</span>, we suggest
              starting the next module.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
              <div className="text-xs text-blue-600 font-semibold mb-1">Module 4</div>
              <div className="font-medium text-gray-900">Working with APIs</div>
            </div>
            <Link href="/courses/1/learn" className="block w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Start Next Module</Button>
            </Link>
          </div>

          <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-yellow-400 font-medium">
              <Star className="w-5 h-5" />
              AI Mentor Feedback
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-300 italic">
                "Your code for Project X has been reviewed. You have an opportunity to optimize your loop on line 32..."
              </div>
              <button className="text-sm text-blue-300 hover:underline">View full feedback →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyCoursesView() {
  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course) => (
          <div key={course.id} className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-gray-300" />
            </div>
            <div className="mb-2">
              <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded border border-gray-100">
                {course.category}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{course.title}</h3>
            <div className="w-full bg-gray-100 h-2 rounded-full mb-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${course.progress}%` }} />
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-gray-500">{course.progress}% Complete</span>
              <Link href={`/courses/${course.id}/learn`} className="text-sm font-medium text-blue-600 hover:underline">
                Continue
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileView() {
  const [isEditing, setIsEditing] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [profile, setProfile] = useState({
    name: "Alex Doe",
    bio: "Full Stack Developer",
    email: "alex.doe@example.com",
    github: "alexdoe",
    linkedin: "alexdoe",
  })

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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h2>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
              AD
            </div>
          </div>
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{profile.name}</h3>
                <p className="text-gray-500">{profile.bio} • Joined Jan 2025</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-2">
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
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <input
                  type="text"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Username</label>
                <div className="flex items-center gap-2">
                  <Github className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={profile.github}
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
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
                    value={profile.linkedin}
                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                    placeholder="yourusername"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={() => setIsEditing(false)}>
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{profile.email}</p>
              </div>
              <div className="flex gap-4">
                {profile.github && (
                  <a
                    href={`https://github.com/${profile.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <Github className="w-5 h-5" />
                    <span className="text-sm">@{profile.github}</span>
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${profile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                    <span className="text-sm">@{profile.linkedin}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-gray-500 text-sm mb-1">Total XP</div>
                <div className="text-xl font-bold text-gray-900">12,450</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-gray-500 text-sm mb-1">Streak</div>
                <div className="text-xl font-bold text-gray-900">14 Days</div>
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

              <Link href="/login">
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-sm text-red-600 flex items-center justify-between border border-red-100">
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </Link>
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
    </div>
  )
}

function ProjectsView() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
        <Link href="/workspace">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">New Project</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {PROJECTS.map((project) => (
          <div
            key={project.id}
            className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-gray-900 text-lg">{project.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : project.status === "In Progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <div className="flex gap-2 mb-2">
                {project.tech.map((t) => (
                  <span key={t} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-100">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400">Last edited: {project.lastEdited}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/workspace">
                <Button variant="outline" size="sm">
                  View Code
                </Button>
              </Link>
              <Link href="/workspace">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Open in Workspace
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommunityView() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Community</h2>
        <p className="text-gray-600">Connect with fellow learners, share projects, and collaborate</p>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="text-2xl font-bold text-gray-900">12.5K+</div>
          <div className="text-sm text-gray-600">Active Members</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="text-2xl font-bold text-gray-900">3.2K</div>
          <div className="text-sm text-gray-600">Projects Shared</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="text-2xl font-bold text-gray-900">850</div>
          <div className="text-sm text-gray-600">Study Groups</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="text-2xl font-bold text-gray-900">24/7</div>
          <div className="text-sm text-gray-600">Peer Support</div>
        </div>
      </div>

      {/* Discussion Forums */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Popular Discussions</h3>
        <div className="space-y-3">
          {[
            {
              title: "How to debug React useState hooks?",
              author: "Sarah Chen",
              replies: 24,
              category: "Web Development",
              time: "2h ago",
            },
            {
              title: "Best practices for Python data structures",
              author: "Mike Johnson",
              replies: 18,
              category: "Data Science",
              time: "5h ago",
            },
            {
              title: "Project Showcase: AI-powered Recipe Generator",
              author: "Emma Wilson",
              replies: 42,
              category: "Showcase",
              time: "1d ago",
            },
            {
              title: "Looking for study partners for Next.js course",
              author: "Alex Kumar",
              replies: 15,
              category: "Study Groups",
              time: "2d ago",
            },
          ].map((discussion, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1 truncate">{discussion.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {discussion.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {discussion.replies} replies
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                      {discussion.category}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{discussion.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Active Study Groups</h3>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            Create Group
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: "React Builders Circle",
              members: 156,
              course: "Advanced React & State Management",
              nextMeeting: "Today, 7:00 PM",
            },
            {
              name: "Python Data Warriors",
              members: 89,
              course: "Data Science & Machine Learning",
              nextMeeting: "Tomorrow, 3:00 PM",
            },
            {
              name: "Full-Stack Ninjas",
              members: 203,
              course: "The Complete Node.js Developer Course",
              nextMeeting: "Friday, 6:00 PM",
            },
            {
              name: "UI/UX Design Squad",
              members: 67,
              course: "UI/UX Design Fundamentals with Figma",
              nextMeeting: "Saturday, 2:00 PM",
            },
          ].map((group, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all"
            >
              <h4 className="font-bold text-gray-900 mb-2">{group.name}</h4>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.course}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {group.members} members
                </span>
                <span className="text-blue-600 font-medium">{group.nextMeeting}</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent">
                Join Group
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Main Page Component ---

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState("dashboard")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Sub-navigation render logic
  const renderContent = () => {
    switch (currentView) {
      case "my-courses":
        return <MyCoursesView />
      case "projects":
        return <ProjectsView />
      case "community":
        return <CommunityView />
      case "profile":
        return <ProfileView />
      case "dashboard":
      default:
        return <DashboardView onChangeView={setCurrentView} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center gap-2 text-blue-600">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">LearnTech</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "dashboard"
                  ? "text-blue-600 bg-blue-50 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("dashboard")
                setShowMobileMenu(false)
              }}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "my-courses"
                  ? "text-blue-600 bg-blue-50 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("my-courses")
                setShowMobileMenu(false)
              }}
            >
              <BookOpen className="w-5 h-5" />
              My Courses
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "projects" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("projects")
                setShowMobileMenu(false)
              }}
            >
              <Folder className="w-5 h-5" />
              Projects
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "community"
                  ? "text-blue-600 bg-blue-50 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("community")
                setShowMobileMenu(false)
              }}
            >
              <Users className="w-5 h-5" />
              Community
            </Button>
            <Link href="/workspace">
              <Button variant="ghost" className="w-full justify-start gap-3 font-medium text-gray-600 hover:bg-gray-50">
                <Star className="w-5 h-5" />
                AI Mentor Chat
              </Button>
            </Link>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 font-medium ${
                currentView === "profile" ? "text-blue-600 bg-blue-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => {
                setCurrentView("profile")
                setShowMobileMenu(false)
              }}
            >
              <User className="w-5 h-5" />
              Profile
            </Button>
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="p-4 rounded-xl bg-gray-900 text-white">
              <p className="text-sm font-medium mb-1">Pro Plan</p>
              <p className="text-xs text-gray-400 mb-3">Get unlimited AI access</p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                Upgrade
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                AD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Alex Doe</p>
                <p className="text-xs text-gray-500 truncate">Beginner Level</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-2 text-gray-500"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="hidden sm:flex relative w-64 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses, projects..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <span className="font-semibold text-sm">Notifications</span>
                      <button className="text-xs text-blue-600 hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {NOTIFICATIONS.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}
                        >
                          <p className="text-sm text-gray-800 mb-1">{n.text}</p>
                          <p className="text-xs text-gray-400">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown Menu */}
            <div className="relative">
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs cursor-pointer hover:bg-blue-200 transition-colors"
              >
                AD
              </div>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-900">Alex Doe</p>
                      <p className="text-xs text-gray-500">alex.doe@example.com</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView("profile")
                        setShowProfileMenu(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-3"
                    >
                      <User className="w-4 h-4" />
                      Update Profile
                    </button>
                    <Link href="/admin">
                      <button className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm text-purple-600 flex items-center gap-3">
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </button>
                    </Link>
                    <Link href="/login">
                      <button className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-3 border-t border-gray-100 mt-1 pt-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  )
}
