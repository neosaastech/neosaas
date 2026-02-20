import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, CreditCard, ArrowUpRight } from 'lucide-react'
import { Progress } from "@/components/ui/progress"

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage transactions and payment providers.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$138,596</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              18.2% from last month
            </p>
            <Progress value={75} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,482</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              12.5% from last month
            </p>
            <Progress value={65} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,249</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              7.2% from last month
            </p>
            <Progress value={55} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
              0.5% from last month
            </p>
            <Progress value={32} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
