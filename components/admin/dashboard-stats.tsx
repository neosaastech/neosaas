"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, CreditCard, TrendingUp, Loader2, Building2, FileText, ArrowRight, RefreshCw, Zap, CheckCircle2, XCircle } from "lucide-react"
import { MetricCard } from "./metric-card"
import { fetchAdminDashboardStats } from "@/app/actions/admin-dashboard"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, AreaChart, Area } from "recharts"
import Link from "next/link"

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "bigint") {
    const coerced = Number(value)
    return Number.isFinite(coerced) ? coerced : null
  }

  if (typeof value === "string") {
    const coerced = Number(value)
    return Number.isFinite(coerced) ? coerced : null
  }

  if (value == null) {
    return null
  }

  const coerced = Number(value)
  return Number.isFinite(coerced) ? coerced : null
}

function formatUsd(value: unknown, digits = 2): string {
  const n = toFiniteNumber(value) ?? 0
  return `$${n.toFixed(digits)}`
}

function formatUsdFromCents(cents: unknown, digits = 2): string {
  const n = toFiniteNumber(cents) ?? 0
  return `$${(n / 100).toFixed(digits)}`
}

export function DashboardStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [stripeSyncing, setStripeSyncing] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchAdminDashboardStats()
        setStats(data)
        setError(null)
      } catch (err: any) {
        console.error("Failed to load stats", err)
        setError(err?.message || "Failed to load dashboard statistics")
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  // Lightweight Stripe connection check (reads existing test-stripe endpoint)
  useEffect(() => {
    const checkStripe = async () => {
      try {
        const res = await fetch('/api/admin/payments/test-stripe?mode=test')
        if (res.ok) {
          const data = await res.json()
          setStripeStatus(data.secretKeyValid ? 'connected' : 'disconnected')
        } else {
          setStripeStatus('disconnected')
        }
      } catch {
        setStripeStatus('disconnected')
      }
    }
    checkStripe()
  }, [])

  const triggerFullSync = async () => {
    setStripeSyncing(true)
    try {
      await Promise.all([
        fetch('/api/stripe/sync/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction: 'both' }),
        }),
        fetch('/api/stripe/sync/subscriptions', { method: 'POST' }),
      ])
    } finally {
      setStripeSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-muted-foreground">
        <p className="text-red-500 font-medium">Error: {error}</p>
        <p className="text-sm mt-2">Please check the console for more details.</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No data available.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stripe connection badge */}
          {stripeStatus === 'connected' && (
            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Stripe connected
            </Badge>
          )}
          {stripeStatus === 'disconnected' && (
            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 text-xs gap-1">
              <XCircle className="h-3 w-3" />
              Stripe not configured
            </Badge>
          )}
          {stripeStatus === 'connected' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={triggerFullSync}
              disabled={stripeSyncing}
            >
              {stripeSyncing
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />
              }
              Sync Stripe
            </Button>
          )}
          <Select defaultValue="30d">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="12m">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatUsd(stats.metrics?.revenue)}
          icon={DollarSign}
          description="Lifetime revenue"
        />
        <MetricCard
          title="Total Subscriptions"
          value={stats.metrics?.subscriptions || 0}
          icon={Users}
          description="All time subscriptions"
        />
        <MetricCard
          title="Active Plans"
          value={stats.metrics?.activePlans || 0}
          icon={CreditCard}
          description="Currently active"
        />
        <MetricCard
          title="Total Companies"
          value={stats.metrics?.companies || 0}
          icon={Building2}
          description="Registered organizations"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.chartData || []}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [formatUsd(value), 'Revenue']}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest billing activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/invoices">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats?.recentInvoices?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No invoices yet.</p>
              ) : (
                stats?.recentInvoices?.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{invoice.companyName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.orderNumber}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm font-medium">
                        {formatUsdFromCents(invoice.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Growth Analysis (Double Curve) */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Analysis</CardTitle>
            <CardDescription>Registrations vs First Purchases (Activations)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.chartData || []}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="registrations"
                    name="Registrations"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="activations"
                    name="Activations (Paid)"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Writers Growth */}
        <Card>
          <CardHeader>
            <CardTitle>New Writers</CardTitle>
            <CardDescription>Individual registrations with 'writer' role</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData || []}>
                  <defs>
                    <linearGradient id="colorWriters" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="writers" 
                    name="New Writers"
                    stroke="#f59e0b" 
                    fillOpacity={1} 
                    fill="url(#colorWriters)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Registrations & Active Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations & Active Companies</CardTitle>
          <CardDescription>Overview of the latest registered companies and their subscription status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentCompanies?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No companies registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                stats?.recentCompanies?.map((company: any) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.email}</TableCell>
                    <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={company.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                        {company.subscriptionStatus || 'No Subscription'}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.plan || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sales by Product Type */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Product Type</CardTitle>
            <CardDescription>Revenue breakdown by product category</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.salesByType?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet.</p>
            ) : (
              <div className="space-y-4">
                {stats?.salesByType?.map((item: any) => {
                  const revenue = Number(item?.revenue || 0)
                  const ordersCount = Number(item?.orders || 0)
                  const quantityCount = Number(item?.quantity || 0)
                  const typeLabels: Record<string, string> = {
                    physical: 'Physical Products',
                    digital: 'Digital Products',
                    standard: 'Standard Products',
                    unknown: 'Unknown'
                  }

                  const typeColors: Record<string, string> = {
                    physical: 'bg-blue-500',
                    digital: 'bg-purple-500',
                    standard: 'bg-gray-500',
                    unknown: 'bg-gray-400'
                  }

                  return (
                    <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${typeColors[item.type] || typeColors.unknown}`} />
                        <div>
                          <p className="font-medium text-sm">{typeLabels[item.type] || item.type}</p>
                          <p className="text-xs text-muted-foreground">{ordersCount} orders • {quantityCount} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">${revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing products all time</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topProducts?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No products sold yet.</p>
            ) : (
              <div className="space-y-3">
                {stats?.topProducts?.slice(0, 5).map((product: any, index: number) => (
                  <div key={product?.id || `${product?.name || 'product'}-${index}`} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{Number(product?.quantity || 0)} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${Number(product?.revenue || 0).toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs">{product.type || 'unknown'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
