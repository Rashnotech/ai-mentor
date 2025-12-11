"use client"

import { useState } from "react"
import { WorkspaceHeader } from "@/components/workspace-header"
import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import { MainWorkspace } from "@/components/main-workspace"
import type { ProjectState } from "@/types/course"

// Mock Data for the two different course states
const WEB_DEV_PROJECT: ProjectState = {
  id: "p1",
  type: "code",
  title: "Project 1: Personal Portfolio",
  courseName: "Web Development Fundamentals",
  progress: "In Progress",
  files: [
    {
      name: "index.html",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- Hint: Add your header and navigation here -->
    <header>
        <nav>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#projects">Projects</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="hero">
            <h1>Hi, I'm a Developer</h1>
            <!-- Cursor blinking effect -->
        </section>
    </main>
</body>
</html>`,
    },
    {
      name: "style.css",
      language: "css",
      content: `body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
}

header {
  background: #333;
  color: white;
  padding: 1rem;
}`,
    },
    { name: "script.js", language: "javascript", content: `console.log("Welcome to my portfolio!");` },
  ],
  tasks: [
    { id: "t1", text: "Create the index.html file structure", completed: true },
    { id: "t2", text: "Add a header and navigation section", completed: false },
    { id: "t3", text: "Build the 'Projects' showcase grid", completed: false },
    { id: "t4", text: "Link style.css and add basic styles", completed: false },
  ],
  aiSuggestions: [
    {
      id: "s1",
      type: "suggestion",
      title: "Semantic HTML",
      message:
        "You've created the basic structure, but consider using the `<main>` tag to wrap your primary content for better accessibility.",
    },
    {
      id: "s2",
      type: "fix",
      title: "Viewport Meta Tag",
      message: "Don't forget to add the viewport meta tag to ensure your portfolio looks good on mobile devices.",
    },
  ],
}

const DATA_SCIENCE_PROJECT: ProjectState = {
  id: "p2",
  type: "spreadsheet",
  title: "Project 1: Quarterly Sales Report",
  courseName: "Microsoft Excel for Beginners",
  progress: "In Progress",
  files: [{ name: "quarterly_sales_v1.xlsx", size: "1.2 MB", uploadedAt: "2 mins ago" }],
  tasks: [
    { id: "d1", text: "Download and import the sales data", completed: true },
    { id: "d2", text: "Calculate total sales using SUM formula", completed: true },
    { id: "d3", text: "Create a summary pivot table", completed: false },
    { id: "d4", text: "Design a bar chart from the pivot table", completed: false },
  ],
  aiSuggestions: [
    {
      id: "e1",
      type: "efficiency",
      title: "Formula Efficiency",
      message:
        "Good use of `SUM` in column E. However, consider using `SUMIF` if you want to calculate totals based on specific regions dynamically.",
    },
    {
      id: "e2",
      type: "chart",
      title: "Chart Improvement",
      message:
        "Your bar chart is clear, but adding data labels would improve readability for stakeholders without needing to hover.",
    },
  ],
}

export default function Page() {
  const [currentProject, setCurrentProject] = useState<ProjectState>(WEB_DEV_PROJECT)
  const [isAiOpen, setIsAiOpen] = useState(false)

  const toggleProject = () => {
    setCurrentProject((prev) => (prev.id === "p1" ? DATA_SCIENCE_PROJECT : WEB_DEV_PROJECT))
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      <WorkspaceHeader
        project={currentProject}
        onSwitchProject={toggleProject}
        isAiOpen={isAiOpen}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Instructions & Files */}
        <SidebarLeft project={currentProject} />

        {/* Main Workspace: Editor or Spreadsheet */}
        <MainWorkspace project={currentProject} />

        {/* Right Sidebar: AI Mentor */}
        <SidebarRight project={currentProject} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      </div>
    </div>
  )
}
