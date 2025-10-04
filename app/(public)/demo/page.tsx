"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ArrowRight, Users, CreditCard, BarChart4, ArrowUpRight, Settings } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { DemoMobileNav } from "@/components/demo-mobile-nav"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import Link from "next/link"

// Sample data for the dashboard
const revenueData = [
  { month: "Jan", revenue: 12400, users: 240, growth: 5 },
  { month: "Feb", revenue: 13980, users: 276, growth: 12 },
  { month: "Mar", revenue: 19800, users: 380, growth: 38 },
  { month: "Apr", revenue: 23908, users: 490, growth: 20 },
  { month: "May", revenue: 28800, users: 610, growth: 20 },
  { month: "Jun", revenue: 33800, users: 740, growth: 17 },
  { month: "Jul", revenue: 39300, users: 880, growth: 16 },
]

const usersByPlan = [
  { name: "Free", value: 1200 },
  { name: "Starter", value: 2400 },
  { name: "Pro", value: 1800 },
  { name: "Enterprise", value: 800 },
]

const userActivity = [
  { name: "Mon", active: 4000, new: 2400 },
  { name: "Tue", active: 3000, new: 1398 },
  { name: "Wed", active: 2000, new: 9800 },
  { name: "Thu", active: 2780, new: 3908 },
  { name: "Fri", active: 1890, new: 4800 },
  { name: "Sat", active: 2390, new: 3800 },
  { name: "Sun", active: 3490, new: 4300 },
]

const featureUsage = [
  { feature: "Dashboard", usage: 95 },
  { feature: "Analytics", usage: 80 },
  { feature: "Reports", usage: 70 },
  { feature: "User Management", usage: 65 },
  { feature: "Billing", usage: 60 },
  { feature: "API", usage: 45 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#CD7F32"]

export default function DemoPage() {
  return (
    <div className="space-y-8">
      <div className="md:hidden">
        <DemoMobileNav />
      </div>

      {/* Rest of the page content */}
      <section id="overview" className="space-y-4">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        {/* Dashboard content */}
      </section>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Demo</h1>
          <p className="text-muted-foreground">
            Visualize your SaaS metrics with powerful analytics and reporting tools
          </p>
        </div>
        <Link href="/auth/register">
          <Button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
            Try It Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,243</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              12% from last month
            </p>
            <Progress value={75} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$152,431</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              8.2% from last month
            </p>
            <Progress value={65} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.6%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              0.8% from last month
            </p>
            <Progress value={36} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$29.08</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              2.1% from last month
            </p>
            <Progress value={58} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics Section */}
      <div className="mt-16" id="revenue">
        <h2 className="text-2xl font-bold mb-6">Revenue Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue with trend analysis</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#CD7F32" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Growth Rate</CardTitle>
              <CardDescription>Monthly growth rate percentage</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="growth" stroke="#CD7F32" fill="#CD7F32" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Metrics Section */}
      <div className="mt-16" id="users">
        <h2 className="text-2xl font-bold mb-6">User Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>Monthly user acquisition</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChartContainer
                config={{
                  users: {
                    label: "Users",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#82ca9d" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Retention</CardTitle>
              <CardDescription>User retention by cohort</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={[
                    { subject: "Week 1", A: 100, fullMark: 100 },
                    { subject: "Week 2", A: 85, fullMark: 100 },
                    { subject: "Week 3", A: 72, fullMark: 100 },
                    { subject: "Week 4", A: 65, fullMark: 100 },
                    { subject: "Month 2", A: 58, fullMark: 100 },
                    { subject: "Month 3", A: 52, fullMark: 100 },
                  ]}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Retention %" dataKey="A" stroke="#CD7F32" fill="#CD7F32" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Section */}
      <div className="mt-16" id="engagement">
        <h2 className="text-2xl font-bold mb-6">Engagement Data</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>Daily active users and new sign-ups</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={userActivity}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="active" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="new" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>Most used features in the platform</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={featureUsage}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="feature" type="category" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="usage" name="Usage %" fill="#CD7F32" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Plan Distribution Section */}
      <div className="mt-16" id="plans">
        <h2 className="text-2xl font-bold mb-6">Plan Distribution</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Users by Plan</CardTitle>
              <CardDescription>Distribution of users across different plans</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usersByPlan}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {usersByPlan.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
              <CardDescription>Revenue distribution across different plans</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Free", value: 0 },
                      { name: "Starter", value: 48000 },
                      { name: "Pro", value: 72000 },
                      { name: "Enterprise", value: 32000 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                  >
                    {usersByPlan.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Billing Section */}
      <div className="mt-16" id="billing">
        <h2 className="text-2xl font-bold mb-6">Billing Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue Breakdown</CardTitle>
              <CardDescription>Revenue by month with year-over-year comparison</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Duration</CardTitle>
              <CardDescription>Average time spent on the platform</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { day: "Mon", duration: 12 },
                    { day: "Tue", duration: 15 },
                    { day: "Wed", duration: 18 },
                    { day: "Thu", duration: 14 },
                    { day: "Fri", duration: 16 },
                    { day: "Sat", duration: 8 },
                    { day: "Sun", duration: 10 },
                  ]}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `${value} minutes`} />
                  <Legend />
                  <Line type="monotone" dataKey="duration" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Section */}
      <div className="mt-16" id="settings">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Settings</CardTitle>
            <CardDescription>Customize your dashboard experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-10">
              <div className="text-center">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Dashboard Customization</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  In a real dashboard, you would be able to customize your views, set up alerts, and configure your
                  preferences.
                </p>
                <Button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
                  Try It Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 rounded-lg border p-8 text-center bg-[#CD7F32]/10 border-[#CD7F32]/20">
        <h2 className="text-3xl font-bold mb-4">Ready to Visualize Your Business Metrics?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Get access to powerful analytics and reporting tools to help you make data-driven decisions for your business.
        </p>
        <Link href="/auth/register">
          <Button size="lg" className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
            Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
      {/* Other sections */}
    </div>
  )
}
