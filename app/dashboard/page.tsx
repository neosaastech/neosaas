"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, TrendingUp, MoreHorizontal } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const conversionData = [
  { month: "Jan", impressions: 100, sessions: 85, downloads: 70, users: 50 },
  { month: "Feb", impressions: 120, sessions: 100, downloads: 85, users: 65 },
  { month: "Mar", impressions: 110, sessions: 95, downloads: 75, users: 60 },
  { month: "Apr", impressions: 130, sessions: 110, downloads: 90, users: 70 },
  { month: "May", impressions: 90, sessions: 75, downloads: 60, users: 45 },
  { month: "Jun", impressions: 125, sessions: 105, downloads: 85, users: 65 },
  { month: "Jul", impressions: 135, sessions: 115, downloads: 95, users: 75 },
  { month: "Aug", impressions: 140, sessions: 120, downloads: 100, users: 80 },
]

const dailySalesData = [
  { day: "Mon", sales: 350 },
  { day: "Tue", sales: 520 },
  { day: "Wed", sales: 380 },
  { day: "Thu", sales: 480 },
  { day: "Fri", sales: 420 },
  { day: "Sat", sales: 400 },
  { day: "Sun", sales: 390 },
]

const recentInvoices = [
  { id: "#DF429", date: "April 28, 2016", user: "Jenny Wilson", amount: "$473.85", status: "Complete" },
  { id: "#HTY274", date: "October 30, 2017", user: "Wade Warren", amount: "$293.01", status: "Complete" },
  { id: "#LKE600", date: "May 29, 2017", user: "Darlene Robertson", amount: "$782.01", status: "Pending" },
  { id: "#HRP447", date: "May 20, 2015", user: "Arlene McCoy", amount: "$202.87", status: "Cancelled" },
  { id: "#WRH647", date: "March 13, 2014", user: "Bessie Cooper", amount: "$490.51", status: "Complete" },
]

const recentActivities = [
  {
    user: "Francisco Gibbs",
    action: "created invoice",
    invoice: "PQ-4491C",
    time: "Just Now",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Francisco",
  },
  {
    user: "Courtney Henry",
    action: "created invoice",
    invoice: "HK-234C",
    time: "15 minutes ago",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Courtney",
  },
  {
    user: "Bessie Cooper",
    action: "created invoice",
    invoice: "LH-2891C",
    time: "5 months ago",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bessie",
  },
  {
    user: "Theresa Web",
    action: "created invoice",
    invoice: "CK-125NH",
    time: "2 weeks ago",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Theresa",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm text-muted-foreground">Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$200,45.87</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <ArrowUp className="mr-1 h-3 w-3" />
              +2.5%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm text-muted-foreground">Active Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">9,528</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <ArrowUp className="mr-1 h-3 w-3" />
              +9.5%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm text-muted-foreground">Customer Lifetime Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$849.54</div>
            <p className="text-xs text-red-500 flex items-center mt-1">
              <ArrowDown className="mr-1 h-3 w-3" />
              -1.6%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-sm text-muted-foreground">Customer Acquisition Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">9,528</div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <ArrowUp className="mr-1 h-3 w-3" />
              +3.5%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Conversion Funnel</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#CD7F32]" />
                <span>Ad Impressions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#E69A5C]" />
                <span>Website Session</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#F4B183]" />
                <span>App Download</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#B26B27]" />
                <span>New Users</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="impressions" stackId="a" fill="#CD7F32" radius={[0, 0, 0, 0]} />
                <Bar dataKey="sessions" stackId="a" fill="#E69A5C" radius={[0, 0, 0, 0]} />
                <Bar dataKey="downloads" stackId="a" fill="#F4B183" radius={[0, 0, 0, 0]} />
                <Bar dataKey="users" stackId="a" fill="#B26B27" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Product Performance</CardTitle>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Digital Product</p>
                <p className="text-2xl font-bold flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                  790
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Physical Product</p>
                <p className="text-2xl font-bold flex items-center mt-1">
                  <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                  572
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">Average Daily Sales</p>
                <p className="text-xs text-red-500">-0.52%</p>
              </div>
              <p className="text-2xl font-bold">$2,950</p>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={dailySalesData}>
                <Bar dataKey="sales" fill="#CD7F32" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Serial No.</TableHead>
                  <TableHead className="text-xs">Close Date</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell className="text-sm">{invoice.date}</TableCell>
                    <TableCell className="text-sm">{invoice.user}</TableCell>
                    <TableCell className="text-sm">{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === "Complete"
                            ? "default"
                            : invoice.status === "Pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className={
                          invoice.status === "Complete"
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            : invoice.status === "Pending"
                              ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Activities</CardTitle>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activity.avatar || "/placeholder.svg"} alt={activity.user} />
                    <AvatarFallback>
                      {activity.user
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">
                        New Invoice
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                      <span className="font-medium">{activity.invoice}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
