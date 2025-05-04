import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowUp, ArrowDown, Users, CreditCard, Package, HardDrive, Mail, BarChart } from "lucide-react"

// Sample data for the dashboard
const data = [
  { month: "Jan", revenue: 2400, users: 240 },
  { month: "Feb", revenue: 1398, users: 226 },
  { month: "Mar", revenue: 9800, users: 280 },
  { month: "Apr", revenue: 3908, users: 290 },
  { month: "May", revenue: 4800, users: 310 },
  { month: "Jun", revenue: 3800, users: 340 },
  { month: "Jul", revenue: 4300, users: 380 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your SaaS platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,543</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                12%
              </span>{" "}
              from last month
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
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                7.2%
              </span>{" "}
              from last month
            </p>
            <Progress value={65} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,849</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500 flex items-center">
                <ArrowDown className="mr-1 h-4 w-4" />
                3.1%
              </span>{" "}
              from last month
            </p>
            <Progress value={45} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">482.6 GB</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                10.1%
              </span>{" "}
              from last month
            </p>
            <Progress value={80} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the current year</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Revenue chart will be displayed here</div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-primary/10 p-1">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">New user registered</p>
                  <p className="text-sm text-muted-foreground">John Smith joined the platform</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">2m ago</div>
              </div>

              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-primary/10 p-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">New subscription</p>
                  <p className="text-sm text-muted-foreground">Acme Inc. upgraded to Enterprise plan</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">15m ago</div>
              </div>

              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-primary/10 p-1">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">Email campaign sent</p>
                  <p className="text-sm text-muted-foreground">Monthly newsletter to 2,543 subscribers</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">1h ago</div>
              </div>

              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-primary/10 p-1">
                  <BarChart className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium leading-none">Analytics report ready</p>
                  <p className="text-sm text-muted-foreground">April 2023 report is available</p>
                </div>
                <div className="ml-auto text-xs text-muted-foreground">2h ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
