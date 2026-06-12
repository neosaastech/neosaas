"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, XCircle, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"

type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL"

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  source: string
  userId?: string
}

const mockLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: "2023-11-15T10:30:00Z",
    level: "INFO",
    message: "User logged in successfully",
    source: "auth",
    userId: "user123"
  },
  {
    id: "2",
    timestamp: "2023-11-15T10:35:00Z",
    level: "WARNING",
    message: "Failed login attempt",
    source: "auth",
    userId: "user456"
  },
  {
    id: "3",
    timestamp: "2023-11-15T10:40:00Z",
    level: "ERROR",
    message: "Database connection failed",
    source: "database"
  },
  {
    id: "4",
    timestamp: "2023-11-15T10:45:00Z",
    level: "CRITICAL",
    message: "System out of memory",
    source: "system"
  },
]

export function LogsClient() {
  const { isChecking, isAdmin } = useRequireAdmin()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "ALL">("ALL")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: wire to GET /api/admin/logs
    const fetchLogs = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLogs(mockLogs)
        setFilteredLogs(mockLogs)
        setIsLoading(false)
      } catch (error) {
        toast.error("Failed to fetch logs")
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [])

  useEffect(() => {
    const filtered = logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesLevel = selectedLevel === "ALL" || log.level === selectedLevel
      return matchesSearch && matchesLevel
    })
    setFilteredLogs(filtered)
  }, [logs, searchTerm, selectedLevel])

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case "INFO":
        return <Badge variant="secondary">INFO</Badge>
      case "WARNING":
        return <Badge variant="default">WARNING</Badge>
      case "ERROR":
        return <Badge variant="destructive">ERROR</Badge>
      case "CRITICAL":
        return <Badge variant="destructive">CRITICAL</Badge>
      default:
        return <Badge variant="secondary">UNKNOWN</Badge>
    }
  }

  if (isChecking || !isAdmin) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Logs</CardTitle>
        <CardDescription>View and filter system logs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search logs</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Label htmlFor="level-filter">Log Level</Label>
            <select
              id="level-filter"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel | "ALL")}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{getLevelBadge(log.level)}</TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell>{log.userId || "N/A"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No logs found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}