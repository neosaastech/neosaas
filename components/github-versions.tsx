"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Tag } from "lucide-react"

interface Release {
  id: number
  tag_name: string
  name: string
  published_at: string
  html_url: string
  zipball_url: string
  body: string
}

export default function GitHubVersions() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/neosaastech/neosaas/releases")
        if (!response.ok) {
          throw new Error("Failed to fetch releases")
        }
        const data = await response.json()
        setReleases(data.slice(0, 5)) // Show latest 5 releases
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Versions</CardTitle>
          <CardDescription>Loading releases from GitHub...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Versions</CardTitle>
          <CardDescription className="text-destructive">
            Unable to load releases. Please visit GitHub directly.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Available Versions</h2>
      <div className="grid gap-4">
        {releases.map((release, index) => (
          <Card key={release.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{release.name || release.tag_name}</CardTitle>
                    {index === 0 && <Badge className="bg-[#CD7F32] hover:bg-[#CD7F32]/90">Latest</Badge>}
                  </div>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {release.tag_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(release.published_at).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </CardDescription>
                </div>
                <Button size="sm" className="gap-2 bg-[#CD7F32] hover:bg-[#CD7F32]/90" asChild>
                  <a href={release.zipball_url} download>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </CardHeader>
            {release.body && (
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{release.body}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
