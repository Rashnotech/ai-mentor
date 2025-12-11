"use client"

import type { FileData } from "@/types/course"
import { useState } from "react"
import { X } from "lucide-react"

interface CodeEditorProps {
  files: FileData[]
}

export function CodeEditor({ files }: CodeEditorProps) {
  const [activeFile, setActiveFile] = useState(files[0].name)

  const activeContent = files.find((f) => f.name === activeFile)?.content || ""

  return (
    <div className="flex flex-col h-full">
      {/* Editor Tabs */}
      <div className="flex bg-gray-100 border-b border-gray-200 overflow-x-auto hide-scrollbar">
        {files.map((file) => (
          <div
            key={file.name}
            onClick={() => setActiveFile(file.name)}
            className={`group flex items-center gap-2 px-4 py-2.5 text-xs font-medium cursor-pointer min-w-[120px] border-r border-gray-200 select-none ${
              activeFile === file.name
                ? "bg-white text-blue-600 border-t-2 border-t-blue-500"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-t-2 border-t-transparent"
            }`}
          >
            <span
              className={
                file.name.endsWith("html")
                  ? "text-orange-600"
                  : file.name.endsWith("css")
                    ? "text-blue-500"
                    : "text-yellow-600"
              }
            >
              {file.name.endsWith("html") ? "<>" : file.name.endsWith("css") ? "#" : "JS"}
            </span>
            <span className="truncate">{file.name}</span>
            <X className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Code Area (Simulated with styled pre/code for preview performance) */}
      <div className="flex-1 bg-white overflow-auto text-sm font-mono p-1 relative">
        <div className="flex min-h-full">
          {/* Line Numbers */}
          <div className="flex-none w-12 px-2 text-right text-gray-300 bg-white select-none pt-4 border-r border-gray-100">
            {activeContent.split("\n").map((_, i) => (
              <div key={i} className="leading-6 text-xs">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Content */}
          <pre className="flex-1 p-4 pt-4 leading-6 text-gray-800 tab-4 focus:outline-none">
            <code className="block outline-none" contentEditable suppressContentEditableWarning>
              {activeContent}
            </code>
          </pre>
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-blue-600 text-white flex items-center px-3 text-[10px] gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span>main</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <span>Ln {activeContent.split("\n").length}, Col 1</span>
          <span>UTF-8</span>
          <span>{activeFile.endsWith("html") ? "HTML" : activeFile.endsWith("css") ? "CSS" : "JavaScript"}</span>
        </div>
      </div>
    </div>
  )
}
