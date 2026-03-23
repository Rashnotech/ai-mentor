"use client"

import { useState, useRef, useEffect } from "react"
import type { ProjectState } from "@/types/course"
import {
  Bot,
  Lightbulb,
  Zap,
  BarChart3,
  Send,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  User,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarRightProps {
  project: ProjectState
  isOpen?: boolean
  onClose?: () => void
}

type Tab = "mentor" | "reviews" | "path"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function SidebarRight({ project, isOpen = true, onClose }: SidebarRightProps) {
  const [activeTab, setActiveTab] = useState<Tab>("mentor")
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome message based on project
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi there! I've analyzed your ${project.type} project. I found a few ways to improve your ${
          project.type === "code" ? "code structure" : "data model"
        }. Want to see them?`,
      },
    ])
  }, [project.id, project.type])

  const handleSendMessage = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "That's a great question. Based on your current project structure, I would recommend focusing on modularity. Would you like to see a refactoring example?",
        },
      ])
    }, 1000)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-30 w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl transition-transform duration-300 ease-in-out transform",
        "xl:relative xl:translate-x-0 xl:shadow-none xl:z-0",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">AI Mentor</h2>
              <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
          <button onClick={onClose} className="xl:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab("mentor")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "mentor" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "reviews" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reviews
          </button>
          <button
            onClick={() => setActiveTab("path")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "path" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Path
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {activeTab === "mentor" && (
          <div className="space-y-4">
            {/* Chat Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "assistant" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600",
                  )}
                >
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "p-3 rounded-2xl shadow-sm border text-sm max-w-[80%]",
                    msg.role === "assistant"
                      ? "bg-white border-gray-100 text-gray-700 rounded-tl-none"
                      : "bg-blue-600 border-blue-600 text-white rounded-tr-none",
                  )}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Contextual Suggestions */}
            {messages.length === 1 &&
              project.aiSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {suggestion.type === "suggestion" && <Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
                    {suggestion.type === "efficiency" && <Zap className="w-3.5 h-3.5 text-blue-500" />}
                    {suggestion.type === "chart" && <BarChart3 className="w-3.5 h-3.5 text-purple-500" />}
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {suggestion.title}
                    </span>
                  </div>
                  <div
                    className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 hover:border-violet-200 transition-all cursor-pointer group"
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: Date.now().toString(),
                          role: "user",
                          content: `Tell me more about ${suggestion.title}`,
                        },
                      ])
                      setTimeout(() => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: (Date.now() + 1).toString(),
                            role: "assistant",
                            content: suggestion.message,
                          },
                        ])
                      }, 600)
                    }}
                  >
                    <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-900">
                      {suggestion.message}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-md hover:bg-violet-100 transition-colors">
                        Show Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        {/* ... existing reviews tab ... */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-green-900">Project Status: On Track</h3>
              </div>
              <p className="text-xs text-green-700">You've completed 85% of the requirements for this module.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Latest Review</h3>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">accessibility-check.js</span>
                  <span className="text-[10px] font-mono text-gray-400">Just now</span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">Missing ARIA labels</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        The navigation buttons lack descriptive labels for screen readers.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">Responsive Design</p>
                      <p className="text-xs text-gray-500 mt-0.5">Layout adapts perfectly to mobile viewports.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... existing path tab ... */}
        {activeTab === "path" && (
          <div className="space-y-1">
            <div className="px-4 py-6 text-center border-b border-gray-100 -mx-4 -mt-4 bg-white mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Personalized Path</h3>
              <p className="text-xs text-gray-500 mt-1">Based on your velocity, here's what's next.</p>
            </div>

            <div className="relative pl-4 space-y-6">
              {/* Connector Line */}
              <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-gray-100" />

              {/* Steps */}
              <div className="relative flex gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-white shrink-0 z-10 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-0.5">Completed</p>
                  <h4 className="text-sm font-medium text-gray-900">HTML Structure</h4>
                  <p className="text-xs text-gray-500 mt-1">Mastered semantic tags and document outline.</p>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white shrink-0 z-10 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-0.5">Current Focus</p>
                  <h4 className="text-sm font-medium text-gray-900">CSS Grid Layouts</h4>
                  <p className="text-xs text-gray-500 mt-1">Learn to create 2-dimensional layouts efficiently.</p>
                  <button className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Start Lesson <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="relative flex gap-4 opacity-50">
                <div className="w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white shrink-0 z-10 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">Up Next</p>
                  <h4 className="text-sm font-medium text-gray-900">Responsive Images</h4>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Input */}
      {activeTab === "mentor" && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask your AI mentor..."
              className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-gray-400">AI analyzes code in real-time.</p>
            <button
              onClick={() =>
                setMessages([
                  {
                    id: "welcome",
                    role: "assistant",
                    content: `Hi there! I've analyzed your ${project.type} project. I found a few ways to improve your ${project.type === "code" ? "code structure" : "data model"}. Want to see them?`,
                  },
                ])
              }
              className="text-[10px] font-medium text-gray-500 hover:text-gray-900"
            >
              Clear Chat
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
