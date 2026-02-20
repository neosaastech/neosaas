'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateCookieSettings, updateHostingSettings } from "@/app/actions/platform-config"
import { deleteCookieConsent, deleteCookieConsents } from "@/app/actions/cookie-consent"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Loader2, Settings, ExternalLink, Download, Shield, Save, Server, Trash2, Search, X } from "lucide-react"
import { PlatformConfig } from "@/lib/config"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

import { CookieConsentPreview } from "./cookie-consent-preview"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CookieConsent {
  id: string
  ipAddress: string
  userAgent: string | null
  consentStatus: string
  consentedAt: string | Date
  updatedAt: string | Date
}

export function LegalManagement({ 
  initialConfig,
  initialConsents 
}: { 
  initialConfig: PlatformConfig,
  initialConsents: CookieConsent[]
}) {
  const router = useRouter()
  const [consents, setConsents] = useState<CookieConsent[]>(initialConsents)
  const [selectedConsents, setSelectedConsents] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  const [showCookieLogo, setShowCookieLogo] = useState<boolean>(initialConfig.showCookieLogo || false)
  const [cookieEnabled, setCookieEnabled] = useState<boolean>(initialConfig.cookieConsentEnabled !== false)
  const [cookieMessage, setCookieMessage] = useState<string>(initialConfig.cookieConsentMessage || "We use cookies to enhance your experience on our site. By continuing to browse, you accept our use of cookies.")
  const [cookiePosition, setCookiePosition] = useState<"bottom-left" | "bottom-right">(initialConfig.cookiePosition || "bottom-left")
  
  // Hosting Settings
  const [hostingName, setHostingName] = useState(initialConfig.hostingProvider?.name || "")
  const [hostingAddress, setHostingAddress] = useState(initialConfig.hostingProvider?.address || "")
  const [hostingContact, setHostingContact] = useState(initialConfig.hostingProvider?.contact || "")
  const [isSavingHosting, setIsSavingHosting] = useState(false)

  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  // Debounce timers for autosave
  const cookieSettingsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hostingSettingsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isSavingCookie, setIsSavingCookie] = useState(false)

  // Auto-save cookie settings with debounce
  const autoSaveCookieSettings = useCallback(async () => {
    setIsSavingCookie(true)
    try {
      const result = await updateCookieSettings({
        showLogo: showCookieLogo,
        enabled: cookieEnabled,
        message: cookieMessage,
        position: cookiePosition
      })
      
      if (result.success) {
        toast({
          title: "Auto-saved",
          description: "Cookie settings saved",
        })
      }
    } catch (error) {
      // Silent fail for autosave to avoid disrupting user
      console.error("Autosave failed:", error)
    } finally {
      setIsSavingCookie(false)
    }
  }, [showCookieLogo, cookieEnabled, cookieMessage, cookiePosition, toast])

  // Auto-save hosting settings with debounce
  const autoSaveHostingSettings = useCallback(async () => {
    setIsSavingHosting(true)
    try {
      const result = await updateHostingSettings({
        name: hostingName,
        address: hostingAddress,
        contact: hostingContact
      })
      
      if (result.success) {
        toast({
          title: "Auto-saved",
          description: "Hosting settings saved",
        })
      }
    } catch (error) {
      console.error("Autosave failed:", error)
    } finally {
      setIsSavingHosting(false)
    }
  }, [hostingName, hostingAddress, hostingContact, toast])

  // Effect for auto-saving cookie settings
  useEffect(() => {
    // Clear existing timer
    if (cookieSettingsTimerRef.current) {
      clearTimeout(cookieSettingsTimerRef.current)
    }

    // Set new timer for debounced autosave (500ms after last change)
    cookieSettingsTimerRef.current = setTimeout(() => {
      autoSaveCookieSettings()
    }, 500)

    return () => {
      if (cookieSettingsTimerRef.current) {
        clearTimeout(cookieSettingsTimerRef.current)
      }
    }
  }, [showCookieLogo, cookieEnabled, cookieMessage, cookiePosition, autoSaveCookieSettings])

  // Effect for auto-saving hosting settings
  useEffect(() => {
    if (hostingSettingsTimerRef.current) {
      clearTimeout(hostingSettingsTimerRef.current)
    }

    hostingSettingsTimerRef.current = setTimeout(() => {
      autoSaveHostingSettings()
    }, 500)

    return () => {
      if (hostingSettingsTimerRef.current) {
        clearTimeout(hostingSettingsTimerRef.current)
      }
    }
  }, [hostingName, hostingAddress, hostingContact, autoSaveHostingSettings])

  // Filter and search consents
  const filteredConsents = useMemo(() => {
    return consents.filter(consent => {
      const matchesSearch = 
        consent.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (consent.userAgent || "").toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = 
        statusFilter === "all" || consent.consentStatus === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [consents, searchQuery, statusFilter])

  const toggleSelectAll = () => {
    if (selectedConsents.size === filteredConsents.length) {
      setSelectedConsents(new Set())
    } else {
      setSelectedConsents(new Set(filteredConsents.map(c => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedConsents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedConsents(newSelected)
  }

  async function handleDeleteSelected() {
    if (selectedConsents.size === 0) return
    
    setIsDeleting(true)
    try {
      const result = await deleteCookieConsents(Array.from(selectedConsents))
      
      if (result.success) {
        toast({
          title: "Deleted",
          description: result.message || `${selectedConsents.size} consent(s) deleted`,
        })
        setConsents(consents.filter(c => !selectedConsents.has(c.id)))
        setSelectedConsents(new Set())
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to delete consents",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteSingle(id: string) {
    setIsDeleting(true)
    try {
      const result = await deleteCookieConsent(id)
      
      if (result.success) {
        toast({
          title: "Deleted",
          description: "Consent deleted successfully",
        })
        setConsents(consents.filter(c => c.id !== id))
        selectedConsents.delete(id)
        setSelectedConsents(new Set(selectedConsents))
        router.refresh()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to delete consent",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const exportConsents = () => {
    const csvContent = [
      ["Date", "IP Address", "Status", "User Agent"],
      ...filteredConsents.map(c => [
        format(new Date(c.consentedAt), "yyyy-MM-dd HH:mm:ss"),
        c.ipAddress,
        c.consentStatus,
        c.userAgent || ""
      ])
    ].map(e => e.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `cookie_consents_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Consent Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Cookie Popup Settings
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance and behavior of the cookie consent popup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="cookie-enabled" className="flex flex-col space-y-1">
                      <span>Enable Cookie Popup</span>
                      <span className="font-normal text-xs text-muted-foreground">
                        Show the consent popup to visitors.
                      </span>
                    </Label>
                    <Switch
                      id="cookie-enabled"
                      checked={cookieEnabled}
                      onCheckedChange={setCookieEnabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="show-logo" className="flex flex-col space-y-1">
                      <span>Show Logo</span>
                      <span className="font-normal text-xs text-muted-foreground">
                        Display the site logo in the popup.
                      </span>
                    </Label>
                    <Switch
                      id="show-logo"
                      checked={showCookieLogo}
                      onCheckedChange={setShowCookieLogo}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Select value={cookiePosition} onValueChange={(v: any) => setCookiePosition(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Consent Message</Label>
                    <Textarea
                      id="message"
                      value={cookieMessage}
                      onChange={(e) => setCookieMessage(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Enter the consent message..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Available tags: <code className="bg-muted px-1 rounded">{`{site_name}`}</code>
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground flex items-center gap-2">
                  {isSavingCookie ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Auto-saved</span>
                    </>
                  )}
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Hosting Provider Details
                  </CardTitle>
                  <CardDescription>
                    Information about the hosting provider for the Terms of Service page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hosting-name">Provider Name</Label>
                    <Input
                      id="hosting-name"
                      value={hostingName}
                      onChange={(e) => setHostingName(e.target.value)}
                      placeholder="e.g. Vercel Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hosting-address">Address</Label>
                    <Textarea
                      id="hosting-address"
                      value={hostingAddress}
                      onChange={(e) => setHostingAddress(e.target.value)}
                      placeholder="e.g. 340 S Lemon Ave #4133 Walnut, CA 91789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hosting-contact">Contact Info</Label>
                    <Input
                      id="hosting-contact"
                      value={hostingContact}
                      onChange={(e) => setHostingContact(e.target.value)}
                      placeholder="e.g. privacy@vercel.com or Phone number"
                    />
                  </div>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground flex items-center gap-2">
                  {isSavingHosting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Auto-saved</span>
                    </>
                  )}
                </CardFooter>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Quick Links</CardTitle>
                      <CardDescription>Direct links to public legal pages.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                      <Button variant="outline" className="justify-start" asChild>
                          <Link href="/legal/terms" target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" /> Terms of Service (ToS)
                          </Link>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                          <Link href="/legal/privacy" target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" /> Privacy Policy (RGPD)
                          </Link>
                      </Button>
                  </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="h-full border-dashed bg-muted/30">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>
                    This is how the cookie consent popup will appear to your visitors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[400px] relative p-0 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/50" />
                  <div className="relative w-full px-6">
                    <CookieConsentPreview 
                      logo={initialConfig.logo}
                      showLogo={showCookieLogo}
                      message={cookieMessage}
                      siteName={initialConfig.siteName}
                      isOpen={cookieEnabled}
                      position={cookiePosition}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Consent Logs
              </CardTitle>
              <CardDescription>
                View and manage user consent logs. {selectedConsents.size > 0 && `${selectedConsents.size} selected`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters and Actions */}
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by IP or User Agent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportConsents}
                    disabled={filteredConsents.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  
                  {selectedConsents.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete ({selectedConsents.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredConsents.length > 0 && selectedConsents.size === filteredConsents.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          {searchQuery || statusFilter !== "all" 
                            ? "No consents found matching your filters." 
                            : "No consent logs found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConsents.map((consent) => (
                        <TableRow key={consent.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedConsents.has(consent.id)}
                              onCheckedChange={() => toggleSelect(consent.id)}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(consent.consentedAt), "yyyy-MM-dd HH:mm:ss")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{consent.ipAddress}</TableCell>
                          <TableCell>
                            <Badge variant={consent.consentStatus === 'accepted' ? 'default' : 'destructive'}>
                              {consent.consentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground" title={consent.userAgent || ""}>
                            {consent.userAgent}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteSingle(consent.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredConsents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    {searchQuery || statusFilter !== "all" 
                      ? "No consents found matching your filters." 
                      : "No consent logs found."}
                  </div>
                ) : (
                  filteredConsents.map((consent) => (
                    <Card key={consent.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedConsents.has(consent.id)}
                              onCheckedChange={() => toggleSelect(consent.id)}
                            />
                            <Badge variant={consent.consentStatus === 'accepted' ? 'default' : 'destructive'}>
                              {consent.consentStatus}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteSingle(consent.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          <span className="font-medium">
                            {format(new Date(consent.consentedAt), "yyyy-MM-dd HH:mm:ss")}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">IP: </span>
                          <span className="font-mono text-xs">{consent.ipAddress}</span>
                        </div>
                        {consent.userAgent && (
                          <div>
                            <span className="text-muted-foreground">User Agent: </span>
                            <p className="text-xs text-muted-foreground break-all mt-1">
                              {consent.userAgent}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
