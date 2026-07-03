import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Mail, Plus, RefreshCw, Send, Settings, XCircle } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const campaigns = [
  {
    id: "1",
    name: "Welcome Series",
    status: "Active",
    sent: 2450,
    opened: 1720,
    clicked: 920,
    date: "2023-05-01",
  },
  {
    id: "2",
    name: "Monthly Newsletter",
    status: "Active",
    sent: 5200,
    opened: 3380,
    clicked: 1560,
    date: "2023-04-15",
  },
  {
    id: "3",
    name: "Product Update",
    status: "Scheduled",
    sent: 0,
    opened: 0,
    clicked: 0,
    date: "2023-05-10",
  },
  {
    id: "4",
    name: "Customer Feedback",
    status: "Draft",
    sent: 0,
    opened: 0,
    clicked: 0,
    date: "2023-05-05",
  },
  {
    id: "5",
    name: "Black Friday Special",
    status: "Completed",
    sent: 7800,
    opened: 5460,
    clicked: 3120,
    date: "2022-11-24",
  },
]

export default function EmailPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email</h1>
          <p className="text-muted-foreground">Manage your email campaigns and track performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh</span>
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,450</div>
            <Progress value={75} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.2%</div>
            <Progress value={68} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.7%</div>
            <Progress value={25} className="mt-3 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.3%</div>
            <Progress value={1.3} className="mt-3 h-1" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Latest email campaigns and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{campaign.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        {campaign.status === "Active" && (
                          <Badge className="mr-1 bg-emerald-500 hover:bg-emerald-600 text-xs">Active</Badge>
                        )}
                        {campaign.status === "Scheduled" && (
                          <Badge className="mr-1 bg-amber-500 hover:bg-amber-600 text-xs">Scheduled</Badge>
                        )}
                        {campaign.status === "Draft" && <Badge className="mr-1" variant="outline">Draft</Badge>}
                        {campaign.status === "Completed" && (
                          <Badge className="mr-1 bg-primary text-xs">Completed</Badge>
                        )}
                        <span>{campaign.date}</span>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <div className="font-medium">{campaign.sent > 0 ? campaign.sent : "-"}</div>
                      <div className="text-xs text-muted-foreground">Emails sent</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Email Campaigns</CardTitle>
                  <CardDescription>View and manage all your email campaigns</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        {campaign.status === "Active" && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        )}
                        {campaign.status === "Scheduled" && (
                          <Badge className="bg-amber-500 hover:bg-amber-600">Scheduled</Badge>
                        )}
                        {campaign.status === "Draft" && <Badge variant="outline">Draft</Badge>}
                        {campaign.status === "Completed" && <Badge>Completed</Badge>}
                      </TableCell>
                      <TableCell>{campaign.sent > 0 ? campaign.sent.toLocaleString() : "-"}</TableCell>
                      <TableCell>
                        {campaign.sent > 0 ? `${((campaign.opened / campaign.sent) * 100).toFixed(1)}%` : "-"}
                      </TableCell>
                      <TableCell>{campaign.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>Compose New Email</CardTitle>
              <CardDescription>Create and send a new email campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="campaign-name" className="text-sm font-medium">
                  Campaign Name
                </label>
                <Input id="campaign-name" placeholder="Enter campaign name" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="from-name" className="text-sm font-medium">
                    From Name
                  </label>
                  <Input id="from-name" placeholder="Your name or company" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="from-email" className="text-sm font-medium">
                    From Email
                  </label>
                  <Input id="from-email" placeholder="email@example.com" type="email" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject Line
                </label>
                <Input id="subject" placeholder="Email subject line" />
              </div>

              <div className="space-y-2">
                <label htmlFor="recipient-list" className="text-sm font-medium">
                  Recipient List
                </label>
                <Select>
                  <SelectTrigger id="recipient-list">
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="newsletter">Newsletter Subscribers</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="email-content" className="text-sm font-medium">
                  Email Content
                </label>
                <Textarea id="email-content" placeholder="Compose your email..." className="min-h-[200px]" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  Send Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
