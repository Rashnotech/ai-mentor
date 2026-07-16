"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import {
  getApiErrorMessage,
  communityApi,
  type CreateChannelPayload
} from "@/lib/api"
import {
  Users,
  Settings,
  Search,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Link2,
  X,
  Ban,
  AlertTriangle,
  ExternalLink,
  Loader2,
  MessageSquare,
  Flag,
  Lock,
  TrendingDown,
  Hash
} from "lucide-react"


export function CommunityManagementView() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"reports" | "channels">("channels")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [channelForm, setChannelForm] = useState({ name: "", description: "", type: "public", category: "discussion", joinLink: "" })
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)

  // Fetch channels from API
  const { data: channelsData, isLoading: isLoadingChannels } = useQuery({
    queryKey: ["community-channels", searchQuery, statusFilter],
    queryFn: () => communityApi.listChannels({
      search: searchQuery || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 100,
    }),
    staleTime: 30000,
  })

  const channels = channelsData?.channels || []
  const totalChannels = channelsData?.total || 0

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (data: CreateChannelPayload) => communityApi.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-channels"] })
      toast.success("Community channel created successfully!")
      setShowCreateChannelModal(false)
      setChannelForm({ name: "", description: "", type: "public", category: "discussion", joinLink: "" })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  // Mock Community Stats (will connect to real API in future)
  const communityStats = [
    { label: "Total Channels", value: totalChannels.toString(), change: "+0", trend: "up", icon: Hash },
    { label: "Pending Reports", value: "0", change: "0", trend: "down", icon: Flag },
  ]

  // Mock Reports (will connect to real API in future)
  const reports = [
    { id: 1, type: "spam", content: "User promoting external products...", reportedBy: "Sarah Johnson", reportedUser: "SpamBot123", post: "Check out this amazing...", status: "pending", createdAt: "1 hour ago", priority: "high" },
    { id: 2, type: "harassment", content: "Offensive comments towards another user", reportedBy: "Michael Chen", reportedUser: "ToxicUser99", post: "You're so stupid...", status: "pending", createdAt: "3 hours ago", priority: "high" },
    { id: 3, type: "inappropriate", content: "Contains inappropriate language", reportedBy: "Emily Rodriguez", reportedUser: "CasualUser", post: "This code is [expletive]...", status: "under_review", createdAt: "1 day ago", priority: "medium" },
    { id: 4, type: "off-topic", content: "Discussion not related to channel topic", reportedBy: "David Kim", reportedUser: "NewUser42", post: "Anyone want to buy...", status: "pending", createdAt: "2 days ago", priority: "low" },
    { id: 5, type: "spam", content: "Repeated promotional messages", reportedBy: "Lisa Wang", reportedUser: "MarketingGuy", post: "Join my course...", status: "resolved", resolution: "User warned", createdAt: "3 days ago", priority: "medium" },
    { id: 6, type: "harassment", content: "Targeted harassment of member", reportedBy: "Anna Martinez", reportedUser: "Troll2024", post: "Nobody likes you...", status: "resolved", resolution: "User banned", createdAt: "5 days ago", priority: "high" },
  ]

  // Filter channels (already filtered by API, but handle client-side for immediate feedback)
  const filteredChannels = channels

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.reportedUser.toLowerCase().includes(searchQuery.toLowerCase()) || r.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const handleResolveReport = (report: any, action: string) => {
    console.log("Resolving report:", report.id, "with action:", action)
    setShowReportModal(false)
  }

  const handleCreateChannel = () => {
    if (!channelForm.name.trim()) {
      toast.error("Channel name is required")
      return
    }
    
    createChannelMutation.mutate({
      name: channelForm.name.trim(),
      description: channelForm.description.trim() || undefined,
      type: channelForm.type as "public" | "private",
      category: channelForm.category as "discussion" | "study-group" | "leadership",
      join_link: channelForm.joinLink.trim() || undefined,
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Management</h1>
          <p className="text-gray-500 text-sm">Manage discussions, channels, and community reports</p>
        </div>
        <Button onClick={() => setShowCreateChannelModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" />
          Create Channel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {communityStats.map((stat, index) => (
          <Card key={index} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className={`flex items-center gap-1 text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.label.includes("Reports") ? "bg-red-100" : "bg-blue-100"}`}>
                  <stat.icon className={`w-6 h-6 ${stat.label.includes("Reports") ? "text-red-600" : "text-blue-600"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "channels", label: "Channels", icon: Hash },
          { id: "reports", label: "Reports", icon: Flag, badge: reports.filter(r => r.status === "pending").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {activeTab === "reports" ? (
            <>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
            </>
          ) : activeTab === "channels" ? (
            <>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </>
          ) : (
            <>
              <option value="active">Active</option>
              <option value="removed">Removed</option>
            </>
          )}
        </select>
      </div>

      {/* Channels Tab */}
      {activeTab === "channels" && (
        <div>
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-12 text-center">
                <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No channels yet</h3>
                <p className="text-gray-500 mb-4">Create your first community channel to get started.</p>
                <Button onClick={() => setShowCreateChannelModal(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Channel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChannels.map((channel) => (
                <Card key={channel.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${channel.type === "private" ? "bg-purple-100" : "bg-blue-100"}`}>
                          {channel.type === "private" ? <Lock className="w-4 h-4 text-purple-600" /> : <Hash className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                          <Badge variant="outline" className="text-xs font-normal mt-1">{channel.category}</Badge>
                        </div>
                      </div>
                      <Badge className={channel.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {channel.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{channel.description || "No description"}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" />{channel.members_count.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{channel.posts_count.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {channel.join_link && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={channel.join_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Report Type</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Details</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Reported User</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <Badge className={`${
                          report.type === "harassment" ? "bg-red-100 text-red-700" :
                          report.type === "spam" ? "bg-orange-100 text-orange-700" :
                          report.type === "inappropriate" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {report.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate">{report.content}</p>
                          <p className="text-xs text-gray-500">Reported by {report.reportedBy} • {report.createdAt}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs">
                            {report.reportedUser.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">{report.reportedUser}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${
                          report.priority === "high" ? "bg-red-100 text-red-700" :
                          report.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {report.priority}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={`${
                          report.status === "pending" ? "bg-orange-100 text-orange-700" :
                          report.status === "under_review" ? "bg-blue-100 text-blue-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {report.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {report.status !== "resolved" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleResolveReport(report, "dismiss")}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleResolveReport(report, "ban")}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateChannelModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-xl z-50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Community</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateChannelModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Community Name</label>
                <input
                  type="text"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  placeholder="e.g., React Beginners"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={channelForm.description}
                  onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                  placeholder="What is this community about?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={channelForm.type}
                    onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={channelForm.category}
                    onChange={(e) => setChannelForm({ ...channelForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="study-group">Study Group</option>
                    <option value="leadership">Leadership</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Join Link</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={channelForm.joinLink}
                    onChange={(e) => setChannelForm({ ...channelForm, joinLink: e.target.value })}
                    placeholder="https://discord.gg/... or https://slack.com/..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500">Enter the invite link for Discord, Slack, or any external community platform</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateChannelModal(false)} disabled={createChannelMutation.isPending}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCreateChannel} disabled={createChannelMutation.isPending}>
                  {createChannelMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {createChannelMutation.isPending ? "Creating..." : "Create Community"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReportModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-xl z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowReportModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge className={`${
                    selectedReport.type === "harassment" ? "bg-red-100 text-red-700" :
                    selectedReport.type === "spam" ? "bg-orange-100 text-orange-700" :
                    selectedReport.type === "inappropriate" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedReport.type}
                  </Badge>
                  <Badge className={`${
                    selectedReport.priority === "high" ? "bg-red-100 text-red-700" :
                    selectedReport.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedReport.priority} priority
                  </Badge>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Reported Content:</p>
                  <p className="text-gray-900">"{selectedReport.post}"</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Reported User</p>
                    <p className="font-medium text-gray-900">{selectedReport.reportedUser}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reported By</p>
                    <p className="font-medium text-gray-900">{selectedReport.reportedBy}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Reason</p>
                  <p className="text-gray-900">{selectedReport.content}</p>
                </div>
                
                {selectedReport.status === "resolved" && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Resolution: {selectedReport.resolution}</p>
                  </div>
                )}
                
                {selectedReport.status !== "resolved" && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Take Action:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "dismiss")}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss Report
                      </Button>
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "warn")}>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Warn User
                      </Button>
                      <Button variant="outline" onClick={() => handleResolveReport(selectedReport, "delete")}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Content
                      </Button>
                      <Button variant="outline" className="text-red-600" onClick={() => handleResolveReport(selectedReport, "ban")}>
                        <Ban className="w-4 h-4 mr-2" />
                        Ban User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
