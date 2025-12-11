"use client"

import type { FileData } from "@/types/course"
import { Table, BarChart, UploadCloud, FileSpreadsheet, Trash2, ArrowUpDown } from "lucide-react"
import { useState } from "react"

interface SpreadsheetViewProps {
  files: FileData[]
}

export function SpreadsheetView({ files }: SpreadsheetViewProps) {
  const [viewMode, setViewMode] = useState<"data" | "chart" | "upload">("upload")

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
        <button
          onClick={() => setViewMode("upload")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === "upload"
              ? "bg-green-50 text-green-700 ring-1 ring-green-200"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Upload
        </button>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        <button
          onClick={() => setViewMode("data")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === "data" ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Table className="w-4 h-4" />
          Data View
        </button>
        <button
          onClick={() => setViewMode("chart")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === "chart" ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <BarChart className="w-4 h-4" />
          Charts
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
        {viewMode === "upload" && (
          <div className="max-w-2xl w-full">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-12 flex flex-col items-center justify-center text-center hover:border-green-400 hover:bg-green-50/30 transition-all cursor-pointer group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Excel File</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
                Drag & drop your .xlsx or .csv file here to get AI feedback on your work.
              </p>
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-green-200">
                Browse Files
              </button>
            </div>

            {/* Submitted Files List */}
            {files.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Submitted Files</h4>
                <div className="space-y-3">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.size} • {file.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "data" && (
          <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="h-10 border-b border-gray-200 bg-gray-50 flex items-center px-4 gap-4">
              <span className="text-xs font-mono text-gray-400">A1</span>
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-xs font-mono text-gray-600 flex-1">SUM(B2:B50)</span>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Mock Grid */}
              <div className="grid grid-cols-5 w-full min-w-[600px]">
                {["Date", "Region", "Product", "Units", "Revenue"].map((h) => (
                  <div
                    key={h}
                    className="bg-gray-100 p-2 border-b border-r border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-between"
                  >
                    {h}
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                ))}
                {Array.from({ length: 20 }).map((_, r) => (
                  <div key={r} className="flex">
                    <div className="p-2 border-b border-r border-gray-100 text-xs text-gray-600">2023-11-{r + 1}</div>
                    <div className="p-2 border-b border-r border-gray-100 text-xs text-gray-600">
                      {r % 2 === 0 ? "North" : "South"}
                    </div>
                    <div className="p-2 border-b border-r border-gray-100 text-xs text-gray-600">
                      Widget {String.fromCharCode(65 + (r % 3))}
                    </div>
                    <div className="p-2 border-b border-r border-gray-100 text-xs text-gray-600 text-right">
                      {Math.floor(Math.random() * 100)}
                    </div>
                    <div className="p-2 border-b border-r border-gray-100 text-xs text-gray-600 text-right">
                      ${(Math.random() * 1000).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === "chart" && (
          <div className="w-full max-w-3xl h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center flex-col gap-4">
            <BarChart className="w-24 h-24 text-gray-200" />
            <p className="text-gray-500 text-sm">Chart preview generated from your data</p>
          </div>
        )}
      </div>
    </div>
  )
}
