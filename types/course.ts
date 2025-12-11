export type CourseType = "code" | "spreadsheet" | "design"

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface FileData {
  name: string
  language?: string
  content?: string
  size?: string
  uploadedAt?: string
}

export interface AISuggestion {
  id: string
  type: "suggestion" | "fix" | "efficiency" | "chart"
  title: string
  message: string
}

export interface ProjectState {
  id: string
  type: CourseType
  title: string
  courseName: string
  progress: "Not Started" | "In Progress" | "Completed"
  files: FileData[]
  tasks: Task[]
  aiSuggestions: AISuggestion[]
}
