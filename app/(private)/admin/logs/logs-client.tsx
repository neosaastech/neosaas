"use client"

import { useState, useEffect } from "react"
import { getSystemLogs, deleteSystemLogs, type LogFilter } from "@/app/actions/logs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { Loader2, Trash2, Search, CalendarIcon, FilterX, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function LogsClient() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [filters, setFilters] = useState<LogFilter>({
    category: "all",
    level: "all",
    search: "",
    startDate: undefined,
    endDate: undefined,
  })
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    const result = await getSystemLogs(filters)
    if (result.success && result.data) {
      setLogs(result.data)
    } else {
      toast({
        title: "Error",
        description: "Failed to fetch logs",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs()
    }, 500)
    return () => clearTimeout(timer)
  }, [filters])

  const handleDeleteFilteredLogs = async () => {
    const result = await deleteSystemLogs(filters)
    if (result.success) {
      toast({
        title: "Success",
        description: "Logs deleted successfully based on current filters",
      })
      fetchLogs()
    } else {
      toast({
        title: "Error",
        description: "Failed to delete logs",
        variant: "destructive",
      })
    }
  }

  const clearFilters = () => {
    setFilters({
      category: "all",
      level: "all",
      search: "",
      startDate: undefined,
      endDate: undefined,
    })
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "info": return "default"
      case "warning": return "secondary"
      case "error": return "destructive"
      case "critical": return "destructive"
      default: return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2 w-full sm:w-auto flex-wrap items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-8"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            
            <Select
              value={filters.category}
              onValueChange={(val) => setFilters({ ...filters, category: val })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.level}
              onValueChange={(value) => setFilters({ ...filters, level: value })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => setFilters({ ...filters, startDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => setFilters({ ...filters, endDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                <FilterX className="h-4 w-4" />
            </Button>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Filtered
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all logs matching the current filters. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteFilteredLogs}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>
            View and manage system events and activities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelBadge(log.level) as any}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.category}</TableCell>
                      <TableCell className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user ? log.user.email : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.resourceId ? (
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            {log.resourceId.substring(0, 8)}...
                          </code>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.metadata?.ipAddress || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                No logs found
              </div>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header avec Level et Category */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelBadge(log.level) as any}>
                          {log.level}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {log.category}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </div>

                    {/* Message */}
                    <div className="text-sm line-clamp-2" title={log.message}>
                      {log.message}
                    </div>

                    {/* User & IP */}
                    {(log.user || log.metadata?.ipAddress) && (
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground pt-2 border-t">
                        {log.user && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">User:</span>
                            <span>{log.user.email}</span>
                          </div>
                        )}
                        {log.metadata?.ipAddress && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">IP:</span>
                            <span>{log.metadata.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.createdAt), "PPP pp")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="h-full max-h-[60vh] pr-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">ID:</span>
                  <span className="col-span-3 font-mono text-xs text-muted-foreground">{selectedLog.id}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Level:</span>
                  <Badge variant={getLevelBadge(selectedLog.level) as any} className="w-fit">
                    {selectedLog.level}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Category:</span>
                  <span className="col-span-3 capitalize">{selectedLog.category}</span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <span className="font-bold">Timestamp:</span>
                  <span className="col-span-3 font-mono text-sm">
                    {format(new Date(selectedLog.createdAt), "PPP pp")}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="font-bold mt-1">Message:</span>
                  <span className="col-span-3 font-mono text-sm bg-muted p-2 rounded-md whitespace-pre-wrap">
                    {selectedLog.message}
                  </span>
                </div>
                {selectedLog.user && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="font-bold">User Email:</span>
                      <span className="col-span-3">{selectedLog.user.email}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="font-bold">User ID:</span>
                      <span className="col-span-3 font-mono text-xs">{selectedLog.user.id}</span>
                    </div>
                    {selectedLog.user.firstName && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">User Name:</span>
                        <span className="col-span-3">
                          {selectedLog.user.firstName} {selectedLog.user.lastName}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {selectedLog.resourceId && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">Resource ID:</span>
                    <span className="col-span-3 font-mono text-sm bg-muted p-2 rounded break-all">{selectedLog.resourceId}</span>
                  </div>
                )}
                {selectedLog.metadata?.ipAddress && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">IP Address:</span>
                    <span className="col-span-3 font-mono text-sm">{selectedLog.metadata.ipAddress}</span>
                  </div>
                )}
                {selectedLog.metadata?.userAgent && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <span className="font-bold mt-1">User Agent:</span>
                    <span className="col-span-3 text-xs text-muted-foreground break-all">
                      {selectedLog.metadata.userAgent}
                    </span>
                  </div>
                )}
                {selectedLog.metadata?.requestUrl && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">Request URL:</span>
                    <span className="col-span-3 font-mono text-xs break-all">
                      {selectedLog.metadata.requestUrl}
                    </span>
                  </div>
                )}
                {selectedLog.metadata?.requestMethod && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">HTTP Method:</span>
                    <Badge variant="outline" className="w-fit">
                      {selectedLog.metadata.requestMethod}
                    </Badge>
                  </div>
                )}
                {selectedLog.metadata?.statusCode && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">Status Code:</span>
                    <Badge 
                      variant={selectedLog.metadata.statusCode >= 400 ? "destructive" : "default"}
                      className="w-fit"
                    >
                      {selectedLog.metadata.statusCode}
                    </Badge>
                  </div>
                )}
                {selectedLog.metadata?.duration && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-bold">Duration:</span>
                    <span className="col-span-3">{selectedLog.metadata.duration}ms</span>
                  </div>
                )}
                {selectedLog.metadata?.errorStack && (
                  <div className="grid gap-2">
                    <span className="font-bold text-destructive">Error Stack Trace:</span>
                    <pre className="bg-destructive/10 border border-destructive/20 p-4 rounded-md overflow-auto text-xs font-mono text-destructive">
                      {selectedLog.metadata.errorStack}
                    </pre>
                  </div>
                )}
                {selectedLog.metadata && (
                  <div className="grid gap-2">
                    <span className="font-bold">Complete Metadata:</span>
                    <pre className="bg-muted p-4 rounded-md overflow-auto text-xs font-mono max-h-96">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
