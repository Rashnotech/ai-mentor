"use client"

import { Play, Layout, Bell, Menu, MonitorPlay, Bot } from "lucide-react"
import type { ProjectState } from "@/types/course"

interface WorkspaceHeaderProps {
  project: ProjectState
  onSwitchProject: () => void
  isAiOpen: boolean
  onToggleAi: () => void
}

export function WorkspaceHeader({ project, onSwitchProject, isAiOpen, onToggleAi }: WorkspaceHeaderProps) {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Layout className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
              {project.courseName}
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide">
                {project.progress}
              </span>
            </span>
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">{project.title}</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSwitchProject}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-all mr-4 border border-gray-200"
        >
          <MonitorPlay className="w-3.5 h-3.5" />
          Switch Context ({project.type === "code" ? "Spreadsheet" : "Coding"})
        </button>

        <button
          onClick={onToggleAi}
          className={`p-2 rounded-full transition-colors xl:hidden ${isAiOpen ? "bg-violet-100 text-violet-600" : "text-gray-400 hover:bg-gray-100"}`}
        >
          <Bot className="w-5 h-5" />
        </button>

        {project.type === "code" && (
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-md border border-gray-200 transition-all">
            <Play className="w-4 h-4 fill-gray-700" />
            Run Code
          </button>
        )}

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-all shadow-blue-200">
          Submit Project
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-medium text-sm border border-indigo-200">
          JD
        </button>
      </div>
    </header>
  )
}
