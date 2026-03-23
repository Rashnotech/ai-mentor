"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Users,
  MessageSquare,
  Hash,
  ExternalLink,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { communityApi, type CommunityChannel } from "@/lib/api"

const CATEGORY_STYLES: Record<string, { label: string; color: string }> = {
  discussion: { label: "Discussion", color: "bg-blue-100 text-blue-700" },
  "study-group": { label: "Study Group", color: "bg-purple-100 text-purple-700" },
  leadership: { label: "Leadership", color: "bg-amber-100 text-amber-700" },
}

const TYPE_BADGE: Record<string, string> = {
  public: "bg-green-100 text-green-700",
  private: "bg-gray-100 text-gray-600",
}

function ChannelCard({ channel }: { channel: CommunityChannel }) {
  const cat = CATEGORY_STYLES[channel.category] ?? {
    label: channel.category,
    color: "bg-gray-100 text-gray-600",
  }

  return (
    <Card className="hover:shadow-md hover:border-blue-300 transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {channel.name}
                </h4>
                <Badge className={`text-xs border-0 ${cat.color}`}>{cat.label}</Badge>
                <Badge className={`text-xs border-0 ${TYPE_BADGE[channel.type] ?? "bg-gray-100 text-gray-600"}`}>
                  {channel.type}
                </Badge>
              </div>
              {channel.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {channel.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {channel.members_count} member{channel.members_count !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {channel.posts_count} post{channel.posts_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="shrink-0">
            {channel.join_link ? (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                <a href={channel.join_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Join
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                No link
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CommunityView() {
  const [searchTerm, setSearchTerm] = useState("")

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["community-channels"],
    queryFn: () => communityApi.listChannels({ status: "active" }),
  })

  const channels = data?.channels ?? []
  const total = data?.total ?? 0

  // Client-side search filter (API already returns only accessible channels)
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return channels
    const q = searchTerm.toLowerCase()
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    )
  }, [channels, searchTerm])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommunityChannel[]>()
    for (const ch of filtered) {
      const key = ch.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ch)
    }
    return map
  }, [filtered])

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Community</h2>
        <p className="text-gray-600">
          Connect with fellow learners, join study groups, and grow together
        </p>
      </div>

      {/* Stats bar */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{total}</span>
            </div>
            <div className="text-sm text-gray-600">Channels</div>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">
                {channels.reduce((acc, c) => acc + c.members_count, 0)}
              </span>
            </div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">
                {channels.reduce((acc, c) => acc + c.posts_count, 0)}
              </span>
            </div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
        </div>
      )}

      {/* Search */}
      {!isLoading && !error && channels.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-500">Loading channels...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p className="font-medium">Failed to load community channels</p>
          <p className="text-sm mt-1">Please try again later.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && channels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="w-12 h-12 mb-3" />
          <p className="text-gray-600 font-medium">No community channels available</p>
          <p className="text-sm mt-1">
            Communities linked to your enrolled courses and bootcamps will appear here.
          </p>
        </div>
      )}

      {/* No search results */}
      {!isLoading && !error && channels.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2" />
          <p className="text-gray-600">No channels match &quot;{searchTerm}&quot;</p>
        </div>
      )}

      {/* Channel list grouped by category */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, chs]) => {
            const cat = CATEGORY_STYLES[category] ?? {
              label: category,
              color: "bg-gray-100 text-gray-600",
            }
            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Badge className={`border-0 ${cat.color}`}>{cat.label}</Badge>
                  <span className="text-sm font-normal text-gray-400">({chs.length})</span>
                </h3>
                <div className="space-y-3">
                  {chs.map((ch) => (
                    <ChannelCard key={ch.id} channel={ch} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
