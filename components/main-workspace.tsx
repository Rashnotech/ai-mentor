import type { ProjectState } from "@/types/course"
import { CodeEditor } from "./editors/code-editor"
import { SpreadsheetView } from "./editors/spreadsheet-view"

interface MainWorkspaceProps {
  project: ProjectState
}

export function MainWorkspace({ project }: MainWorkspaceProps) {
  return (
    <main className="flex-1 bg-gray-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Workspace Content */}
      {project.type === "code" ? <CodeEditor files={project.files} /> : <SpreadsheetView files={project.files} />}
    </main>
  )
}
