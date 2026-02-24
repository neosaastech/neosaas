"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  CreditCard, AlertCircle, ExternalLink, Loader2,
  CheckCircle, XCircle, Zap, Webhook,
  ShieldCheck, FlaskConical, Rocket, Search, Building2, LinkIcon, Unlink,
  RefreshCw, ArrowDownToLine, ArrowUpFromLine, Users, ReceiptText
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface StripeCheck {
  ok: boolean
  label: string
  message: string
}

interface StripeTestResult {
  success: boolean
  timestamp: string
  secretKeyValid: boolean
  publishableKeyPresent: boolean
  webhookConfigured: boolean
  environment: 'test' | 'live' | 'unknown'
  checks: StripeCheck[]
  summary: string
  details: string[]
}

interface StripeCompany {
  id: string
  name: string
  email: string
  siret: string | null
  phone: string | null
  stripeCustomerId: string | null
  isActive: boolean
  createdAt: string | null
}

interface StripeCustomersData {
  companies: StripeCompany[]
  stats: { total: number; linked: number; unlinked: number }
}

export function PaymentSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<StripeTestResult | null>(null)
  const [customersData, setCustomersData] = useState<StripeCustomersData | null>(null)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState<'all' | 'linked' | 'unlinked'>('all')

  const [config, setConfig] = useState({
    stripeEnabled: false,
    paypalEnabled: false,
    stripeMode: 'test' as 'test' | 'live',
  })

  // Sync state
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false)
  const [isSyncingSubscriptions, setIsSyncingSubscriptions] = useState(false)
  const [customerSyncResult, setCustomerSyncResult] = useState<any>(null)
  const [subscriptionSyncResult, setSubscriptionSyncResult] = useState<any>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          const data = await res.json()
          setConfig({
            stripeEnabled: data.stripe_enabled === 'true' || data.stripe_enabled === true,
            paypalEnabled: data.paypal_enabled === 'true' || data.paypal_enabled === true,
            stripeMode: data.stripe_mode === 'live' ? 'live' : 'test',
          })
        }
      } catch (error) {
        console.error("Failed to fetch payment config", error)
        toast.error("Failed to load payment settings")
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleSave = async (newConfig: typeof config) => {
    setIsSaving(true)
    setConfig(newConfig)

    try {
      const formData = new FormData()
      formData.append('stripeEnabled', newConfig.stripeEnabled.toString())
      formData.append('paypalEnabled', newConfig.paypalEnabled.toString())
      formData.append('stripeMode', newConfig.stripeMode)

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error("Failed to save")
      toast.success("Payment settings saved")
    } catch {
      toast.error("Failed to save payment settings")
    } finally {
      setIsSaving(false)
    }
  }

  const runStripeTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    toast.info(`Testing Stripe connection (${config.stripeMode} mode)...`)

    try {
      const res = await fetch(`/api/admin/payments/test-stripe?mode=${config.stripeMode}`)
      const data: StripeTestResult = await res.json()
      setTestResult(data)

      if (data.success) {
        toast.success(data.summary)
      } else {
        toast.error(data.summary)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Stripe test failed')
    } finally {
      setIsTesting(false)
    }
  }

  const loadStripeCustomers = async (search?: string, filter?: 'all' | 'linked' | 'unlinked') => {
    setCustomersLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter === 'linked') params.set('linked', 'true')
      else if (filter === 'unlinked') params.set('linked', 'false')

      const res = await fetch(`/api/admin/payments/stripe-customers?${params.toString()}`)
      if (res.ok) {
        const data: StripeCustomersData = await res.json()
        setCustomersData(data)
      } else {
        toast.error('Failed to load Stripe customers')
      }
    } catch {
      toast.error('Failed to load Stripe customers')
    } finally {
      setCustomersLoading(false)
    }
  }

  const syncCustomers = async (direction: 'stripe_to_neosaas' | 'neosaas_to_stripe' | 'both') => {
    setIsSyncingCustomers(true)
    setCustomerSyncResult(null)
    const labels: Record<string, string> = {
      stripe_to_neosaas: 'Importing customers from Stripe…',
      neosaas_to_stripe: 'Pushing companies to Stripe…',
      both: 'Syncing customers bidirectionally…',
    }
    toast.info(labels[direction])
    try {
      const res = await fetch('/api/stripe/sync/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      })
      const data = await res.json()
      if (data.success) {
        setCustomerSyncResult(data)
        toast.success('Customer sync completed')
        // Refresh the customers table if it was loaded
        if (customersData) loadStripeCustomers(customerSearch, customerFilter)
      } else {
        toast.error(data.error || 'Customer sync failed')
      }
    } catch {
      toast.error('Customer sync request failed')
    } finally {
      setIsSyncingCustomers(false)
    }
  }

  const syncSubscriptions = async () => {
    setIsSyncingSubscriptions(true)
    setSubscriptionSyncResult(null)
    toast.info('Syncing subscriptions from Stripe…')
    try {
      const res = await fetch('/api/stripe/sync/subscriptions', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSubscriptionSyncResult(data)
        toast.success(data.message || 'Subscription sync completed')
      } else {
        toast.error(data.error || 'Subscription sync failed')
      }
    } catch {
      toast.error('Subscription sync request failed')
    } finally {
      setIsSyncingSubscriptions(false)
    }
  }

  const getStripeDashboardUrl = (customerId: string, mode: 'test' | 'live') => {
    const prefix = mode === 'test' ? 'test/' : ''
    return `https://dashboard.stripe.com/${prefix}customers/${customerId}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand" />
            Payment Configuration
          </CardTitle>
          <CardDescription>
            Configure Stripe as your payment processor. API keys are managed in the{" "}
            <Link href="/admin/api" className="text-primary hover:underline">
              API Manager
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Stripe status banner */}
          <div className="flex items-start gap-3 rounded-lg border border-[#635BFF]/20 bg-[#635BFF]/5 p-4">
            <div className="h-10 w-10 rounded-full bg-[#635BFF]/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 32 32" className="h-6 w-6 fill-[#635BFF]" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.9 16.2c0 1.3 1.3 1.9 3.4 1.9 2.6 0 4.9-.6 4.9-.6v3.6s-1.9.6-4.5.6c-4.6 0-7.3-2.3-7.3-6.1 0-5.9 8.3-6.1 8.3-9.2 0-1-.9-1.6-2.6-1.6-2.3 0-4.6.7-4.6.7V1.8s2-.6 4.8-.6c4.3 0 7 2.2 7 5.9 0 6.1-8.4 6.2-8.4 9.1z"/>
              </svg>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Stripe — Primary Payment Processor</p>
              <p className="text-xs text-muted-foreground">
                Handles card payments, subscriptions, invoices and webhooks directly.
                No intermediary billing engine required.
              </p>
            </div>
          </div>

          {/* Payment Methods toggles */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-medium">Payment Methods</Label>
              <p className="text-sm text-muted-foreground">
                Enable payment providers for your platform.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Stripe toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#635BFF]/10 flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="h-6 w-6 fill-[#635BFF]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.9 16.2c0 1.3 1.3 1.9 3.4 1.9 2.6 0 4.9-.6 4.9-.6v3.6s-1.9.6-4.5.6c-4.6 0-7.3-2.3-7.3-6.1 0-5.9 8.3-6.1 8.3-9.2 0-1-.9-1.6-2.6-1.6-2.3 0-4.6.7-4.6.7V1.8s2-.6 4.8-.6c4.3 0 7 2.2 7 5.9 0 6.1-8.4 6.2-8.4 9.1z"/>
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base">Stripe</Label>
                    <p className="text-sm text-muted-foreground">Cards, subscriptions, invoices</p>
                  </div>
                </div>
                <Switch
                  checked={config.stripeEnabled}
                  onCheckedChange={(checked) => handleSave({ ...config, stripeEnabled: checked })}
                  disabled={isSaving}
                />
              </div>

              {/* PayPal toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#003087]/10 flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="h-5 w-5 fill-[#003087]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M26.6 9.3c-.6-2.6-2.8-4.3-6.5-4.3h-6.4c-.7 0-1.3.5-1.4 1.2L9.8 26.5c-.1.5.3 1 .8 1h3.8c.6 0 1.1-.4 1.2-1l.9-5.6h2.6c4.6 0 8.2-1.9 9.3-6.6.3-1.3.3-2.5-.2-3.6-.5-1.1-1.3-1.9-2.4-2.4z"/>
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base">PayPal</Label>
                    <p className="text-sm text-muted-foreground">Online payments</p>
                  </div>
                </div>
                <Switch
                  checked={config.paypalEnabled}
                  onCheckedChange={(checked) => handleSave({ ...config, paypalEnabled: checked })}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Stripe Mode Toggle — Test / Live */}
          {config.stripeEnabled && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-base font-medium">Stripe Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between test (sandbox) and live (production) Stripe credentials.
                  This determines which API keys are used for all payment operations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Test button */}
                <Button
                  type="button"
                  variant={config.stripeMode === 'test' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    config.stripeMode === 'test'
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                      : "text-muted-foreground"
                  )}
                  disabled={isSaving}
                  onClick={() => handleSave({ ...config, stripeMode: 'test' })}
                >
                  <FlaskConical className="h-4 w-4" />
                  Test
                </Button>

                {/* Live button */}
                <Button
                  type="button"
                  variant={config.stripeMode === 'live' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    config.stripeMode === 'live'
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                      : "text-muted-foreground"
                  )}
                  disabled={isSaving}
                  onClick={() => handleSave({ ...config, stripeMode: 'live' })}
                >
                  <Rocket className="h-4 w-4" />
                  Live
                </Button>

                {/* Current mode badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto text-xs font-mono",
                    config.stripeMode === 'live'
                      ? "border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                  )}
                >
                  {config.stripeMode === 'live' ? (
                    <><Rocket className="h-3 w-3 mr-1" />PRODUCTION</>
                  ) : (
                    <><FlaskConical className="h-3 w-3 mr-1" />SANDBOX</>
                  )}
                </Badge>
              </div>

              {config.stripeMode === 'live' && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    <strong>Live mode active.</strong> All payments will be charged to real cards.
                    Make sure your Stripe production keys are correctly configured in the API Manager.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stripe connection test */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-base font-medium">Connection Test</Label>
              <p className="text-sm text-muted-foreground">
                Verify your Stripe API keys and webhook configuration.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={runStripeTest}
              disabled={isTesting}
              className="w-full sm:w-auto"
            >
              {isTesting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" /> Test Stripe Connection</>
              )}
            </Button>

            {/* Test Results */}
            {testResult && (
              <div className={cn(
                "mt-4 rounded-lg border p-4 space-y-3",
                testResult.success
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                  : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
              )}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    {testResult.success
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />
                    }
                    {testResult.summary}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      testResult.environment === 'live'
                        ? "border-green-300 text-green-700 bg-green-50"
                        : testResult.environment === 'test'
                          ? "border-orange-300 text-orange-700 bg-orange-50"
                          : "border-gray-300 text-gray-600"
                    )}>
                      {testResult.environment === 'live' ? 'Production' : testResult.environment === 'test' ? 'Test/Sandbox' : 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(testResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Credential checks */}
                <div className="space-y-1.5">
                  {/* Secret key */}
                  <div className="flex items-center gap-2 text-sm">
                    {testResult.secretKeyValid
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />
                    }
                    <span>Secret key</span>
                    <span className={cn("text-xs ml-auto", testResult.secretKeyValid ? "text-green-600" : "text-red-600")}>
                      {testResult.secretKeyValid ? "Valid" : "Invalid or missing"}
                    </span>
                  </div>
                  {/* Publishable key */}
                  <div className="flex items-center gap-2 text-sm">
                    {testResult.publishableKeyPresent
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />
                    }
                    <span>Publishable key</span>
                    <span className={cn("text-xs ml-auto", testResult.publishableKeyPresent ? "text-green-600" : "text-red-600")}>
                      {testResult.publishableKeyPresent ? "Present" : "Missing"}
                    </span>
                  </div>
                  {/* Webhook */}
                  <div className="flex items-center gap-2 text-sm">
                    {testResult.webhookConfigured
                      ? <Webhook className="h-3.5 w-3.5 text-green-500" />
                      : <Webhook className="h-3.5 w-3.5 text-amber-500" />
                    }
                    <span>Webhook secret</span>
                    <span className={cn("text-xs ml-auto", testResult.webhookConfigured ? "text-green-600" : "text-amber-600")}>
                      {testResult.webhookConfigured ? "Configured" : "Not configured (optional)"}
                    </span>
                  </div>
                </div>

                {/* Individual endpoint checks */}
                {testResult.checks && testResult.checks.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">API Endpoint Checks</p>
                    {testResult.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {check.ok
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          : <XCircle className="h-3.5 w-3.5 text-red-500" />
                        }
                        <span>{check.label}</span>
                        <span className={cn("text-xs ml-auto truncate max-w-[200px]", check.ok ? "text-green-600" : "text-red-600")}>
                          {check.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {testResult.details.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                      Show raw details ({testResult.details.length})
                    </summary>
                    <div className="mt-1 space-y-0.5">
                      {testResult.details.map((d, i) => (
                        <p key={i} className="text-xs font-mono text-muted-foreground">{d}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Webhook info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">Stripe Webhooks</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure the following endpoint in your{" "}
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Stripe Dashboard <ExternalLink className="h-3 w-3" />
              </a>
              :
            </p>
            <code className="block rounded bg-muted px-3 py-2 text-xs font-mono break-all">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook
            </code>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Recommended events to subscribe:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 ml-3 list-disc">
                <li>payment_intent.succeeded</li>
                <li>payment_intent.payment_failed</li>
                <li>customer.subscription.created</li>
                <li>customer.subscription.updated</li>
                <li>customer.subscription.deleted</li>
                <li>invoice.paid</li>
                <li>invoice.payment_failed</li>
                <li>payment_method.attached</li>
                <li>payment_method.detached</li>
              </ul>
            </div>
          </div>

          {/* ── Bidirectional Stripe Sync ─────────────────────────────── */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Data Synchronization
              </Label>
              <p className="text-sm text-muted-foreground">
                Keep NeoSaaS and Stripe in sync. Use GET (read) to compare data, POST (write) to update.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Customers sync */}
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" />
                  <span className="font-medium text-sm">Customers</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Match NeoSaaS companies with Stripe customers by email or metadata.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSyncingCustomers}
                    onClick={() => syncCustomers('stripe_to_neosaas')}
                    className="justify-start"
                  >
                    {isSyncingCustomers ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="mr-2 h-3.5 w-3.5 text-blue-500" />
                    )}
                    Import from Stripe
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSyncingCustomers}
                    onClick={() => syncCustomers('neosaas_to_stripe')}
                    className="justify-start"
                  >
                    {isSyncingCustomers ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowUpFromLine className="mr-2 h-3.5 w-3.5 text-green-500" />
                    )}
                    Push unlinked to Stripe
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSyncingCustomers}
                    onClick={() => syncCustomers('both')}
                    className="justify-start"
                  >
                    {isSyncingCustomers ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5 text-purple-500" />
                    )}
                    Full bidirectional sync
                  </Button>
                </div>

                {/* Customer sync result */}
                {customerSyncResult && (
                  <div className="mt-2 rounded-md bg-muted p-2 text-xs space-y-1">
                    {customerSyncResult.results?.stripeToNeosaas && (
                      <div>
                        <span className="font-medium">Stripe → NeoSaaS:</span>{' '}
                        {customerSyncResult.results.stripeToNeosaas.updated} updated,{' '}
                        {customerSyncResult.results.stripeToNeosaas.matched} already linked,{' '}
                        {customerSyncResult.results.stripeToNeosaas.notFound} not found
                      </div>
                    )}
                    {customerSyncResult.results?.neosaasToStripe && (
                      <div>
                        <span className="font-medium">NeoSaaS → Stripe:</span>{' '}
                        {customerSyncResult.results.neosaasToStripe.created} created,{' '}
                        {customerSyncResult.results.neosaasToStripe.errors} errors
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subscriptions sync */}
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-brand" />
                  <span className="font-medium text-sm">Subscriptions</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pull subscription data from Stripe and update local records.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSyncingSubscriptions}
                  onClick={syncSubscriptions}
                  className="justify-start w-full"
                >
                  {isSyncingSubscriptions ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-3.5 w-3.5 text-blue-500" />
                  )}
                  Import from Stripe
                </Button>

                {/* Subscription sync result */}
                {subscriptionSyncResult && (
                  <div className="mt-2 rounded-md bg-muted p-2 text-xs space-y-1">
                    <div className="font-medium">{subscriptionSyncResult.message}</div>
                    {subscriptionSyncResult.data && (
                      <div className="text-muted-foreground">
                        {subscriptionSyncResult.data.created} created •{' '}
                        {subscriptionSyncResult.data.updated} updated •{' '}
                        {subscriptionSyncResult.data.skipped} skipped
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stripe Customers — Company ↔ Stripe mapping */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Stripe Customers
                </Label>
                <p className="text-sm text-muted-foreground">
                  Map your companies to Stripe customers. Find any client in Stripe from your enterprise data.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadStripeCustomers(customerSearch, customerFilter)}
                disabled={customersLoading}
              >
                {customersLoading
                  ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading...</>
                  : <><Search className="mr-2 h-3.5 w-3.5" /> Load Customers</>
                }
              </Button>
            </div>

            {/* Stats badges */}
            {customersData && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => { setCustomerFilter('all'); loadStripeCustomers(customerSearch, 'all') }}>
                  Total: {customersData.stats.total}
                </Badge>
                <Badge variant="outline" className="text-xs cursor-pointer border-green-300 text-green-700 bg-green-50" onClick={() => { setCustomerFilter('linked'); loadStripeCustomers(customerSearch, 'linked') }}>
                  <LinkIcon className="h-3 w-3 mr-1" /> Linked: {customersData.stats.linked}
                </Badge>
                <Badge variant="outline" className="text-xs cursor-pointer border-amber-300 text-amber-700 bg-amber-50" onClick={() => { setCustomerFilter('unlinked'); loadStripeCustomers(customerSearch, 'unlinked') }}>
                  <Unlink className="h-3 w-3 mr-1" /> Unlinked: {customersData.stats.unlinked}
                </Badge>
              </div>
            )}

            {/* Search */}
            {customersData && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by company name, email or SIRET..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadStripeCustomers(customerSearch, customerFilter) }}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => loadStripeCustomers(customerSearch, customerFilter)}>
                  Search
                </Button>
              </div>
            )}

            {/* Results table */}
            {customersData && customersData.companies.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SIRET</TableHead>
                      <TableHead>Stripe Customer</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersData.companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", company.isActive ? "bg-green-500" : "bg-gray-300")} />
                            {company.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{company.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{company.siret || '—'}</TableCell>
                        <TableCell>
                          {company.stripeCustomerId ? (
                            <Badge variant="outline" className="text-xs font-mono border-green-300 text-green-700 bg-green-50">
                              {company.stripeCustomerId}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                              <Unlink className="h-3 w-3 mr-1" /> Not linked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {company.stripeCustomerId && (
                            <a
                              href={getStripeDashboardUrl(company.stripeCustomerId, config.stripeMode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Open in Stripe <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {customersData && customersData.companies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No companies found matching your criteria.
              </p>
            )}
          </div>

          {/* API Configuration info */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">API Configuration</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Configure Stripe Secret Key, Publishable Key, and Webhook Secret in the API Manager.
                  Payment logs are available in{" "}
                  <Link href="/admin/logs" className="underline">System Logs</Link>{" "}
                  (category: stripe).
                </p>
                <Button variant="link" className="h-auto p-0 text-blue-700 dark:text-blue-300" asChild>
                  <Link href="/admin/api" className="flex items-center gap-1">
                    Open API Manager <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/10">
            <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              <strong>PCI Compliance:</strong> Stripe secret keys are never exposed to the frontend.
              Card data is handled exclusively by Stripe Elements. Only non-sensitive metadata
              (last 4 digits, brand, expiry) is stored locally.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
