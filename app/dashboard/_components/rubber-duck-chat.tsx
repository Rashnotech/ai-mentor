"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAccessToken } from "@/lib/auth-storage"

const API_BASE = process.env.NEXT_PUBLIC_API_URL

interface Message {
  role: "user" | "assistant"
  content: string
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your Rubber Duck 🦆 — here to help you think through your code, not just hand you answers. What are you working on?",
}

export default function RubberDuckChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: "user", content: text }
    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput("")
    setStreaming(true)

    // Append an empty assistant bubble that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    abortRef.current = new AbortController()

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE}/api/v1/ai/rubber-duck/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No response body")

      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6)
          if (payload === "[DONE]") break
          try {
            const { content } = JSON.parse(payload)
            if (content) {
              setMessages((prev) => {
                const next = [...prev]
                next[next.length - 1] = {
                  role: "assistant",
                  content: next[next.length - 1].content + content,
                }
                return next
              })
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: "assistant",
          content: "Oops — something went wrong connecting to the AI. Please try again.",
        }
        return next
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleClose = () => {
    abortRef.current?.abort()
    setOpen(false)
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Rubber Duck Chat"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-yellow-400 hover:bg-yellow-300 shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {open ? (
          <ChevronDown className="w-6 h-6 text-yellow-900" />
        ) : (
          <span className="text-2xl select-none" role="img" aria-label="rubber duck">🦆</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-90 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-yellow-400 shrink-0">
            <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-lg select-none">
              🦆
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-yellow-900 text-sm leading-none">Rubber Duck</p>
              <p className="text-xs text-yellow-800/80 mt-0.5">Your Socratic coding mentor</p>
            </div>
            <button onClick={handleClose} className="text-yellow-900 hover:text-yellow-700 transition-colors" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-sm shrink-0 mt-0.5 select-none">
                    🦆
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content || (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-200 bg-white shrink-0 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your duck…"
              rows={1}
              disabled={streaming}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white transition-all disabled:opacity-50 overflow-hidden"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              size="icon"
              className="rounded-xl bg-yellow-400 hover:bg-yellow-300 text-yellow-900 border-0 shrink-0 h-9 w-9"
              aria-label="Send"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
