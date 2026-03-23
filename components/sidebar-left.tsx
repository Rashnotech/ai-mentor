"use client"

import type { ProjectState } from "@/types/course"
import { BookOpen, FolderOpen, CheckSquare, FileCode, FileSpreadsheet } from "lucide-react"
import { useState } from "react"

interface SidebarLeftProps {
  project: ProjectState
}

export function SidebarLeft({ project }: SidebarLeftProps) {
  const [activeTab, setActiveTab] = useState<"instructions" | "explorer">("instructions")

  return (
    <aside className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0 hidden lg:flex">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("instructions")}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === "instructions"
              ? "border-blue-600 text-blue-600 bg-blue-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Instructions
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === "explorer"
              ? "border-blue-600 text-blue-600 bg-blue-50/30"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Files
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "instructions" ? (
          <div className="space-y-8">
            <section>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3">Project Goal</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {project.type === "code"
                  ? "Build a responsive personal portfolio website to showcase your skills and projects using semantic HTML and modern CSS."
                  : "Analyze the provided sales data to create a quarterly report, including key metrics and a sales trend visualization."}
              </p>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3">Learning Objectives</h3>
              <ul className="space-y-2">
                {(project.type === "code"
                  ? [
                      "Structure a webpage with semantic HTML",
                      "Style elements using modern CSS techniques",
                      "Implement responsive design",
                      "Deploy a static website",
                    ]
                  : [
                      "Utilize basic Excel formulas like SUM and AVERAGE",
                      "Clean and format raw data",
                      "Create pivot tables to summarize data",
                      "Generate charts for visualization",
                    ]
                ).map((obj, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                    {obj}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3 flex items-center gap-2">
                Task List
                <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 rounded-full">
                  {project.tasks.filter((t) => t.completed).length}/{project.tasks.length}
                </span>
              </h3>
              <div className="space-y-3">
                {project.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 group cursor-pointer">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        task.completed
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 group-hover:border-blue-400"
                      }`}
                    >
                      {task.completed && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className={`text-sm leading-tight ${
                        task.completed ? "text-gray-400 line-through decoration-gray-300" : "text-gray-700"
                      }`}
                    >
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-gray-400 font-semibold px-2 mb-2">Project Files</h3>
            {project.files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              >
                {project.type === "code" ? (
                  <FileCode className="w-4 h-4 text-blue-500" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                  {file.size && <span className="text-[10px] text-gray-400">{file.size}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
