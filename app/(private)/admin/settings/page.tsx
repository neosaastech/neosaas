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
import { Switch } from "@/components/ui/switch"
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
  Shield,
  Check,
  Loader2,
  Cloud,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"
import { LogsClient } from "@/app/(private)/admin/logs/logs-client"
import { PagesSettings } from "@/components/admin/pages-settings"
import { ThemeSettings } from "@/components/admin/theme-settings"

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export default function AdminSettingsPage() {
  const { isChecking, isAdmin } = useRequireAdmin()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [siteName, setSiteName] = useState("NeoSaaS")
  const [siteUrl, setSiteUrl] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [gdprContactName, setGdprContactName] = useState("")
  const [logoDisplayMode, setLogoDisplayMode] = useState<"logo" | "text" | "both">("both")
  const [logoPreview, setLogoPreview] = useState<string>("/placeholder.svg?height=100&width=100")
  const [cropperOpen, setCropperOpen] = useState(false)
  const [tempLogoSrc, setTempLogoSrc] = useState<string | null>(null)
  const [ogImagePreview, setOgImagePreview] = useState<string>("")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [gtmCode, setGtmCode] = useState("")
  const [customHeaderCode, setCustomHeaderCode] = useState("")
  const [customFooterCode, setCustomFooterCode] = useState("")
  const [customHttpHeaders, setCustomHttpHeaders] = useState("")
  const [adminFooterCopyright, setAdminFooterCopyright] = useState("")
  const [forceHttps, setForceHttps] = useState(true)
  const [gtmValidation, setGtmValidation] = useState<{
    isValid: boolean | null
    message: string
  }>({ isValid: null, message: "" })

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

  // OAuth / Social Auth settings
  const [socialAuthEnabled, setSocialAuthEnabled] = useState({
    github: false,
    google: false,
    microsoft: false,
    facebook: false,
  })

  // Save function
  const saveConfig = useCallback(async (immediate = false) => {
    console.log('[AdminSettings] saveConfig - Starting save', { immediate, siteName, maintenanceMode, forceHttps })
    setSaveStatus('saving')
    try {
      const formData = new FormData()
      formData.append('siteName', siteName)
      formData.append('siteUrl', siteUrl)
      formData.append('defaultSenderEmail', contactEmail)
      formData.append('gdprContactName', gdprContactName)
      formData.append('logoDisplayMode', logoDisplayMode)
      formData.append('maintenanceMode', maintenanceMode.toString())
      formData.append('gtmCode', gtmCode)
      formData.append('customHeaderCode', customHeaderCode)
      formData.append('customFooterCode', customFooterCode)
      formData.append('customHttpHeaders', customHttpHeaders)
      formData.append('adminFooterCopyright', adminFooterCopyright)
      formData.append('forceHttps', forceHttps.toString())
      formData.append('seoSettings', JSON.stringify(seoSettings))
      formData.append('socialLinks', JSON.stringify(socialLinks))
      formData.append('socialAuthEnabled', JSON.stringify(socialAuthEnabled))

      console.log('[AdminSettings] saveConfig - Sending request to /api/admin/config')
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('[AdminSettings] saveConfig - Failed:', data.error || 'Unknown error')
        throw new Error(data.error || 'Failed to save')
      }

      console.log('[AdminSettings] saveConfig - Success')
      setSaveStatus('saved')

      // Trigger alert refresh
      window.dispatchEvent(new CustomEvent('refreshAdminAlerts'))

      if (immediate) {
        toast.success('Configuration saved')
      }
    } catch (error) {
      console.error('[AdminSettings] saveConfig - Exception:', error)
      setSaveStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  }, [siteName, siteUrl, contactEmail, gdprContactName, logoDisplayMode, maintenanceMode, gtmCode, customHeaderCode, customFooterCode, customHttpHeaders, adminFooterCopyright, forceHttps, seoSettings, socialLinks, socialAuthEnabled])

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
      console.log('[AdminSettings] fetchConfig - Loading configuration')
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          const data = await res.json()
          console.log('[AdminSettings] fetchConfig - Config loaded successfully')
          if (data.site_name) setSiteName(data.site_name)
          if (data.site_url) setSiteUrl(data.site_url)
          if (data.default_sender_email) setContactEmail(data.default_sender_email)
          if (data.gdpr_contact_name) setGdprContactName(data.gdpr_contact_name)
          if (data.logo_display_mode) setLogoDisplayMode(data.logo_display_mode)
          if (data.logo) setLogoPreview(data.logo)
          if (data.maintenance_mode !== undefined) {
            setMaintenanceMode(data.maintenance_mode === 'true' || data.maintenance_mode === true)
          }
          if (data.gtm_code) setGtmCode(data.gtm_code)
          if (data.custom_header_code) setCustomHeaderCode(data.custom_header_code)
          if (data.custom_footer_code) setCustomFooterCode(data.custom_footer_code)
          if (data.custom_http_headers) setCustomHttpHeaders(data.custom_http_headers)
          if (data.admin_footer_copyright) setAdminFooterCopyright(data.admin_footer_copyright)
          if (data.force_https !== undefined) {
            setForceHttps(data.force_https === 'true' || data.force_https === true)
          }

          // Lago - Removed from here as it is managed in API Manager
          // if (data.lago_api_key) setLagoApiKey(data.lago_api_key)
          // if (data.lago_api_url) setLagoApiUrl(data.lago_api_url)
          // if (data.lago_mode) setLagoMode(data.lago_mode)

          if (data.seo_settings) {
            setSeoSettings(prev => ({ ...prev, ...data.seo_settings }))
            if (data.seo_settings.ogImage) {
              setOgImagePreview(data.seo_settings.ogImage)
            }
          }
          if (data.social_links) setSocialLinks(prev => ({ ...prev, ...data.social_links }))
          if (data.social_auth_enabled) setSocialAuthEnabled(prev => ({ ...prev, ...data.social_auth_enabled }))

          // Load OAuth status from service_api_configs
          console.log('[AdminSettings] fetchConfig - Fetching OAuth config...')
          try {
            const oauthRes = await fetch('/api/auth/oauth/config')
            if (oauthRes.ok) {
              const oauthData = await oauthRes.json()
              console.log('[AdminSettings] fetchConfig - OAuth data:', oauthData)
              setSocialAuthEnabled({
                github: oauthData.github || false,
                google: oauthData.google || false,
                microsoft: oauthData.microsoft || false,
                facebook: oauthData.facebook || false,
              })
            }
          } catch (oauthError) {
            console.error('[AdminSettings] fetchConfig - OAuth fetch error:', oauthError)
          }
        } else {
          console.warn('[AdminSettings] fetchConfig - Failed to load config, status:', res.status)
        }
      } catch (error) {
        console.error('[AdminSettings] fetchConfig - Exception:', error)
        toast.error('Failed to load configuration')
      } finally {
        setIsInitialLoad(false)
      }
    }
    if (isAdmin) fetchConfig()
  }, [isAdmin])

  // Trigger auto-save on changes
  useEffect(() => {
    triggerAutoSave()
  }, [siteName, siteUrl, contactEmail, gdprContactName, logoDisplayMode, gtmCode, customHeaderCode, customFooterCode, customHttpHeaders, adminFooterCopyright, forceHttps, seoSettings, socialLinks, socialAuthEnabled])

  // Handle logo change - open cropper
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('[AdminSettings] handleLogoChange - File selected:', file.name, 'Size:', file.size)
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempLogoSrc(reader.result as string)
        setCropperOpen(true)
        console.log('[AdminSettings] handleLogoChange - Opening cropper')
      }
      reader.readAsDataURL(file)
      // Reset input value so the same file can be selected again if needed
      e.target.value = ""
    }
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    console.log('[AdminSettings] handleCropComplete - Processing cropped logo, size:', croppedBlob.size)
    const file = new File([croppedBlob], "logo.png", { type: "image/png" })
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Save immediately with the new logo file
    setSaveStatus('saving')
    try {
      const formData = new FormData()
      formData.append('siteName', siteName)
      formData.append('siteUrl', siteUrl)
      formData.append('defaultSenderEmail', contactEmail)
      formData.append('gdprContactName', gdprContactName)
      formData.append('logoDisplayMode', logoDisplayMode)
      formData.append('maintenanceMode', maintenanceMode.toString())
      formData.append('gtmCode', gtmCode)
      formData.append('customHeaderCode', customHeaderCode)
      formData.append('customFooterCode', customFooterCode)
      formData.append('customHttpHeaders', customHttpHeaders)
      formData.append('adminFooterCopyright', adminFooterCopyright)
      formData.append('forceHttps', forceHttps.toString())
      formData.append('seoSettings', JSON.stringify(seoSettings))
      formData.append('socialLinks', JSON.stringify(socialLinks))
      formData.append('logo', file) // Add the logo file

      console.log('[AdminSettings] handleCropComplete - Uploading logo')
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('[AdminSettings] handleCropComplete - Upload failed:', data.error)
        throw new Error(data.error || 'Failed to save')
      }

      console.log('[AdminSettings] handleCropComplete - Logo saved successfully')
      setSaveStatus('saved')
      window.dispatchEvent(new CustomEvent('refreshAdminAlerts'))
      toast.success('Logo saved successfully')
    } catch (error) {
      console.error('[AdminSettings] handleCropComplete - Exception:', error)
      setSaveStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to save logo')
    }
  }

  // Handle logo removal
  const handleRemoveLogo = async () => {
    console.log('[AdminSettings] handleRemoveLogo - Starting logo removal')
    setSaveStatus('saving')
    try {
      const formData = new FormData()
      formData.append('siteName', siteName)
      formData.append('siteUrl', siteUrl)
      formData.append('defaultSenderEmail', contactEmail)
      formData.append('gdprContactName', gdprContactName)
      formData.append('logoDisplayMode', logoDisplayMode)
      formData.append('maintenanceMode', maintenanceMode.toString())
      formData.append('gtmCode', gtmCode)
      formData.append('customHeaderCode', customHeaderCode)
      formData.append('customFooterCode', customFooterCode)
      formData.append('customHttpHeaders', customHttpHeaders)
      formData.append('adminFooterCopyright', adminFooterCopyright)
      formData.append('forceHttps', forceHttps.toString())
      formData.append('seoSettings', JSON.stringify(seoSettings))
      formData.append('socialLinks', JSON.stringify(socialLinks))
      formData.append('removeLogo', 'true')

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        console.error('[AdminSettings] handleRemoveLogo - Failed to remove logo')
        throw new Error('Failed to remove logo')
      }

      console.log('[AdminSettings] handleRemoveLogo - Logo removed successfully')
      setLogoPreview('')
      setSaveStatus('saved')
      toast.success('Logo removed successfully')
    } catch (error) {
      console.error('[AdminSettings] handleRemoveLogo - Exception:', error)
      setSaveStatus('error')
      toast.error('Failed to remove logo')
    }
  }

  // Handle OG Image change - save immediately
  const handleOgImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('[AdminSettings] handleOgImageChange - File selected:', file.name, 'Size:', file.size)
      const reader = new FileReader()
      reader.onloadend = () => {
        setOgImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Save immediately with the new OG image file
      setSaveStatus('saving')
      try {
        const formData = new FormData()
        formData.append('siteName', siteName)
        formData.append('siteUrl', siteUrl)
        formData.append('defaultSenderEmail', contactEmail)
        formData.append('gdprContactName', gdprContactName)
        formData.append('logoDisplayMode', logoDisplayMode)
        formData.append('maintenanceMode', maintenanceMode.toString())
        formData.append('gtmCode', gtmCode)
        formData.append('customHeaderCode', customHeaderCode)
        formData.append('customFooterCode', customFooterCode)
        formData.append('customHttpHeaders', customHttpHeaders)
        formData.append('adminFooterCopyright', adminFooterCopyright)
        formData.append('forceHttps', forceHttps.toString())
        formData.append('seoSettings', JSON.stringify(seoSettings))
        formData.append('socialLinks', JSON.stringify(socialLinks))
        formData.append('ogImage', file) // Add the OG image file

        console.log('[AdminSettings] handleOgImageChange - Uploading OG image')
        const res = await fetch('/api/admin/config', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          console.error('[AdminSettings] handleOgImageChange - Upload failed:', data.error)
          throw new Error(data.error || 'Failed to save')
        }

        console.log('[AdminSettings] handleOgImageChange - OG image saved successfully')
        setSaveStatus('saved')
        window.dispatchEvent(new CustomEvent('refreshAdminAlerts'))
        toast.success('OG Image saved successfully')
      } catch (error) {
        console.error('[AdminSettings] handleOgImageChange - Exception:', error)
        setSaveStatus('error')
        toast.error(error instanceof Error ? error.message : 'Failed to save OG image')
      }
    }
  }

  // Handle OG image removal
  const handleRemoveOgImage = async () => {
    console.log('[AdminSettings] handleRemoveOgImage - Starting OG image removal')
    setSaveStatus('saving')
    try {
      const newSeoSettings = { ...seoSettings, ogImage: '' }
      setSeoSettings(newSeoSettings)
      setOgImagePreview('')

      const formData = new FormData()
      formData.append('siteName', siteName)
      formData.append('siteUrl', siteUrl)
      formData.append('defaultSenderEmail', contactEmail)
      formData.append('gdprContactName', gdprContactName)
      formData.append('logoDisplayMode', logoDisplayMode)
      formData.append('maintenanceMode', maintenanceMode.toString())
      formData.append('gtmCode', gtmCode)
      formData.append('customHeaderCode', customHeaderCode)
      formData.append('customFooterCode', customFooterCode)
      formData.append('customHttpHeaders', customHttpHeaders)
      formData.append('adminFooterCopyright', adminFooterCopyright)
      formData.append('forceHttps', forceHttps.toString())
      formData.append('seoSettings', JSON.stringify(newSeoSettings))
      formData.append('socialLinks', JSON.stringify(socialLinks))

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        console.error('[AdminSettings] handleRemoveOgImage - Failed to remove OG image')
        throw new Error('Failed to remove OG image')
      }

      console.log('[AdminSettings] handleRemoveOgImage - OG image removed successfully')
      setSaveStatus('saved')
      toast.success('OG Image removed successfully')
    } catch (error) {
      console.error('[AdminSettings] handleRemoveOgImage - Exception:', error)
      setSaveStatus('error')
      toast.error('Failed to remove OG image')
    }
  }

  // Handle maintenance toggle - save immediately
  const handleMaintenanceToggle = async () => {
    const newMode = !maintenanceMode
    console.log('[AdminSettings] handleMaintenanceToggle - Toggling maintenance mode:', { currentMode: maintenanceMode, newMode })
    setMaintenanceMode(newMode)
    setSaveStatus('saving')

    try {
      const formData = new FormData()
      formData.append('maintenanceMode', newMode.toString())

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        console.error('[AdminSettings] handleMaintenanceToggle - Failed to update maintenance mode')
        throw new Error('Failed to update maintenance mode')
      }

      console.log('[AdminSettings] handleMaintenanceToggle - Maintenance mode updated successfully')
      setSaveStatus('saved')
      toast.success(newMode ? 'Maintenance mode enabled' : 'Site is now live')
    } catch (error) {
      console.error('[AdminSettings] handleMaintenanceToggle - Exception:', error)
      setMaintenanceMode(!newMode) // Revert
      setSaveStatus('error')
      toast.error('Failed to update maintenance mode')
    }
  }

  // GTM Validation function
  const validateGTM = (code: string) => {
    if (!code || code.trim() === "") {
      setGtmValidation({ isValid: null, message: "" })
      return
    }

    // GTM format: GTM-XXXXXXX (GTM- followed by at least 7 alphanumeric characters)
    const gtmRegex = /^GTM-[A-Z0-9]{7,}$/i

    if (gtmRegex.test(code.trim())) {
      console.log('[AdminSettings] validateGTM - Valid GTM format:', code)
      setGtmValidation({
        isValid: true,
        message: "Valid GTM format"
      })
    } else {
      console.warn('[AdminSettings] validateGTM - Invalid GTM format:', code)
      setGtmValidation({
        isValid: false,
        message: "Invalid format. Expected: GTM-XXXXXXX"
      })
    }
  }

  // Handle GTM Code change
  const handleGtmCodeChange = (value: string) => {
    console.log('[AdminSettings] handleGtmCodeChange - GTM code changed:', value)
    setGtmCode(value)
    validateGTM(value)
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

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse text-brand mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Verifying access rights...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Parameters</h1>
          <p className="text-muted-foreground mt-1">Manage your site configuration, SEO, and integrations</p>
        </div>
        <SaveStatusIndicator />
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="general" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            General
          </TabsTrigger>
          <TabsTrigger value="styles" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            Styles
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            System Logs
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            Pages ACL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <PagesSettings />
        </TabsContent>

        <TabsContent value="styles">
          <ThemeSettings />
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                System Logs
              </CardTitle>
              <CardDescription>View system activities, errors, and events.</CardDescription>
            </CardHeader>
            <CardContent>
              <LogsClient />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Site Configuration */}
            <Card className="md:self-start">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-brand" />
                  Site Configuration
                </CardTitle>
                <CardDescription>Manage your platform name and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://your-domain.com"
                  />
                  <p className="text-xs text-muted-foreground">The public URL of your application</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                  <p className="text-xs text-muted-foreground">Used as default sender for system emails</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gdprContactName">GDPR Contact Name</Label>
                  <Input
                    id="gdprContactName"
                    value={gdprContactName}
                    onChange={(e) => setGdprContactName(e.target.value)}
                    placeholder="DPO Name or Company Name"
                  />
                  <p className="text-xs text-muted-foreground">Appears in legal documents and footers</p>
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
                      <div className="flex gap-2">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/svg+xml,image/png,image/jpeg"
                          onChange={handleLogoChange}
                          className="cursor-pointer flex-1"
                        />
                        {logoPreview && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        SVG, PNG recommended. Saved automatically.
                      </p>
                      
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

            {/* Right Column: Site Status + OAuth */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-brand" />
                    Site Status
                  </CardTitle>
                  <CardDescription>Control site availability and HTTPS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    className={maintenanceMode ? "" : "bg-brand hover:bg-[#B8691C]"}
                    onClick={handleMaintenanceToggle}
                    disabled={saveStatus === 'saving'}
                  >
                    {maintenanceMode ? "Go Live" : "Enable Maintenance"}
                  </Button>
                </div>

                {/* HTTPS Configuration */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-brand" />
                    HTTPS Configuration
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`h-3 w-3 rounded-full ${forceHttps ? "bg-green-500" : "bg-gray-400"} ${forceHttps ? "animate-pulse" : ""}`}
                        />
                        <p className="font-semibold">
                          {forceHttps ? "HTTPS Forced (HTTP → HTTPS)" : "HTTP & HTTPS Allowed"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {forceHttps
                          ? "All HTTP requests will be automatically redirected to HTTPS."
                          : "Both HTTP and HTTPS connections are accepted."}
                      </p>
                    </div>
                    <Button
                      variant={forceHttps ? "outline" : "default"}
                      size="sm"
                      className={!forceHttps ? "bg-brand hover:bg-[#B8691C]" : ""}
                      onClick={() => setForceHttps(!forceHttps)}
                    >
                      {forceHttps ? "Disable Force HTTPS" : "Force HTTPS"}
                    </Button>
                  </div>
                  {forceHttps && (
                    <div className="mt-2 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        <strong>✓ Recommended:</strong> Forcing HTTPS improves security by encrypting all traffic.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-brand" />
                  OAuth Social Authentication
                </CardTitle>
                <CardDescription>Enable or disable social login providers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>ℹ️ How it works:</strong> Configure OAuth credentials in{" "}
                    <a href="/admin/api" className="underline font-semibold hover:text-brand">
                      API Management
                    </a>
                    {" "}first. Then use the switches below to publish or unpublish the login buttons on your authentication pages.
                  </p>
                </div>

                {/* GitHub OAuth */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Github className="h-5 w-5" />
                      <p className="font-semibold text-sm">GitHub OAuth</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {socialAuthEnabled.github
                        ? "✅ Published - Users can sign in"
                        : "⚪ Unpublished - Login hidden"}
                    </p>
                  </div>
                  <Switch
                    checked={socialAuthEnabled.github}
                    onCheckedChange={async (checked) => {
                      const newState = { ...socialAuthEnabled, github: checked };
                      setSocialAuthEnabled(newState);

                      try {
                        const response = await fetch('/api/admin/oauth/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: 'github',
                            isActive: checked,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to toggle GitHub OAuth');
                        }

                        toast.success(checked ? 'GitHub OAuth published' : 'GitHub OAuth unpublished');
                      } catch (error) {
                        console.error('Toggle GitHub OAuth error:', error);
                        setSocialAuthEnabled(socialAuthEnabled);
                        toast.error(error instanceof Error ? error.message : 'Failed to toggle GitHub OAuth');
                      }
                    }}
                  />
                </div>

                {/* Google OAuth */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 24 24"
                        width="20"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <p className="font-semibold text-sm">Google OAuth</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {socialAuthEnabled.google
                        ? "✅ Published - Users can sign in"
                        : "⚪ Unpublished - Login hidden"}
                    </p>
                  </div>
                  <Switch
                    checked={socialAuthEnabled.google}
                    onCheckedChange={async (checked) => {
                      const newState = { ...socialAuthEnabled, google: checked };
                      setSocialAuthEnabled(newState);

                      try {
                        const response = await fetch('/api/admin/oauth/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: 'google',
                            isActive: checked,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to toggle Google OAuth');
                        }

                        toast.success(checked ? 'Google OAuth published' : 'Google OAuth unpublished');
                      } catch (error) {
                        console.error('Toggle Google OAuth error:', error);
                        setSocialAuthEnabled(socialAuthEnabled);
                        toast.error(error instanceof Error ? error.message : 'Failed to toggle Google OAuth');
                      }
                    }}
                  />
                </div>

                {/* Microsoft OAuth */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 23 23"
                        width="20"
                      >
                        <path fill="#f35325" d="M0 0h11v11H0z"/>
                        <path fill="#81bc06" d="M12 0h11v11H12z"/>
                        <path fill="#05a6f0" d="M0 12h11v11H0z"/>
                        <path fill="#ffba08" d="M12 12h11v11H12z"/>
                      </svg>
                      <p className="font-semibold text-sm">Microsoft OAuth</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {socialAuthEnabled.microsoft
                        ? "✅ Published - Users can sign in"
                        : "⚪ Unpublished - Login hidden"}
                    </p>
                  </div>
                  <Switch
                    checked={socialAuthEnabled.microsoft}
                    onCheckedChange={async (checked) => {
                      const newState = { ...socialAuthEnabled, microsoft: checked };
                      setSocialAuthEnabled(newState);

                      try {
                        const response = await fetch('/api/admin/oauth/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: 'microsoft',
                            isActive: checked,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to toggle Microsoft OAuth');
                        }

                        toast.success(checked ? 'Microsoft OAuth published' : 'Microsoft OAuth unpublished');
                      } catch (error) {
                        console.error('Toggle Microsoft OAuth error:', error);
                        setSocialAuthEnabled(socialAuthEnabled);
                        toast.error(error instanceof Error ? error.message : 'Failed to toggle Microsoft OAuth');
                      }
                    }}
                  />
                </div>

                {/* Facebook OAuth */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="20"
                        viewBox="0 0 24 24"
                        width="20"
                        fill="#1877F2"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <p className="font-semibold text-sm">Facebook OAuth</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {socialAuthEnabled.facebook
                        ? "✅ Published - Users can sign in"
                        : "⚪ Unpublished - Login hidden"}
                    </p>
                  </div>
                  <Switch
                    checked={socialAuthEnabled.facebook}
                    onCheckedChange={async (checked) => {
                      const newState = { ...socialAuthEnabled, facebook: checked };
                      setSocialAuthEnabled(newState);

                      try {
                        const response = await fetch('/api/admin/oauth/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: 'facebook',
                            isActive: checked,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Failed to toggle Facebook OAuth');
                        }

                        toast.success(checked ? 'Facebook OAuth published' : 'Facebook OAuth unpublished');
                      } catch (error) {
                        console.error('Toggle Facebook OAuth error:', error);
                        setSocialAuthEnabled(socialAuthEnabled);
                        toast.error(error instanceof Error ? error.message : 'Failed to toggle Facebook OAuth');
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-brand" />
                  SEO Metadata
                </CardTitle>
                <CardDescription>
                  Configure site title, description and meta tags
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-brand" />
                  Custom Code Injection
                </CardTitle>
                <CardDescription>
                  Add custom HTML, JavaScript and HTTP headers to all pages (auto-saved)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gtmCode">Google Tag Manager ID</Label>
                  <div className="relative">
                    <Input
                      id="gtmCode"
                      placeholder="GTM-XXXXXXX"
                      className={`font-mono pr-10 ${
                        gtmValidation.isValid === true 
                          ? 'border-green-500 focus-visible:ring-green-500' 
                          : gtmValidation.isValid === false 
                          ? 'border-red-500 focus-visible:ring-red-500' 
                          : ''
                      }`}
                      value={gtmCode}
                      onChange={(e) => handleGtmCodeChange(e.target.value)}
                      onBlur={(e) => validateGTM(e.target.value)}
                    />
                    {gtmValidation.isValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {gtmValidation.isValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {gtmValidation.message && (
                    <div className={`flex items-center gap-2 text-xs ${
                      gtmValidation.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {gtmValidation.isValid ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      <span>{gtmValidation.message}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Auto-saved. GTM script will be automatically injected.
                  </p>
                </div>

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

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-brand" />
                    Custom HTTP Headers
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customHttpHeaders">HTTP Headers (JSON format)</Label>
                    <Textarea
                      id="customHttpHeaders"
                      value={customHttpHeaders}
                      onChange={(e) => setCustomHttpHeaders(e.target.value)}
                      placeholder={`{\n  "X-Frame-Options": "DENY",\n  "X-Content-Type-Options": "nosniff",\n  "Referrer-Policy": "strict-origin-when-cross-origin",\n  "Permissions-Policy": "geolocation=(), microphone=()"\n}`}
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Headers will be applied to all responses. Use valid JSON format.
                    </p>
                  </div>

                  <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Common Security Headers:</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li><code className="bg-muted px-1 rounded">X-Frame-Options</code>: Prevents clickjacking</li>
                      <li><code className="bg-muted px-1 rounded">X-Content-Type-Options</code>: Prevents MIME sniffing</li>
                      <li><code className="bg-muted px-1 rounded">Strict-Transport-Security</code>: Enforces HTTPS</li>
                      <li><code className="bg-muted px-1 rounded">Content-Security-Policy</code>: Controls resource loading</li>
                      <li><code className="bg-muted px-1 rounded">Referrer-Policy</code>: Controls referrer information</li>
                      <li><code className="bg-muted px-1 rounded">Permissions-Policy</code>: Controls browser features</li>
                    </ul>
                  </div>

                  <div className="mt-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-xs text-muted-foreground">
                      <strong>Warning:</strong> Incorrect headers can break your site. Test changes carefully.
                    </p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                  <p className="text-xs text-muted-foreground">
                    <strong>Security:</strong> Only add code from trusted sources.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-brand" />
                  Social Sharing & Links
                </CardTitle>
                <CardDescription>
                  Configure Open Graph metadata and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Social Sharing (Open Graph) */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-brand" />
                    Open Graph Metadata
                  </h3>
                  
                  <div className="space-y-4">
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
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="ogImage"
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleOgImageChange}
                              className="cursor-pointer flex-1"
                            />
                            {ogImagePreview && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={handleRemoveOgImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recommended size: 1200x630px. Max 2MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-brand" />
                    Social Media Links
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">Connect your social profiles (used in public footer)</p>
                  
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
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
