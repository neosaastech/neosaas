"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Globe, Loader2, Save } from "lucide-react"

export function SiteSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [config, setConfig] = useState({
    siteName: "",
    siteUrl: "",
    contactEmail: "",
    gdprContactName: ""
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          const data = await res.json()
          setConfig({
            siteName: data.site_name || "",
            siteUrl: data.site_url || "",
            contactEmail: data.default_sender_email || "",
            gdprContactName: data.gdpr_contact_name || ""
          })
        }
      } catch (error) {
        console.error("Failed to fetch site config", error)
        toast.error("Failed to load site settings")
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData()
      formData.append('siteName', config.siteName)
      formData.append('siteUrl', config.siteUrl)
      formData.append('defaultSenderEmail', config.contactEmail)
      formData.append('gdprContactName', config.gdprContactName)
      
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error("Failed to save")
      
      toast.success("Site settings saved")
    } catch (error) {
      toast.error("Failed to save site settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand" />
            General Information
          </CardTitle>
          <CardDescription>
            Configure the main identity and contact details of your platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={config.siteName}
                  onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                  placeholder="My SaaS Platform"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={config.siteUrl}
                  onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={config.contactEmail}
                  onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gdprContact">GDPR Contact / Responsible Person</Label>
                <Input
                  id="gdprContact"
                  value={config.gdprContactName}
                  onChange={(e) => setConfig({ ...config, gdprContactName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving} className="bg-brand hover:bg-brand-hover text-white">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
