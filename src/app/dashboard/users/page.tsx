import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BadgeCheck, Download, Filter, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

const users = [
  {
    id: "USR001",
    name: "Emily Johnson",
    email: "emily@example.com",
    role: "Admin",
    status: "Active",
    lastActive: "Today at 2:34 PM",
  },
  {
    id: "USR002",
    name: "Michael Brown",
    email: "michael@example.com",
    role: "User",
    status: "Active",
    lastActive: "Yesterday at 9:12 AM",
  },
  {
    id: "USR003",
    name: "Sarah Wilson",
    email: "sarah@example.com",
    role: "User",
    status: "Inactive",
    lastActive: "Apr 23, 2023",
  },
  {
    id: "USR004",
    name: "James Miller",
    email: "james@example.com",
    role: "Editor",
    status: "Active",
    lastActive: "Today at 11:05 AM",
  },
  {
    id: "USR005",
    name: "Jessica Davis",
    email: "jessica@example.com",
    role: "User",
    status: "Active",
    lastActive: "Today at 8:49 AM",
  },
  {
    id: "USR006",
    name: "David Garcia",
    email: "david@example.com",
    role: "Editor",
    status: "Suspended",
    lastActive: "Mar 12, 2023",
  },
  {
    id: "USR007",
    name: "Ashley Martinez",
    email: "ashley@example.com",
    role: "User",
    status: "Active",
    lastActive: "Yesterday at 3:18 PM",
  },
]

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search users..." className="pl-8" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Columns
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === "Admin" ? (
                      <div className="flex items-center gap-1">
                        {user.role}
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      user.role
                    )}
                  </TableCell>
                  <TableCell>
                    {user.status === "Active" && <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>}
                    {user.status === "Inactive" && <Badge variant="outline">Inactive</Badge>}
                    {user.status === "Suspended" && <Badge variant="destructive">Suspended</Badge>}
                  </TableCell>
                  <TableCell>{user.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit user</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Suspend user</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete user</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
