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
  courseAdminApi,
  getApiErrorMessage,
  transactionAdminApi,
  type AdminTransactionItem,
  type AdminTransactionDetailResponse,
} from "@/lib/api"
import {
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Shield,
  Download,
  Plus,
  X,
  Receipt,
  CreditCard,
  RefreshCw,
  Printer,
  Mail,
  Ban,
  CheckCircle2,
  Loader2
} from "lucide-react"

export function TransactionsView() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransactionItem | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false)
  const [showSplitConfigModal, setShowSplitConfigModal] = useState(false)
  const [showSplitRecordModal, setShowSplitRecordModal] = useState(false)
  const [resolutionNote, setResolutionNote] = useState("")
  const [resolutionAction, setResolutionAction] = useState("")
  const [manualForm, setManualForm] = useState({ user_email: "", course_id: "", amount: "", payment_method: "cash", note: "" })
  const [splitConfigForm, setSplitConfigForm] = useState({ user_email: "", enrollment_id: "", total_amount: "", initial_amount: "", note: "" })
  const [splitRecordForm, setSplitRecordForm] = useState({ user_email: "", enrollment_id: "", amount: "", payment_method: "cash", note: "" })
  const [detailData, setDetailData] = useState<AdminTransactionDetailResponse | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Lookup states for modals
  const [manualUserLookup, setManualUserLookup] = useState<{ user_id: string; email: string; full_name: string } | null>(null)
  const [manualUserLoading, setManualUserLoading] = useState(false)
  const [splitConfigEnrollments, setSplitConfigEnrollments] = useState<Array<{ enrollment_id: number; course_id: number; course_title: string; path_id: number | null; enrollment_status: string; is_active: boolean }>>([])
  const [splitConfigLookupUser, setSplitConfigLookupUser] = useState<{ user_id: string; full_name: string } | null>(null)
  const [splitConfigLoading, setSplitConfigLoading] = useState(false)
  const [splitRecordEnrollments, setSplitRecordEnrollments] = useState<Array<{ enrollment_id: number; course_id: number; course_title: string; path_id: number | null; enrollment_status: string; is_active: boolean }>>([])
  const [splitRecordLookupUser, setSplitRecordLookupUser] = useState<{ user_id: string; full_name: string } | null>(null)
  const [splitRecordLoading, setSplitRecordLoading] = useState(false)

  // Fetch courses for manual payment dropdown
  const { data: coursesData } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: () => courseAdminApi.listCourses({ limit: 100 }),
    staleTime: 60000,
  })

  // Fetch transactions
  const { data: txnData, isLoading, isFetching } = useQuery({
    queryKey: ["admin-transactions", page, pageSize, statusFilter, searchQuery],
    queryFn: () =>
      transactionAdminApi.listTransactions({
        page,
        page_size: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      }),
    staleTime: 15000,
  })

  const transactions = txnData?.transactions || []
  const stats = txnData?.stats || { total: 0, pending: 0, successful: 0, failed: 0, cancelled: 0, partial: 0, total_revenue: 0 }
  const totalPages = txnData?.total_pages || 1

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note: string }) =>
      transactionAdminApi.resolvePayment(id, action, note),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Payment resolved")
      setShowResolveModal(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Manual payment mutation
  const manualPaymentMutation = useMutation({
    mutationFn: (data: { user_email: string; course_id: number; amount: number; payment_method?: string; note?: string }) =>
      transactionAdminApi.recordManualPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Manual payment recorded")
      setShowManualPaymentModal(false)
      setManualForm({ user_email: "", course_id: "", amount: "", payment_method: "cash", note: "" })
      setManualUserLookup(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Split configure mutation
  const splitConfigMutation = useMutation({
    mutationFn: (data: { enrollment_id: number; total_amount: number; initial_amount: number; note?: string }) =>
      transactionAdminApi.configureSplitPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Split payment configured")
      setShowSplitConfigModal(false)
      setSplitConfigForm({ user_email: "", enrollment_id: "", total_amount: "", initial_amount: "", note: "" })
      setSplitConfigEnrollments([])
      setSplitConfigLookupUser(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Split record mutation
  const splitRecordMutation = useMutation({
    mutationFn: (data: { enrollment_id: number; amount: number; payment_method?: string; note?: string }) =>
      transactionAdminApi.recordSplitPayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })
      toast.success(data.message || "Split instalment recorded")
      setShowSplitRecordModal(false)
      setSplitRecordForm({ user_email: "", enrollment_id: "", amount: "", payment_method: "cash", note: "" })
      setSplitRecordEnrollments([])
      setSplitRecordLookupUser(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  // Send receipt email mutation
  const sendReceiptMutation = useMutation({
    mutationFn: (id: number) => transactionAdminApi.sendReceiptEmail(id),
    onSuccess: () => {
      toast.success("Receipt email sent!")
      setShowReceiptModal(false)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "successful":
        return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Successful</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-0"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-700 border-0"><Ban className="w-3 h-3 mr-1" />Cancelled</Badge>
      case "partial":
        return <Badge className="bg-purple-100 text-purple-700 border-0"><Clock className="w-3 h-3 mr-1" />Partial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  }

  const handleViewDetail = async (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    try {
      const detail = await transactionAdminApi.getTransactionDetail(txn.id)
      setDetailData(detail)
      setShowDetailModal(true)
    } catch (err) {
      toast.error("Failed to load transaction details")
    }
  }

  const handleGenerateReceipt = async (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    try {
      const data = await transactionAdminApi.getReceiptData(txn.id)
      setReceiptData(data)
      setShowReceiptModal(true)
    } catch (err) {
      toast.error("Failed to load receipt data")
    }
  }

  const handleResolvePayment = (txn: AdminTransactionItem) => {
    setSelectedTransaction(txn)
    setResolutionNote("")
    setResolutionAction("")
    setShowResolveModal(true)
  }

  const handleSubmitResolution = () => {
    if (!selectedTransaction || !resolutionAction) return
    resolveMutation.mutate({ id: selectedTransaction.id, action: resolutionAction, note: resolutionNote })
  }

  const handleExportCSV = async () => {
    try {
      const blob = await transactionAdminApi.exportCSV(statusFilter === "all" ? undefined : statusFilter)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement("a")
      a.href = url
      a.download = "transactions.csv"
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("CSV exported")
    } catch {
      toast.error("Export failed")
    }
  }

  // Lookup handlers for modals
  const handleLookupManualUser = async () => {
    if (!manualForm.user_email.trim()) return
    setManualUserLoading(true)
    setManualUserLookup(null)
    try {
      const result = await transactionAdminApi.lookupUserByEmail(manualForm.user_email.trim())
      setManualUserLookup(result)
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setManualUserLoading(false)
    }
  }

  const handleLookupSplitConfigEnrollments = async () => {
    if (!splitConfigForm.user_email.trim()) return
    setSplitConfigLoading(true)
    setSplitConfigEnrollments([])
    setSplitConfigLookupUser(null)
    setSplitConfigForm(f => ({ ...f, enrollment_id: "" }))
    try {
      const result = await transactionAdminApi.lookupEnrollmentsByEmail(splitConfigForm.user_email.trim())
      setSplitConfigLookupUser({ user_id: result.user_id, full_name: result.full_name })
      setSplitConfigEnrollments(result.enrollments)
      if (result.enrollments.length === 0) {
        toast.info("No enrollments found for this user")
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setSplitConfigLoading(false)
    }
  }

  const handleLookupSplitRecordEnrollments = async () => {
    if (!splitRecordForm.user_email.trim()) return
    setSplitRecordLoading(true)
    setSplitRecordEnrollments([])
    setSplitRecordLookupUser(null)
    setSplitRecordForm(f => ({ ...f, enrollment_id: "" }))
    try {
      const result = await transactionAdminApi.lookupEnrollmentsByEmail(splitRecordForm.user_email.trim())
      setSplitRecordLookupUser({ user_id: result.user_id, full_name: result.full_name })
      setSplitRecordEnrollments(result.enrollments)
      if (result.enrollments.length === 0) {
        toast.info("No enrollments found for this user")
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "User not found")
    } finally {
      setSplitRecordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-gray-500 text-sm">Track payments, generate receipts, and resolve issues</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" onClick={() => setShowManualPaymentModal(true)}>
            <Plus className="w-4 h-4 mr-2" />Manual Payment
          </Button>
          <Button variant="outline" onClick={() => setShowSplitConfigModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" />Split Payment
          </Button>
          <Button variant="outline" onClick={() => setShowSplitRecordModal(true)}>
            <DollarSign className="w-4 h-4 mr-2" />Record Instalment
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-xs text-gray-500">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.successful}</p><p className="text-xs text-gray-500">Successful</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-xs text-gray-500">Failed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p><p className="text-xs text-gray-500">Cancelled</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.total_revenue)}</p><p className="text-xs text-blue-600">Revenue</p></CardContent></Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, user, or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Reference</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Course</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded truncate block max-w-[150px]">
                            {txn.reference}
                          </code>
                          {txn.is_split_payment && <span className="text-xs text-purple-600 mt-1 block">Split</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {(txn.user_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{txn.user_name || "Unknown"}</p>
                              <p className="text-xs text-gray-500">{txn.user_email || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900 max-w-[200px] truncate">{txn.course_title || "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(txn.amount)} <span className="text-gray-400 font-normal text-xs">{txn.currency}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 capitalize">{txn.payment_method || "Nomba"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(txn.status)}</td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{formatDate(txn.created_at)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleGenerateReceipt(txn)} title="Receipt">
                              <Receipt className="w-4 h-4" />
                            </Button>
                            {(txn.status === "failed" || txn.status === "pending" || txn.status === "cancelled") && (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleResolvePayment(txn)} title="Resolve">
                                <AlertCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetail(txn)} title="View Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4">
                  <p className="text-sm text-gray-500">Page {page} of {totalPages} ({txnData?.total || 0} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReceiptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Payment Receipt</h2>
                <button onClick={() => setShowReceiptModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6">
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 space-y-4">
                  <div className="text-center border-b border-dashed border-gray-300 pb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">AI Mentor</h3>
                    <p className="text-xs text-gray-500">Payment Receipt</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Transaction ID:</span><span className="font-mono text-gray-900">{receiptData.transaction_id}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="text-gray-900">{formatDate(receiptData.payment_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span className="text-gray-900">{receiptData.user_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="text-gray-900">{receiptData.user_email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Payment Method:</span><span className="text-gray-900 capitalize">{receiptData.payment_method}</span></div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">{receiptData.course_title}</span><span className="text-gray-900">{formatCurrency(receiptData.amount)}</span></div>
                    <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-300">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(receiptData.amount)} {receiptData.currency}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-300 pt-4 text-center">
                    <p className={`text-xs font-medium ${receiptData.status === "successful" ? "text-green-600" : "text-yellow-600"}`}>
                      {receiptData.status === "successful" ? "✓ Payment Successful" : `Status: ${receiptData.status}`}
                    </p>
                    {receiptData.admin_override_note && <p className="text-xs text-gray-400 mt-1">Note: {receiptData.admin_override_note}</p>}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />Print
                  </Button>
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={sendReceiptMutation.isPending} onClick={() => selectedTransaction && sendReceiptMutation.mutate(selectedTransaction.id)}>
                    <Mail className="w-4 h-4 mr-2" />{sendReceiptMutation.isPending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Resolve Payment Modal */}
      {showResolveModal && selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowResolveModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Resolve Payment Issue</h2>
                  <p className="text-sm text-gray-500">{selectedTransaction.reference}</p>
                </div>
                <button onClick={() => setShowResolveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Customer:</span><span className="font-medium text-gray-900">{selectedTransaction.user_name || "Unknown"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Amount:</span><span className="font-medium text-gray-900">{formatCurrency(selectedTransaction.amount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Current Status:</span>{getStatusBadge(selectedTransaction.status)}</div>
                  {selectedTransaction.admin_override_note && (
                    <div className="pt-2 border-t border-gray-200"><p className="text-xs text-gray-500">Previous note: {selectedTransaction.admin_override_note}</p></div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Action</label>
                  <select value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select an action...</option>
                    {selectedTransaction.status === "pending" && (
                      <>
                        <option value="mark_completed">Mark as Completed (activate enrollment)</option>
                        <option value="cancel">Cancel Transaction</option>
                        <option value="retry">Retry Payment (generate new checkout)</option>
                      </>
                    )}
                    {selectedTransaction.status === "failed" && (
                      <>
                        <option value="retry">Retry Payment</option>
                        <option value="mark_completed">Manual Course Credit</option>
                        <option value="cancel">Cancel & Close</option>
                      </>
                    )}
                    {selectedTransaction.status === "cancelled" && (
                      <>
                        <option value="retry">Re-open & Retry</option>
                        <option value="mark_completed">Mark as Completed</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes <span className="text-red-500">*</span></label>
                  <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" placeholder="Add notes about this resolution (required for admin audit trail)..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmitResolution} disabled={!resolutionAction || !resolutionNote || resolveMutation.isPending}>
                  {resolveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Apply Resolution
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailData && selectedTransaction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDetailModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Transaction Detail</h2>
                  <p className="text-sm text-gray-500 font-mono">{selectedTransaction.reference}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-6">
                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500 mb-1">Amount</p><p className="text-lg font-bold">{formatCurrency(detailData.payment.amount)}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Status</p>{getStatusBadge(detailData.payment.status)}</div>
                  <div><p className="text-xs text-gray-500 mb-1">Customer</p><p className="text-sm font-medium">{detailData.payment.user_name || "Unknown"}</p><p className="text-xs text-gray-400">{detailData.payment.user_email}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Course</p><p className="text-sm font-medium">{detailData.payment.course_title || "N/A"}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Payment Method</p><p className="text-sm capitalize">{detailData.payment.payment_method || "Nomba"}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Enrollment Status</p><p className="text-sm capitalize">{detailData.enrollment_status}</p></div>
                </div>

                {/* Split Info */}
                {detailData.split_info && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Split Payment Info</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-purple-600">Total:</span> {formatCurrency(detailData.split_info.total_amount)}</div>
                      <div><span className="text-purple-600">Paid:</span> {formatCurrency(detailData.split_info.amount_paid)}</div>
                      <div><span className="text-purple-600">Outstanding:</span> <span className="font-semibold text-red-600">{formatCurrency(detailData.split_info.outstanding_balance)}</span></div>
                      <div><span className="text-purple-600">Payments:</span> {detailData.split_info.payment_count}</div>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                {detailData.payment_history.length > 1 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment History ({detailData.payment_history.length})</h4>
                    <div className="space-y-2">
                      {detailData.payment_history.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                          <span className="font-mono text-xs text-gray-600">{p.reference}</span>
                          <span>{formatCurrency(p.amount)}</span>
                          {getStatusBadge(p.status)}
                          <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                {detailData.audit_trail.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Audit Trail</h4>
                    <div className="space-y-2">
                      {detailData.audit_trail.map((a) => (
                        <div key={a.id} className="border-l-2 border-blue-300 pl-4 py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{a.action}</Badge>
                            {a.previous_status && <span className="text-xs text-gray-400">{a.previous_status} → {a.new_status}</span>}
                          </div>
                          {a.note && <p className="text-sm text-gray-600 mt-1">{a.note}</p>}
                          <p className="text-xs text-gray-400 mt-1">by {a.admin_name} · {formatDate(a.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gateway Response */}
                {detailData.gateway_response && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Gateway Response</h4>
                    <pre className="bg-gray-900 text-green-200 rounded-lg p-4 text-xs overflow-x-auto">{JSON.stringify(detailData.gateway_response, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manual Payment Modal */}
      {showManualPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowManualPaymentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Manual Payment</h2>
                <button onClick={() => setShowManualPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={manualForm.user_email}
                      onChange={(e) => { setManualForm(f => ({ ...f, user_email: e.target.value })); setManualUserLookup(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupManualUser() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupManualUser} disabled={manualUserLoading || !manualForm.user_email.trim()} className="shrink-0">
                      {manualUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {manualUserLookup && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-green-800">{manualUserLookup.full_name || manualUserLookup.email}</span>
                        <span className="text-green-600 ml-2 text-xs">({manualUserLookup.email})</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select
                    value={manualForm.course_id}
                    onChange={(e) => setManualForm(f => ({ ...f, course_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Select a course...</option>
                    {(coursesData || []).map((c) => (
                      <option key={c.course_id} value={c.course_id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NGN)</label>
                  <input type="number" step="0.01" value={manualForm.amount} onChange={(e) => setManualForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={manualForm.payment_method} onChange={(e) => setManualForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pos">POS</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={manualForm.note} onChange={(e) => setManualForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowManualPaymentModal(false)}>Cancel</Button>
                <Button className="bg-green-600 hover:bg-green-700" disabled={!manualUserLookup || !manualForm.course_id || !manualForm.amount || manualPaymentMutation.isPending}
                  onClick={() => manualPaymentMutation.mutate({ user_email: manualForm.user_email.trim(), course_id: Number(manualForm.course_id), amount: Number(manualForm.amount), payment_method: manualForm.payment_method, note: manualForm.note })}>
                  {manualPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Split Payment Config Modal */}
      {showSplitConfigModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSplitConfigModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Configure Split Payment</h2>
                <button onClick={() => setShowSplitConfigModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={splitConfigForm.user_email}
                      onChange={(e) => { setSplitConfigForm(f => ({ ...f, user_email: e.target.value, enrollment_id: "" })); setSplitConfigEnrollments([]); setSplitConfigLookupUser(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupSplitConfigEnrollments() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupSplitConfigEnrollments} disabled={splitConfigLoading || !splitConfigForm.user_email.trim()} className="shrink-0">
                      {splitConfigLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {splitConfigLookupUser && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">{splitConfigLookupUser.full_name || splitConfigForm.user_email}</span>
                    </div>
                  )}
                </div>
                {splitConfigEnrollments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Enrollment</label>
                    <select
                      value={splitConfigForm.enrollment_id}
                      onChange={(e) => setSplitConfigForm(f => ({ ...f, enrollment_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Choose an enrollment...</option>
                      {splitConfigEnrollments.map((en) => (
                        <option key={en.enrollment_id} value={en.enrollment_id}>
                          {en.course_title} — {en.enrollment_status} (ID: {en.enrollment_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (NGN)</label>
                  <input type="number" step="0.01" value={splitConfigForm.total_amount} onChange={(e) => setSplitConfigForm(f => ({ ...f, total_amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Full course price" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Payment (NGN)</label>
                  <input type="number" step="0.01" value={splitConfigForm.initial_amount} onChange={(e) => setSplitConfigForm(f => ({ ...f, initial_amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="First instalment" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={splitConfigForm.note} onChange={(e) => setSplitConfigForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSplitConfigModal(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={!splitConfigForm.enrollment_id || !splitConfigForm.total_amount || !splitConfigForm.initial_amount || splitConfigMutation.isPending}
                  onClick={() => splitConfigMutation.mutate({ enrollment_id: Number(splitConfigForm.enrollment_id), total_amount: Number(splitConfigForm.total_amount), initial_amount: Number(splitConfigForm.initial_amount), note: splitConfigForm.note })}>
                  {splitConfigMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Configure Split
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Split Payment Record Modal */}
      {showSplitRecordModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSplitRecordModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Split Instalment</h2>
                <button onClick={() => setShowSplitRecordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={splitRecordForm.user_email}
                      onChange={(e) => { setSplitRecordForm(f => ({ ...f, user_email: e.target.value, enrollment_id: "" })); setSplitRecordEnrollments([]); setSplitRecordLookupUser(null) }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLookupSplitRecordEnrollments() } }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="user@example.com"
                    />
                    <Button variant="outline" size="sm" onClick={handleLookupSplitRecordEnrollments} disabled={splitRecordLoading || !splitRecordForm.user_email.trim()} className="shrink-0">
                      {splitRecordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  {splitRecordLookupUser && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800">{splitRecordLookupUser.full_name || splitRecordForm.user_email}</span>
                    </div>
                  )}
                </div>
                {splitRecordEnrollments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Enrollment</label>
                    <select
                      value={splitRecordForm.enrollment_id}
                      onChange={(e) => setSplitRecordForm(f => ({ ...f, enrollment_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="">Choose an enrollment...</option>
                      {splitRecordEnrollments.map((en) => (
                        <option key={en.enrollment_id} value={en.enrollment_id}>
                          {en.course_title} — {en.enrollment_status} (ID: {en.enrollment_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NGN)</label>
                  <input type="number" step="0.01" value={splitRecordForm.amount} onChange={(e) => setSplitRecordForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={splitRecordForm.payment_method} onChange={(e) => setSplitRecordForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pos">POS</option>
                    <option value="nomba">Nomba Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea value={splitRecordForm.note} onChange={(e) => setSplitRecordForm(f => ({ ...f, note: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" placeholder="Admin note..." />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowSplitRecordModal(false)}>Cancel</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled={!splitRecordForm.enrollment_id || !splitRecordForm.amount || splitRecordMutation.isPending}
                  onClick={() => splitRecordMutation.mutate({ enrollment_id: Number(splitRecordForm.enrollment_id), amount: Number(splitRecordForm.amount), payment_method: splitRecordForm.payment_method, note: splitRecordForm.note })}>
                  {splitRecordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Record Instalment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}