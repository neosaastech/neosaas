"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageCropper } from "@/components/ui/image-cropper"
import { toast } from "sonner"
import {
  Upload,
  Settings,
  Globe,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  Github,
  Instagram,
  Wrench,
  Loader2,
  Cloud,
} from "lucide-react"
import { PaymentSettings } from "@/components/admin/payment-settings"

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export function DashboardParameters() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [siteName, setSiteName] = useState("NeoSaaS")
  const [logoDisplayMode, setLogoDisplayMode] = useState<"logo" | "text" | "both">("both")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("/placeholder.svg?height=100&width=100")
  const [cropperOpen, setCropperOpen] = useState(false)
  const [tempLogoSrc, setTempLogoSrc] = useState<string | null>(null)
  const [ogImageFile, setOgImageFile] = useState<File | null>(null)
  const [ogImagePreview, setOgImagePreview] = useState<string>("")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [gtmCode, setGtmCode] = useState("")
  const [customHeaderCode, setCustomHeaderCode] = useState("")
  const [customFooterCode, setCustomFooterCode] = useState("")
  const [adminFooterCopyright, setAdminFooterCopyright] = useState("")

  const [seoSettings, setSeoSettings] = useState({
    titleTemplate: "%s | NeoSaaS",
    baseUrl: "https://neosaas.com",
    description: "",
    ogTitle: "NeoSaaS - Modern Admin Dashboard",
    ogDescription: "The ultimate solution for your SaaS application.",
    ogImage: "",
  })

  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    facebook: "",
    linkedin: "",
    instagram: "",
    github: "",
  })

  // Save function
  const saveConfig = useCallback(async (immediate = false) => {
    setSaveStatus('saving')
    try {
      const formData = new FormData()
      formData.append('siteName', siteName)
      formData.append('logoDisplayMode', logoDisplayMode)
      formData.append('maintenanceMode', maintenanceMode.toString())
      formData.append('gtmCode', gtmCode)
      formData.append('customHeaderCode', customHeaderCode)
      formData.append('customFooterCode', customFooterCode)
      formData.append('adminFooterCopyright', adminFooterCopyright)
      formData.append('seoSettings', JSON.stringify(seoSettings))
      formData.append('socialLinks', JSON.stringify(socialLinks))

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (ogImageFile) {
        formData.append('ogImage', ogImageFile)
      }

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaveStatus('saved')
      if (immediate) {
        toast.success('Configuration saved')
      }
    } catch (error) {
      console.error('[ADMIN] Save error:', error)
      setSaveStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  }, [siteName, logoDisplayMode, maintenanceMode, gtmCode, customHeaderCode, customFooterCode, seoSettings, socialLinks, logoFile])

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (isInitialLoad) return

    setSaveStatus('unsaved')

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      saveConfig()
    }, 1500) // 1.5 second debounce
  }, [saveConfig, isInitialLoad])

  // Load config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          const data = await res.json()
          if (data.site_name) setSiteName(data.site_name)
          if (data.logo_display_mode) setLogoDisplayMode(data.logo_display_mode)
          if (data.logo) setLogoPreview(data.logo)
          if (data.maintenance_mode !== undefined) {
            setMaintenanceMode(data.maintenance_mode === 'true' || data.maintenance_mode === true)
          }
          if (data.gtm_code) setGtmCode(data.gtm_code)
          if (data.custom_header_code) setCustomHeaderCode(data.custom_header_code)
          if (data.custom_footer_code) setCustomFooterCode(data.custom_footer_code)
          if (data.admin_footer_copyright) setAdminFooterCopyright(data.admin_footer_copyright)
          if (data.seo_settings) {
            setSeoSettings(prev => ({ ...prev, ...data.seo_settings }))
            if (data.seo_settings.ogImage) {
              setOgImagePreview(data.seo_settings.ogImage)
            }
          }
          if (data.social_links) setSocialLinks(prev => ({ ...prev, ...data.social_links }))
        }
      } catch (error) {
        console.error('[ADMIN] Failed to fetch config', error)
        toast.error('Failed to load configuration')
      } finally {
        setIsInitialLoad(false)
      }
    }
    fetchConfig()
  }, [])

  // Trigger auto-save on changes
  useEffect(() => {
    triggerAutoSave()
  }, [siteName, logoDisplayMode, gtmCode, customHeaderCode, customFooterCode, adminFooterCopyright, seoSettings, socialLinks])

  // Handle logo change - open cropper
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempLogoSrc(reader.result as string)
        setCropperOpen(true)
      }
      reader.readAsDataURL(file)
      // Reset input value so the same file can be selected again if needed
      e.target.value = ""
    }
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], "logo.png", { type: "image/png" })
    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setTimeout(() => saveConfig(true), 100)
  }

  // Handle OG Image change - save immediately
  const handleOgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOgImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setOgImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      // Save immediately after selection
      setTimeout(() => saveConfig(true), 100)
    }
  }

  // Handle maintenance toggle - save immediately
  const handleMaintenanceToggle = async () => {
    const newMode = !maintenanceMode
    setMaintenanceMode(newMode)
    setSaveStatus('saving')

    try {
      const formData = new FormData()
      formData.append('maintenanceMode', newMode.toString())

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Failed to update maintenance mode')

      setSaveStatus('saved')
      toast.success(newMode ? 'Maintenance mode enabled' : 'Site is now live')
    } catch (error) {
      setMaintenanceMode(!newMode) // Revert
      setSaveStatus('error')
      toast.error('Failed to update maintenance mode')
    }
  }

  // Save status indicator component
  const SaveStatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {saveStatus === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <Cloud className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {saveStatus === 'unsaved' && (
        <>
          <Cloud className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600">Unsaved changes</span>
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <Cloud className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Save failed</span>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parameters</h2>
          <p className="text-muted-foreground">Manage your site configuration, SEO, and integrations</p>
        </div>
        <SaveStatusIndicator />
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO & Social</TabsTrigger>
          <TabsTrigger value="lago">Lago Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="lago">
          <PaymentSettings />
        </TabsContent>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-brand" />
                  Site Configuration
                </CardTitle>
                <CardDescription>Manage your platform name and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Enter site name"
                  />
                  <p className="text-xs text-muted-foreground">Displayed on the platform and in communications</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Main Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white">
                      {logoPreview ? (
                        <img
                          src={logoPreview || "/placeholder.svg"}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/svg+xml,image/png,image/jpeg"
                          onChange={handleLogoChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          SVG, PNG recommended. Saved automatically.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="logoDisplayMode">Display Mode</Label>
                        <Select 
                          value={logoDisplayMode} 
                          onValueChange={(value: "logo" | "text" | "both") => setLogoDisplayMode(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select display mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="logo">Logo Only</SelectItem>
                            <SelectItem value="text">Text Only</SelectItem>
                            <SelectItem value="both">Both (Logo + Text)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <ImageCropper
                    open={cropperOpen}
                    onOpenChange={setCropperOpen}
                    imageSrc={tempLogoSrc}
                    onCropComplete={handleCropComplete}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminFooterCopyright">Admin Footer Copyright</Label>
                  <Input
                    id="adminFooterCopyright"
                    value={adminFooterCopyright}
                    onChange={(e) => setAdminFooterCopyright(e.target.value)}
                    placeholder="e.g. © 2025 NeoSaaS. All rights reserved."
                  />
                  <p className="text-xs text-muted-foreground">Displayed at the bottom of the admin dashboard</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-brand" />
                  Site Status
                </CardTitle>
                <CardDescription>Control site availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`h-3 w-3 rounded-full ${maintenanceMode ? "bg-orange-500" : "bg-green-500"} animate-pulse`}
                      />
                      <p className="font-semibold text-lg">
                        {maintenanceMode ? "Maintenance Mode Active" : "Site is Live"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {maintenanceMode
                        ? "Visitors will see the maintenance page."
                        : "Your site is accessible to all visitors."}
                    </p>
                  </div>
                  <Button
                    variant={maintenanceMode ? "destructive" : "default"}
                    size="sm"
                    className={maintenanceMode ? "" : "bg-brand hover:bg-brand-hover"}
                    onClick={handleMaintenanceToggle}
                    disabled={saveStatus === 'saving'}
                  >
                    {maintenanceMode ? "Go Live" : "Enable Maintenance"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gtmCode">Google Tag Manager ID</Label>
                  <Input
                    id="gtmCode"
                    placeholder="GTM-XXXXXXX"
                    className="font-mono"
                    value={gtmCode}
                    onChange={(e) => setGtmCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-saved. GTM script will be automatically injected.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-brand" />
                  Custom Code Injection
                </CardTitle>
                <CardDescription>
                  Add custom HTML or JavaScript to all pages (auto-saved)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customHeaderCode">Header Code (in {"<head>"})</Label>
                  <Textarea
                    id="customHeaderCode"
                    value={customHeaderCode}
                    onChange={(e) => setCustomHeaderCode(e.target.value)}
                    placeholder={`<!-- Example: Google Analytics -->\n<script async src="..."></script>`}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customFooterCode">Footer Code (before {"</body>"})</Label>
                  <Textarea
                    id="customFooterCode"
                    value={customFooterCode}
                    onChange={(e) => setCustomFooterCode(e.target.value)}
                    placeholder={`<!-- Example: Chat widget -->\n<script>...</script>`}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <p className="text-xs text-muted-foreground">
                    <strong>Security:</strong> Only add code from trusted sources.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-brand" />
                  SEO & Metadata
                </CardTitle>
                <CardDescription>Configure search engine optimization (auto-saved)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Site Title Template</Label>
                    <Input
                      value={seoSettings.titleTemplate}
                      onChange={(e) => setSeoSettings({...seoSettings, titleTemplate: e.target.value})}
                      placeholder="%s | NeoSaaS"
                    />
                    <p className="text-xs text-muted-foreground">Use %s for the page title</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input
                      value={seoSettings.baseUrl}
                      onChange={(e) => setSeoSettings({...seoSettings, baseUrl: e.target.value})}
                      placeholder="https://neosaas.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Meta Description</Label>
                  <Textarea
                    value={seoSettings.description}
                    onChange={(e) => setSeoSettings({...seoSettings, description: e.target.value})}
                    placeholder="Enter a brief description of your site..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-brand" />
                  Social Sharing (Open Graph)
                </CardTitle>
                <CardDescription>Customize how your site appears when shared</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>OG Title</Label>
                    <Input
                      value={seoSettings.ogTitle}
                      onChange={(e) => setSeoSettings({...seoSettings, ogTitle: e.target.value})}
                      placeholder="NeoSaaS - Modern Admin Dashboard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>OG Description</Label>
                    <Textarea
                      value={seoSettings.ogDescription}
                      onChange={(e) => setSeoSettings({...seoSettings, ogDescription: e.target.value})}
                      rows={2}
                      placeholder="The ultimate solution for your SaaS application."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ogImage">OG Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-64 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-white relative">
                      {ogImagePreview ? (
                        <img
                          src={ogImagePreview}
                          alt="OG Image preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <Upload className="h-8 w-8 mb-2" />
                          <span className="text-xs">1200x630 recommended</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="ogImage"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleOgImageChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended size: 1200x630px. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-brand" />
                  Social Media Links
                </CardTitle>
                <CardDescription>Connect your social profiles (used in public footer)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" /> Twitter / X
                    </Label>
                    <Input
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                      placeholder="https://x.com/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" /> Facebook
                    </Label>
                    <Input
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})}
                      placeholder="https://facebook.com/page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </Label>
                    <Input
                      value={socialLinks.linkedin}
                      onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Instagram
                    </Label>
                    <Input
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Github className="h-4 w-4" /> GitHub
                    </Label>
                    <Input
                      value={socialLinks.github}
                      onChange={(e) => setSocialLinks({...socialLinks, github: e.target.value})}
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
