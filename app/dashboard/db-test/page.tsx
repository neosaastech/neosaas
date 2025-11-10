"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Database } from "lucide-react"

export default function DatabaseTestPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)
  const [searchEmail, setSearchEmail] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name: name || undefined,
          password: password || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: "User created successfully!",
          data,
        })
        setEmail("")
        setName("")
        setPassword("")
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to create user",
          data,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearchLoading(true)
    setSearchResult(null)

    try {
      const response = await fetch(`/api/users?email=${encodeURIComponent(searchEmail)}`)
      const data = await response.json()

      if (response.ok) {
        setSearchResult({
          success: true,
          message: "User found!",
          data,
        })
      } else {
        setSearchResult({
          success: false,
          message: data.error || "User not found",
          data,
        })
      }
    } catch (error) {
      setSearchResult({
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      })
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Database className="h-8 w-8 text-[#CD7F32]" />
        <h1 className="text-3xl font-bold">Database Connection Test</h1>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Test creating a new user in the database</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </form>

            {result && (
              <Alert className="mt-4" variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  <p>{result.message}</p>
                  {result.data && (
                    <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Search User Form */}
        <Card>
          <CardHeader>
            <CardTitle>Search User</CardTitle>
            <CardDescription>Test retrieving a user from the database</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="searchEmail">Email</Label>
                <Input
                  id="searchEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={searchLoading} className="w-full">
                {searchLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search User"
                )}
              </Button>
            </form>

            {searchResult && (
              <Alert className="mt-4" variant={searchResult.success ? "default" : "destructive"}>
                {searchResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertTitle>{searchResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  <p>{searchResult.message}</p>
                  {searchResult.data && (
                    <pre className="mt-2 text-xs overflow-auto p-2 bg-muted rounded">
                      {JSON.stringify(searchResult.data, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Console</CardTitle>
          <CardDescription>Check your browser console and server logs for detailed debug information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Browser Console: Press F12 or Right-click → Inspect → Console</p>
            <p>• Server Logs: Check your terminal/Vercel deployment logs</p>
            <p>• Look for logs starting with [v0] for debug information</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
