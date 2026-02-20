"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CreditCard, ExternalLink, Loader2, AlertCircle, Plus, RefreshCw,
  Download, Pause, Play, XCircle, CheckCircle2, Clock, Receipt,
  CalendarDays, ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getStripePaymentMethods,
  getInvoices,
  setDefaultPaymentMethod,
  getCompanySubscriptions,
  cancelSubscription,
  resumeSubscription,
  pauseSubscription,
  unpauseSubscription,
} from "@/app/actions/payments"
import { CreditCardSheet, CreditCardItem } from "@/components/dashboard/credit-card-sheet"
import type { PaymentCard } from "@/components/dashboard/credit-card-sheet"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StripeSubscription {
  id: string
  status: string // 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' | 'incomplete'
  cancel_at_period_end: boolean
  pause_collection?: { behavior: string } | null
  current_period_end: number
  current_period_start: number
  plan?: { amount: number; currency: string; interval: string; interval_count: number }
  items?: { data: Array<{ price: { nickname?: string; product?: string; unit_amount: number; currency: string; recurring?: { interval: string } } }> }
  latest_invoice?: { id: string; amount_due: number; status: string; invoice_pdf?: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInvoiceStatusBadge(status: string) {
  switch (status) {
    case 'paid': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300">Paid</Badge>
    case 'open': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">Pending</Badge>
    case 'draft': return <Badge variant="secondary">Draft</Badge>
    case 'void': return <Badge variant="outline" className="text-muted-foreground">Void</Badge>
    case 'uncollectible': return <Badge className="bg-red-100 text-red-800">Uncollectible</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function getSubscriptionStatusBadge(sub: StripeSubscription) {
  if (sub.pause_collection) {
    return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Paused</Badge>
  }
  if (sub.cancel_at_period_end) {
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">Cancellation scheduled</Badge>
  }
  switch (sub.status) {
    case 'active': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</Badge>
    case 'trialing': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Trialing</Badge>
    case 'past_due': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Past due</Badge>
    case 'canceled': return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Canceled</Badge>
    case 'incomplete': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Incomplete</Badge>
    default: return <Badge variant="outline">{sub.status}</Badge>
  }
}

function getSubscriptionLabel(sub: StripeSubscription) {
  const item = sub.items?.data?.[0]?.price
  if (!item) return 'Subscription'
  const interval = item.recurring?.interval
  const intervalLabel = interval === 'month' ? '/month' : interval === 'year' ? '/year' : interval === 'week' ? '/week' : ''
  const amount = formatAmount(item.unit_amount, item.currency)
  return `${amount}${intervalLabel}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [cards, setCards] = useState<PaymentCard[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [subscriptionsList, setSubscriptionsList] = useState<StripeSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingDefaultCard, setSettingDefaultCard] = useState<string | null>(null)

  // Subscription action state
  const [subActionLoading, setSubActionLoading] = useState<string | null>(null)
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; subId: string; immediately: boolean } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [cardsRes, invoicesRes, subsRes] = await Promise.all([
        getStripePaymentMethods(),
        getInvoices(),
        getCompanySubscriptions(),
      ])

      if (cardsRes.success && cardsRes.cards) {
        setCards(cardsRes.cards)
      }
      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : [])
      }
      if (subsRes.success && subsRes.data) {
        setSubscriptionsList(subsRes.data as StripeSubscription[])
      }
    } catch (error) {
      console.error("Error fetching payment data:", error)
      toast.error("Failed to load payment data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = () => {
    setLoading(true)
    fetchData()
  }

  const handleSetDefaultCard = async (cardId: string) => {
    setSettingDefaultCard(cardId)
    try {
      const res = await setDefaultPaymentMethod(cardId)
      if (res.success) {
        toast.success("Default card updated")
        await fetchData()
      } else {
        toast.error(res.error || "Failed to set default card")
      }
    } catch {
      toast.error("Failed to set default card")
    } finally {
      setSettingDefaultCard(null)
    }
  }

  // ── Subscription actions ──────────────────────────────────────────────────

  const handlePauseSubscription = async (subId: string) => {
    setSubActionLoading(subId)
    const res = await pauseSubscription(subId)
    if (res.success) {
      toast.success("Subscription paused")
      await fetchData()
    } else {
      toast.error(res.error || "Failed to pause subscription")
    }
    setSubActionLoading(null)
  }

  const handleUnpauseSubscription = async (subId: string) => {
    setSubActionLoading(subId)
    const res = await unpauseSubscription(subId)
    if (res.success) {
      toast.success("Subscription resumed")
      await fetchData()
    } else {
      toast.error(res.error || "Failed to resume subscription")
    }
    setSubActionLoading(null)
  }

  const handleResumeSubscription = async (subId: string) => {
    setSubActionLoading(subId)
    const res = await resumeSubscription(subId)
    if (res.success) {
      toast.success("Cancellation reversed — subscription kept")
      await fetchData()
    } else {
      toast.error(res.error || "Failed to reverse cancellation")
    }
    setSubActionLoading(null)
  }

  const handleCancelSubscription = async () => {
    if (!cancelDialog) return
    const { subId, immediately } = cancelDialog
    setCancelDialog(null)
    setSubActionLoading(subId)
    const res = await cancelSubscription(subId, immediately)
    if (res.success) {
      toast.success(immediately ? "Subscription canceled immediately" : "Subscription scheduled for cancellation at period end")
      await fetchData()
    } else {
      toast.error(res.error || "Failed to cancel subscription")
    }
    setSubActionLoading(null)
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeSubscriptions = subscriptionsList.filter(s => s.status !== 'canceled')
  const canceledSubscriptions = subscriptionsList.filter(s => s.status === 'canceled')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage your payment methods, subscriptions and invoices</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Payment Methods ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment methods
            </CardTitle>
            <CardDescription>Your cards are secured via Stripe</CardDescription>
          </div>
          <Button
            onClick={() => setSheetOpen(true)}
            className="bg-brand hover:bg-brand-hover text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            {cards.length > 0 ? 'Manage cards' : 'Add a card'}
          </Button>
        </CardHeader>
        <CardContent>
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">No payment method</p>
              <p className="text-sm text-muted-foreground max-w-[340px] mb-4">
                Add a debit or credit card to automatically settle your invoices and subscriptions.
              </p>
              <Button variant="outline" onClick={() => setSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Add your first card
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <CreditCardItem
                  key={card.id}
                  card={card}
                  onSetDefault={!card.is_default ? () => handleSetDefaultCard(card.id) : undefined}
                  isSettingDefault={settingDefaultCard === card.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Active Subscriptions ─────────────────────────────────────────────── */}
      {activeSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Active subscriptions
            </CardTitle>
            <CardDescription>Manage your recurring subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next renewal</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSubscriptions.map((sub) => {
                  const isLoading = subActionLoading === sub.id
                  const isPaused = !!sub.pause_collection
                  const isCancelScheduled = sub.cancel_at_period_end

                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium font-mono text-xs">
                        {sub.id.substring(0, 14)}…
                      </TableCell>
                      <TableCell>{getSubscriptionStatusBadge(sub)}</TableCell>
                      <TableCell className="text-sm">
                        {isCancelScheduled ? (
                          <span className="text-orange-600 dark:text-orange-400">
                            Ends on {formatDate(sub.current_period_end)}
                          </span>
                        ) : (
                          formatDate(sub.current_period_end)
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getSubscriptionLabel(sub)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                Gérer <ChevronDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Pause / Unpause */}
                              {!isCancelScheduled && (
                                isPaused ? (
                                  <DropdownMenuItem onClick={() => handleUnpauseSubscription(sub.id)}>
                                    <Play className="mr-2 h-4 w-4 text-green-600" />
                                    Resume billing
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handlePauseSubscription(sub.id)}>
                                    <Pause className="mr-2 h-4 w-4 text-purple-600" />
                                    Pause
                                  </DropdownMenuItem>
                                )
                              )}

                              {/* Resume cancellation */}
                              {isCancelScheduled && (
                                <DropdownMenuItem onClick={() => handleResumeSubscription(sub.id)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                  Cancel cancellation
                                </DropdownMenuItem>
                              )}

                              {/* Latest invoice */}
                              {sub.latest_invoice?.invoice_pdf && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <a href={sub.latest_invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                      <Download className="mr-2 h-4 w-4" />
                                      Latest invoice PDF
                                    </a>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {/* Cancel options */}
                              {!isCancelScheduled && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-orange-600 focus:text-orange-600"
                                    onClick={() => setCancelDialog({ open: true, subId: sub.id, immediately: false })}
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Cancel at period end
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setCancelDialog({ open: true, subId: sub.id, immediately: true })}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel immediately
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Invoices ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>Your complete invoice history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm mt-1">
                Your invoices will appear here after your first purchase or subscription.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => {
                  const amountCents = invoice.amount_due ?? invoice.total ?? 0
                  const currency = invoice.currency?.toUpperCase() ?? 'EUR'
                  const createdAt = invoice.created ? invoice.created : null
                  const description = invoice.description
                    || invoice.lines?.data?.[0]?.description
                    || (invoice.subscription ? 'Subscription' : 'Purchase')

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium font-mono text-xs">
                        {invoice.number || invoice.id?.substring(0, 12)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {createdAt ? formatDate(createdAt) : '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={description}>
                        {description}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(amountCents, currency)}
                      </TableCell>
                      <TableCell>
                        {getInvoiceStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.invoice_pdf ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" download>
                                <Download className="h-3.5 w-3.5 mr-1" />
                                PDF
                              </a>
                            </Button>
                          ) : invoice.hosted_invoice_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                View
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Canceled subscriptions (collapsed) ───────────────────────────────── */}
      {canceledSubscriptions.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Canceled subscriptions ({canceledSubscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {canceledSubscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between text-sm text-muted-foreground py-1">
                  <span className="font-mono text-xs">{sub.id.substring(0, 14)}…</span>
                  <span>{getSubscriptionLabel(sub)}</span>
                  {getSubscriptionStatusBadge(sub)}
                  {sub.latest_invoice?.invoice_pdf && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={sub.latest_invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Credit Card Sheet ─────────────────────────────────────────────────── */}
      <CreditCardSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cards={cards}
        onRefresh={handleRefresh}
      />

      {/* ── Cancel confirmation dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!cancelDialog?.open} onOpenChange={(o) => !o && setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelDialog?.immediately ? 'Cancel subscription immediately?' : 'Cancel subscription at end of period?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog?.immediately
                ? 'The subscription will be canceled immediately and you will lose access to the service. This action is irreversible.'
                : 'The subscription will remain active until the end of the current period, then will be automatically canceled. You can undo this before the deadline.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className={cancelDialog?.immediately ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}
            >
              {cancelDialog?.immediately ? 'Cancel now' : 'Confirm cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}