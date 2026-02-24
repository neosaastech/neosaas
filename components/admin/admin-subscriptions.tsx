"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Loader2, RefreshCw, Pause, Play, XCircle, CheckCircle2,
  Clock, ChevronDown, CalendarDays, Building2, ExternalLink,
  Search, AlertCircle,
} from "lucide-react"
import {
  adminGetAllSubscriptions,
  adminCancelSubscription,
  adminResumeSubscription,
  adminPauseSubscription,
  adminUnpauseSubscription,
} from "@/app/actions/admin-dashboard"

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdminSubscription {
  id: string
  stripeSubscriptionId: string | null
  companyId: string
  companyName: string | null
  companyEmail: string | null
  stripePriceId: string | null
  status: string | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean | null
  createdAt: Date
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date | null | string): string {
  if (!date) return "—"
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function getStatusBadge(
  status: string | null,
  cancelAtPeriodEnd: boolean | null,
): React.ReactNode {
  if (cancelAtPeriodEnd) {
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300">
        Cancellation scheduled
      </Badge>
    )
  }
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300">
          Active
        </Badge>
      )
    case "paused":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300">
          Paused
        </Badge>
      )
    case "trialing":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
          Trialing
        </Badge>
      )
    case "past_due":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
          Past due
        </Badge>
      )
    case "canceled":
      return (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
          Canceled
        </Badge>
      )
    case "incomplete":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300">
          Incomplete
        </Badge>
      )
    default:
      return <Badge variant="outline">{status ?? "Unknown"}</Badge>
  }
}

function shortPriceId(priceId: string | null): string {
  if (!priceId) return "—"
  return priceId.length > 20 ? `${priceId.substring(0, 20)}…` : priceId
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Per-row action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Cancel confirmation dialog
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    subId: string
    immediately: boolean
    companyName: string | null
  } | null>(null)

  // ── Data loading ────────────────────────────────────────────────────────

  const loadSubscriptions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminGetAllSubscriptions()
      if (result.success && result.data) {
        setSubscriptions(result.data as AdminSubscription[])
      } else {
        setError(result.error || "Failed to load subscriptions")
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err)
      setError("Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  // ── Actions ─────────────────────────────────────────────────────────────

  const handlePause = async (stripeSubId: string) => {
    setActionLoading(stripeSubId)
    const res = await adminPauseSubscription(stripeSubId)
    if (res.success) {
      toast.success("Subscription paused")
      await loadSubscriptions()
    } else {
      toast.error(res.error || "Failed to pause subscription")
    }
    setActionLoading(null)
  }

  const handleUnpause = async (stripeSubId: string) => {
    setActionLoading(stripeSubId)
    const res = await adminUnpauseSubscription(stripeSubId)
    if (res.success) {
      toast.success("Subscription billing resumed")
      await loadSubscriptions()
    } else {
      toast.error(res.error || "Failed to resume subscription billing")
    }
    setActionLoading(null)
  }

  const handleResumeCancellation = async (stripeSubId: string) => {
    setActionLoading(stripeSubId)
    const res = await adminResumeSubscription(stripeSubId)
    if (res.success) {
      toast.success("Cancellation reversed — subscription kept")
      await loadSubscriptions()
    } else {
      toast.error(res.error || "Failed to reverse cancellation")
    }
    setActionLoading(null)
  }

  const handleConfirmCancel = async () => {
    if (!cancelDialog) return
    const { subId, immediately } = cancelDialog
    setCancelDialog(null)
    setActionLoading(subId)
    const res = await adminCancelSubscription(subId, immediately)
    if (res.success) {
      toast.success(
        immediately
          ? "Subscription canceled immediately"
          : "Subscription scheduled for cancellation at period end",
      )
      await loadSubscriptions()
    } else {
      toast.error(res.error || "Failed to cancel subscription")
    }
    setActionLoading(null)
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const filtered = subscriptions.filter((sub) => {
    const matchesSearch =
      !search ||
      (sub.companyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (sub.companyEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (sub.stripeSubscriptionId ?? "").toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || (sub.cancelAtPeriodEnd && statusFilter === "canceling") || sub.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={loadSubscriptions}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-brand" />
                Subscriptions
              </CardTitle>
              <CardDescription>
                Manage all customer subscriptions — pause, cancel or restore them on behalf of clients.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubscriptions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company, email, subscription ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="canceling">Cancellation scheduled</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* ── Desktop table ─────────────────────────────────────────────── */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal / End date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No subscriptions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sub) => {
                    const stripeSubId = sub.stripeSubscriptionId
                    const isLoading = stripeSubId ? actionLoading === stripeSubId : false
                    const isPaused = sub.status === "paused"
                    const isCancelScheduled = !!sub.cancelAtPeriodEnd
                    const isCanceled = sub.status === "canceled"

                    return (
                      <TableRow key={sub.id}>
                        {/* Company */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium leading-none">
                                {sub.companyName ?? "Unknown"}
                              </p>
                              {sub.companyEmail && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {sub.companyEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Subscription ID */}
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {stripeSubId ? (
                            <a
                              href={`https://dashboard.stripe.com/subscriptions/${stripeSubId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              {stripeSubId.substring(0, 14)}…
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Plan */}
                        <TableCell className="font-mono text-xs">
                          {shortPriceId(sub.stripePriceId)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                        </TableCell>

                        {/* Renewal / End date */}
                        <TableCell className="text-sm">
                          {isCancelScheduled ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              Ends {formatDate(sub.currentPeriodEnd)}
                            </span>
                          ) : (
                            formatDate(sub.currentPeriodEnd)
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                          ) : !stripeSubId ? (
                            <span className="text-xs text-muted-foreground">No Stripe ID</span>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isCanceled}>
                                  Manage <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                {/* Pause / Unpause */}
                                {!isCancelScheduled && !isCanceled && (
                                  isPaused ? (
                                    <DropdownMenuItem onClick={() => handleUnpause(stripeSubId)}>
                                      <Play className="mr-2 h-4 w-4 text-green-600" />
                                      Resume billing
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handlePause(stripeSubId)}>
                                      <Pause className="mr-2 h-4 w-4 text-purple-600" />
                                      Pause billing
                                    </DropdownMenuItem>
                                  )
                                )}

                                {/* Undo scheduled cancellation */}
                                {isCancelScheduled && (
                                  <DropdownMenuItem onClick={() => handleResumeCancellation(stripeSubId)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                    Undo cancellation
                                  </DropdownMenuItem>
                                )}

                                {/* Cancel options */}
                                {!isCancelScheduled && !isCanceled && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-orange-600 focus:text-orange-600"
                                      onClick={() =>
                                        setCancelDialog({
                                          open: true,
                                          subId: stripeSubId,
                                          immediately: false,
                                          companyName: sub.companyName,
                                        })
                                      }
                                    >
                                      <Clock className="mr-2 h-4 w-4" />
                                      Cancel at period end
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() =>
                                        setCancelDialog({
                                          open: true,
                                          subId: stripeSubId,
                                          immediately: true,
                                          companyName: sub.companyName,
                                        })
                                      }
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel immediately
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* Stripe dashboard link */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://dashboard.stripe.com/subscriptions/${stripeSubId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                                    View in Stripe
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Mobile cards ───────────────────────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No subscriptions found.</p>
            ) : (
              filtered.map((sub) => {
                const stripeSubId = sub.stripeSubscriptionId
                const isLoading = stripeSubId ? actionLoading === stripeSubId : false
                const isPaused = sub.status === "paused"
                const isCancelScheduled = !!sub.cancelAtPeriodEnd
                const isCanceled = sub.status === "canceled"

                return (
                  <div key={sub.id} className="rounded-lg border bg-card p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{sub.companyName ?? "Unknown"}</p>
                          {sub.companyEmail && (
                            <p className="text-xs text-muted-foreground truncate">{sub.companyEmail}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Plan</p>
                        <p className="font-mono text-xs truncate">{shortPriceId(sub.stripePriceId)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {isCancelScheduled ? "Ends on" : "Renewal"}
                        </p>
                        <p className={`text-xs ${isCancelScheduled ? "text-orange-600" : ""}`}>
                          {formatDate(sub.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {stripeSubId && !isCanceled && (
                      <div className="flex gap-2 pt-1">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {!isCancelScheduled && (
                              isPaused ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleUnpause(stripeSubId)}
                                >
                                  <Play className="mr-1 h-3.5 w-3.5 text-green-600" />
                                  Resume billing
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handlePause(stripeSubId)}
                                >
                                  <Pause className="mr-1 h-3.5 w-3.5 text-purple-600" />
                                  Pause
                                </Button>
                              )
                            )}

                            {isCancelScheduled && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleResumeCancellation(stripeSubId)}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-600" />
                                Undo cancel
                              </Button>
                            )}

                            {!isCancelScheduled && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    Cancel <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-orange-600 focus:text-orange-600"
                                    onClick={() =>
                                      setCancelDialog({
                                        open: true,
                                        subId: stripeSubId,
                                        immediately: false,
                                        companyName: sub.companyName,
                                      })
                                    }
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    At period end
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() =>
                                      setCancelDialog({
                                        open: true,
                                        subId: stripeSubId,
                                        immediately: true,
                                        companyName: sub.companyName,
                                      })
                                    }
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Immediately
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Summary */}
          {filtered.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {filtered.length} subscription{filtered.length > 1 ? "s" : ""} found
              {subscriptions.length !== filtered.length ? ` (${subscriptions.length} total)` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Cancel confirmation dialog ────────────────────────────────────── */}
      <AlertDialog
        open={!!cancelDialog?.open}
        onOpenChange={(open) => !open && setCancelDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelDialog?.immediately ? "Cancel subscription immediately?" : "Schedule cancellation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog?.immediately ? (
                <>
                  The subscription for <strong>{cancelDialog.companyName ?? "this company"}</strong> will
                  be canceled <strong>immediately</strong>. Access will end right now. This action cannot be undone.
                </>
              ) : (
                <>
                  The subscription for <strong>{cancelDialog?.companyName ?? "this company"}</strong> will
                  remain active until the end of the current billing period, then will not renew.
                  You can undo this before the period ends.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className={
                cancelDialog?.immediately
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }
            >
              {cancelDialog?.immediately ? "Cancel now" : "Schedule cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
