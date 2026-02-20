"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Search, Filter, X, FileText, Download, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { getInvoicePdfUrl } from "@/app/actions/admin-dashboard"

interface Invoice {
  id: string
  orderNumber: string
  companyName: string | null
  companyEmail: string | null
  amount: number
  taxAmount?: number | null
  status: string
  date: Date | null
  createdAt: Date
  userId?: string
  userName?: string
  userEmail?: string
  invoicePdf?: string | null
  hostedInvoiceUrl?: string | null
  stripeInvoiceId?: string | null
  paymentIntentId?: string | null
  billingType?: string | null
}

// ---- Bouton de téléchargement de facture ----
// Résolution en 4 stratégies (voir getInvoicePdfUrl dans admin-dashboard.ts) :
//  1. invoicePdf / hostedInvoiceUrl présents  → lien direct (pas d'appel Stripe)
//  2. stripeInvoiceId (in_xxx)                → GET /invoices/{id}
//  3. paymentIntentId = sub_xxx               → GET /invoices?subscription={id} (sub mal mappée)
//  4. paymentIntentId = pi_xxx                → GET /payment_intents/{id} → invoice ou receipt
function InvoiceDownloadButton({
  orderId,
  invoicePdf,
  hostedInvoiceUrl,
  stripeInvoiceId,
  paymentIntentId,
  size = "icon",
}: {
  orderId: string
  invoicePdf?: string | null
  hostedInvoiceUrl?: string | null
  stripeInvoiceId?: string | null
  paymentIntentId?: string | null
  size?: "icon" | "sm"
}) {
  const [loading, setLoading] = useState(false)

  if (invoicePdf) {
    return (
      <Button variant="ghost" size={size} asChild title="Download invoice PDF">
        <a href={invoicePdf} target="_blank" rel="noopener noreferrer" download>
          {size === "icon" ? <Download className="h-4 w-4" /> : <><Download className="h-4 w-4 mr-2" />Download PDF</>}
        </a>
      </Button>
    )
  }

  if (hostedInvoiceUrl) {
    return (
      <Button variant="ghost" size={size} asChild title="View hosted invoice">
        <a href={hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
          {size === "icon" ? <FileText className="h-4 w-4" /> : <><FileText className="h-4 w-4 mr-2" />View invoice</>}
        </a>
      </Button>
    )
  }

  if (stripeInvoiceId || paymentIntentId) {
    const handleFetch = async () => {
      setLoading(true)
      try {
        const result = await getInvoicePdfUrl(stripeInvoiceId, paymentIntentId, orderId)
        if (!result.success) {
          toast.error(result.error || "Unable to retrieve invoice")
          return
        }
        const url = result.invoicePdf || result.hostedInvoiceUrl
        if (!url) {
          toast.error("Invoice URL not available yet")
          return
        }
        if (result.isReceipt) {
          toast.info("Opening Stripe receipt (legacy order — no invoice PDF available)")
        }
        window.open(url, "_blank", "noopener,noreferrer")
      } catch {
        toast.error("Error fetching invoice")
      } finally {
        setLoading(false)
      }
    }
    return (
      <Button
        variant="ghost"
        size={size}
        disabled={loading}
        onClick={handleFetch}
        title="Fetch & download invoice"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : size === "icon"
            ? <Download className="h-4 w-4" />
            : <><Download className="h-4 w-4 mr-2" />Download PDF</>
        }
      </Button>
    )
  }

  return <span className="text-xs text-muted-foreground">—</span>
}

function billingTypeLabel(type?: string | null): string {
  switch (type) {
    case "subscription": return "Subscription"
    case "hourly":       return "Hourly"
    default:             return "One-time"
  }
}

function billingTypeBadge(type?: string | null) {
  switch (type) {
    case "subscription":
      return <Badge variant="secondary" className="whitespace-nowrap">Subscription</Badge>
    case "hourly":
      return <Badge variant="outline" className="whitespace-nowrap">Hourly</Badge>
    default:
      return <Badge variant="default" className="whitespace-nowrap bg-brand/10 text-brand border-brand/20">One-time</Badge>
  }
}

interface InvoicesTableProps {
  invoices: Invoice[]
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")

  // Filtrage des factures
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      // Recherche textuelle
      const matchesSearch =
        invoice.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.companyEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre de statut
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

      // Filtre de type de facturation
      const effectiveType = invoice.billingType || "one_time"
      const matchesBillingType = billingTypeFilter === "all" || effectiveType === billingTypeFilter

      // Filtre de montant
      const amount = invoice.amount / 100
      const matchesMinAmount = !minAmount || amount >= parseFloat(minAmount)
      const matchesMaxAmount = !maxAmount || amount <= parseFloat(maxAmount)

      // Filtre de date
      let matchesDate = true
      if (dateFilter !== "all" && invoice.date) {
        const invoiceDate = new Date(invoice.date)
        const now = new Date()
        switch (dateFilter) {
          case "today":
            matchesDate = invoiceDate.toDateString() === now.toDateString()
            break
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = invoiceDate >= weekAgo
            break
          }
          case "month": {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            matchesDate = invoiceDate >= monthAgo
            break
          }
          case "year":
            matchesDate = invoiceDate.getFullYear() === now.getFullYear()
            break
        }
      }

      return matchesSearch && matchesStatus && matchesBillingType && matchesMinAmount && matchesMaxAmount && matchesDate
    })
  }, [invoices, searchTerm, statusFilter, billingTypeFilter, dateFilter, minAmount, maxAmount])

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setBillingTypeFilter("all")
    setDateFilter("all")
    setMinAmount("")
    setMaxAmount("")
  }

  const hasActiveFilters = searchTerm || statusFilter !== "all" || billingTypeFilter !== "all" || dateFilter !== "all" || minAmount || maxAmount

  const exportCSV = () => {
    const headers = ["Order #", "Customer", "User", "Type", "Amount (€)", "TVA (€)", "Status", "Date", "Invoice URL"]
    const rows = filteredInvoices.map((inv) => [
      inv.orderNumber,
      inv.companyName || inv.userName || "Unknown",
      inv.userName ? `${inv.userName} <${inv.userEmail || ''}>` : inv.userEmail || "",
      billingTypeLabel(inv.billingType),
      (inv.amount / 100).toFixed(2),
      inv.taxAmount ? (inv.taxAmount / 100).toFixed(2) : "",
      inv.status,
      inv.date ? new Date(inv.date).toLocaleDateString("fr-FR") : "-",
      inv.invoicePdf || inv.hostedInvoiceUrl || "",
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-brand" />
              Search Filters
            </h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Recherche textuelle */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order #, company, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Type filter */}
            <div className="space-y-2">
              <Label htmlFor="billing-type">Type</Label>
              <Select value={billingTypeFilter} onValueChange={setBillingTypeFilter}>
                <SelectTrigger id="billing-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period filter */}
            <div className="space-y-2">
              <Label htmlFor="date">Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="date">
                  <SelectValue placeholder="All dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount filter */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </Card>

      {/* Invoices table - Desktop */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>TVA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.orderNumber}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{invoice.companyName || invoice.userName || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{invoice.companyEmail || invoice.userEmail}</span>
                      {invoice.userName && (
                        <span className="text-xs text-muted-foreground italic">
                          {invoice.userName}{invoice.userEmail && invoice.userEmail !== invoice.companyEmail ? ` • ${invoice.userEmail}` : ""}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{billingTypeBadge(invoice.billingType)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(invoice.amount / 100)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {invoice.taxAmount ? formatCurrency(invoice.taxAmount / 100) : <span className="text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "paid" ? "default" :
                        invoice.status === "pending" ? "secondary" :
                        invoice.status === "refunded" ? "outline" :
                        "destructive"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.date ? new Date(invoice.date).toLocaleDateString("en-US") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <InvoiceDownloadButton
                      orderId={invoice.id}
                      invoicePdf={invoice.invoicePdf}
                      hostedInvoiceUrl={invoice.hostedInvoiceUrl}
                      stripeInvoiceId={invoice.stripeInvoiceId}
                      paymentIntentId={invoice.paymentIntentId}
                      size="icon"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No invoices found.
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="space-y-3">
                {/* Header avec N° et Statut */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invoice.orderNumber}</span>
                  </div>
                  <Badge 
                    variant={
                      invoice.status === "paid" ? "default" : 
                      invoice.status === "pending" ? "secondary" :
                      invoice.status === "refunded" ? "outline" :
                      "destructive"
                    }
                  >
                    {invoice.status}
                  </Badge>
                </div>

                {/* Client + User */}
                <div>
                  <div className="font-medium text-sm">
                    {invoice.companyName || invoice.userName || "Unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {invoice.companyEmail || invoice.userEmail}
                  </div>
                  {invoice.userName && (
                    <div className="text-xs text-muted-foreground italic mt-0.5">
                      {invoice.userName}{invoice.userEmail && invoice.userEmail !== invoice.companyEmail ? ` • ${invoice.userEmail}` : ""}
                    </div>
                  )}
                </div>

                {/* TVA */}
                {invoice.taxAmount ? (
                  <div className="text-xs text-muted-foreground">
                    TVA&nbsp;: {formatCurrency(invoice.taxAmount / 100)}
                  </div>
                ) : null}

                {/* Montant et Date */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-xl font-bold text-brand">
                    {formatCurrency(invoice.amount / 100)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {invoice.date ? new Date(invoice.date).toLocaleDateString('en-US') : "-"}
                  </span>
                </div>

                {/* Billing type + actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  {billingTypeBadge(invoice.billingType)}
                  <InvoiceDownloadButton
                    orderId={invoice.id}
                    invoicePdf={invoice.invoicePdf}
                    hostedInvoiceUrl={invoice.hostedInvoiceUrl}
                    stripeInvoiceId={invoice.stripeInvoiceId}
                    paymentIntentId={invoice.paymentIntentId}
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  )
}
