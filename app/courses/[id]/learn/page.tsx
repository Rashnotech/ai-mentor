"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, PlayCircle, FileText, CheckCircle2, ArrowRight, Layout, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function LearningModulePage({ params }: { params: { id: string } }) {
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState("")

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/courses/${params.id}`}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Module 1 • Lesson 3</p>
              <h1 className="text-sm font-bold text-gray-900">Project 1: Design a Simple Logo</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">Progress: 25%</span>
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
              <div className="h-full bg-blue-600 w-1/4" />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Video / Content Section */}
        <div className="mb-12 space-y-8">
          {/* Video Player Placeholder */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-lg">
            <img
              src="/placeholder.svg?height=720&width=1280&text=Lesson+Video"
              alt="Video Content"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-xl">
                <PlayCircle className="w-8 h-8 fill-current" />
              </button>
            </div>
          </div>

          {/* Lesson Description */}
          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-bold text-gray-900">Before you start coding...</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              In this project, you will build a responsive personal portfolio website. This is a crucial step in your
              journey as a developer because it gives you a platform to showcase your work.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              Before diving into the workspace, please review the following resources on Flexbox and CSS Grid, as you'll
              need them to create the gallery layout.
            </p>

            <div className="not-prose grid gap-4 mt-6">
              <a
                href="#"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group bg-white"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">A Complete Guide to Flexbox</h4>
                  <p className="text-sm text-gray-500">CSS-Tricks Article • 10 min read</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
              <a
                href="#"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group bg-white"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <PlayCircle className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">CSS Grid vs Flexbox</h4>
                  <p className="text-sm text-gray-500">Video Tutorial • 15 min watch</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-purple-600" />
              </a>
            </div>
          </div>
        </div>

        {/* Quiz Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Quick Check</h2>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Which CSS property is best suited for 2-dimensional layouts?</CardTitle>
              <CardDescription>Test your knowledge before applying it in the project.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} className="space-y-3">
                <div
                  className={`flex items-center space-x-2 border p-4 rounded-lg transition-colors ${quizSubmitted && selectedAnswer === "flexbox" ? "bg-red-50 border-red-200" : "hover:bg-gray-50 border-gray-200"}`}
                >
                  <RadioGroupItem value="flexbox" id="r1" />
                  <Label htmlFor="r1" className="flex-1 cursor-pointer">
                    Flexbox
                  </Label>
                  {quizSubmitted && selectedAnswer === "flexbox" && (
                    <span className="text-red-600 text-sm font-medium">Incorrect</span>
                  )}
                </div>
                <div
                  className={`flex items-center space-x-2 border p-4 rounded-lg transition-colors ${quizSubmitted && selectedAnswer === "grid" ? "bg-green-50 border-green-200" : "hover:bg-gray-50 border-gray-200"}`}
                >
                  <RadioGroupItem value="grid" id="r2" />
                  <Label htmlFor="r2" className="flex-1 cursor-pointer">
                    CSS Grid
                  </Label>
                  {quizSubmitted && selectedAnswer === "grid" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </div>
                <div
                  className={`flex items-center space-x-2 border p-4 rounded-lg transition-colors ${quizSubmitted && selectedAnswer === "float" ? "bg-red-50 border-red-200" : "hover:bg-gray-50 border-gray-200"}`}
                >
                  <RadioGroupItem value="float" id="r3" />
                  <Label htmlFor="r3" className="flex-1 cursor-pointer">
                    Float
                  </Label>
                  {quizSubmitted && selectedAnswer === "float" && (
                    <span className="text-red-600 text-sm font-medium">Incorrect</span>
                  )}
                </div>
              </RadioGroup>

              {!quizSubmitted ? (
                <Button
                  className="mt-6 w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  onClick={() => setQuizSubmitted(true)}
                  disabled={!selectedAnswer}
                >
                  Check Answer
                </Button>
              ) : (
                <div className="mt-6 p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-100">
                  <p className="font-medium mb-1">Correct!</p>
                  <p className="text-sm text-blue-700 mb-4">
                    CSS Grid is designed for 2-dimensional layouts (rows and columns), while Flexbox is best for
                    1-dimensional layouts.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/workspace" className="flex-1">
                      <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
                        <Layout className="w-4 h-4" />
                        Open Project Workspace
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuizSubmitted(false)
                        setSelectedAnswer("")
                      }}
                    >
                      Try Another Question
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
