"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Settings, Edit3, Copy, Check, Cloud, Send, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { AdminPageGuard } from "@/components/admin/admin-page-guard"

function ScalewayIcon({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded bg-purple-600 text-white ${className}`}>
      <Cloud className="h-3 w-3" />
    </div>
  )
}

const emailTypes = [
  // --- Account ---
  { id: "registration", name: "Welcome / Registration", description: "Sent when a new user signs up", group: "account" },
  { id: "user_invitation", name: "Team Invitation", description: "Sent when inviting a member to a team", group: "account" },
  { id: "account_deletion", name: "Account Deletion", description: "Sent when a user account is deleted", group: "account" },
  { id: "email_update_notification", name: "Email Update", description: "Sent when a user changes their email", group: "account" },
  // --- E-commerce: Orders by product type ---
  { id: "order_confirmation", name: "Order — Generic", description: "Fallback order confirmation (mixed cart)", group: "commerce" },
  { id: "order_confirmation_physical", name: "Order — Physical Product", description: "Confirmation for physical product orders (shipping info)", group: "commerce" },
  { id: "order_confirmation_digital", name: "Order — Digital Product", description: "Confirmation for digital product orders (license key, download)", group: "commerce" },
  { id: "order_confirmation_subscription", name: "Order — Subscription", description: "Confirmation for subscription activation", group: "commerce" },
  // --- Payment ---
  { id: "payment_confirmation", name: "Payment Received", description: "Payment receipt sent for every successful payment", group: "payment" },
]

const variablesByGroup: Record<string, { name: string; value: string }[]> = {
  common: [
    { name: "User First Name", value: "{{firstName}}" },
    { name: "User Last Name", value: "{{lastName}}" },
    { name: "User Email", value: "{{email}}" },
    { name: "Company Name", value: "{{companyName}}" },
    { name: "Action URL", value: "{{actionUrl}}" },
    { name: "Site Name", value: "{{siteName}}" },
  ],
  commerce: [
    { name: "Order Number", value: "{{orderNumber}}" },
    { name: "Order Date", value: "{{orderDate}}" },
    { name: "Order Total", value: "{{total}}" },
    { name: "Currency", value: "{{currency}}" },
    { name: "Items (JSON)", value: "{{items}}" },
  ],
  digital: [
    { name: "License Key", value: "{{licenseKey}}" },
    { name: "License Instructions", value: "{{licenseInstructions}}" },
    { name: "Download URL", value: "{{downloadUrl}}" },
  ],
  subscription: [
    { name: "Plan Name", value: "{{planName}}" },
    { name: "Billing Interval", value: "{{billingInterval}}" },
    { name: "Next Renewal Date", value: "{{nextRenewalDate}}" },
  ],
  payment: [
    { name: "Payment Method", value: "{{paymentMethod}}" },
  ],
}

export default function MailPage() {
  const [selectedType, setSelectedType] = useState(emailTypes[0].id)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("html")
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("scaleway")
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Form state
  const [fromName, setFromName] = useState("NeoSaaS Team")
  const [fromEmail, setFromEmail] = useState("no-reply@neosaas.tech")
  const [subject, setSubject] = useState("Welcome to NeoSaaS!")
  const [htmlContent, setHtmlContent] = useState("<h1>Welcome {{firstName}}!</h1><p>Thanks for joining us.</p>")
  const [textContent, setTextContent] = useState("Welcome {{firstName}}! Thanks for joining us.")
  const [isActive, setIsActive] = useState(true)

  // Test email state
  const [testEmail, setTestEmail] = useState("")

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedVar(value)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const handleSaveTemplate = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          name: emailTypes.find(t => t.id === selectedType)?.name,
          description: emailTypes.find(t => t.id === selectedType)?.description,
          fromName,
          fromEmail,
          subject,
          htmlContent,
          textContent,
          isActive,
          provider: selectedProvider === 'scaleway' ? 'scaleway-tem' : selectedProvider === 'aws' ? 'aws-ses' : selectedProvider,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Template saved successfully!')
        setIsEditing(false)
      } else {
        toast.error(data.error || 'Failed to save template')
      }
    } catch (error) {
      toast.error('An error occurred while saving')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          from: fromEmail,
          fromName,
          subject,
          htmlContent,
          textContent,
          provider: selectedProvider === 'scaleway' ? 'scaleway-tem' : selectedProvider === 'aws' ? 'aws-ses' : selectedProvider,
          tags: ['test', selectedType],
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Test email sent successfully! Message ID: ${data.messageId}`)
      } else {
        toast.error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      toast.error('An error occurred while sending')
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  const loadTemplate = async () => {
    try {
      const response = await fetch('/api/email/templates')
      const data = await response.json()

      if (data.success) {
        const template = data.templates.find((t: any) => t.type === selectedType)
        if (template) {
          setFromName(template.fromName || 'NeoSaaS Team')
          setFromEmail(template.fromEmail || 'no-reply@neosaas.tech')
          setSubject(template.subject || '')
          setHtmlContent(template.htmlContent || '')
          setTextContent(template.textContent || '')
          setIsActive(template.isActive)
          if (template.provider) {
            setSelectedProvider(template.provider === 'scaleway-tem' ? 'scaleway' : template.provider === 'aws-ses' ? 'aws' : template.provider)
          }
        } else {
          // Reset to defaults if no template found
          setFromName('NeoSaaS Team')
          setFromEmail('no-reply@neosaas.tech')
          setSubject('')
          setHtmlContent('')
          setTextContent('')
          setIsActive(true)
          setSelectedProvider('scaleway')
        }
      }
    } catch (error) {
      console.error('Failed to load template:', error)
    }
  }

  useEffect(() => {
    loadTemplate()
  }, [selectedType])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Mail Management</h1>
        <p className="text-muted-foreground mt-1">Configure email providers and templates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Email Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emailTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${
                  selectedType === type.id
                    ? "bg-brand/10 border-brand text-brand font-medium"
                    : "hover:bg-muted border-transparent"
                }`}
              >
                <div className="font-medium">{type.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-brand" />
                  Configuration
                </CardTitle>
                <CardDescription>Settings for {emailTypes.find((t) => t.id === selectedType)?.name}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm font-medium">Enabled</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" /> Provider Settings
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sending Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="scaleway">
                        <span className="flex items-center gap-2">
                          <ScalewayIcon className="h-4 w-4" />
                          Scaleway TEM
                        </span>
                      </SelectItem>
                      <SelectItem value="aws">AWS SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} type="email" />
                {selectedProvider === 'scaleway' && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    ⚠️ Scaleway TEM: The email domain must be verified in your Scaleway console.
                    See <a href="/docs/guides/SCALEWAY-EMAIL-SETUP.md" className="underline" target="_blank">setup guide</a> for details.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Edit3 className="h-4 w-4" /> Template Content
                </h3>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-dashed bg-transparent">
                        {copiedVar ? (
                          <Check className="h-3 w-3 mr-2 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3 mr-2" />
                        )}
                        Variables
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
                      {(() => {
                        const selectedGroup = emailTypes.find(t => t.id === selectedType)?.group ?? 'account';
                        const groups = ['common'];
                        if (['commerce', 'payment'].includes(selectedGroup)) groups.push('commerce');
                        if (selectedGroup === 'commerce' && selectedType.includes('digital')) groups.push('digital');
                        if (selectedGroup === 'commerce' && selectedType.includes('subscription')) groups.push('subscription');
                        if (selectedGroup === 'payment') groups.push('payment');
                        const vars = groups.flatMap(g => variablesByGroup[g] ?? []);
                        return vars.map((variable) => (
                          <DropdownMenuItem
                            key={variable.value}
                            onClick={() => handleCopy(variable.value)}
                            className="flex justify-between cursor-pointer"
                          >
                            <span>{variable.name}</span>
                            <code className="text-xs bg-muted px-1 rounded">{variable.value}</code>
                          </DropdownMenuItem>
                        ));
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? "bg-brand hover:bg-[#B8691C]" : ""}
                  >
                    {isEditing ? "Cancel" : "Edit Template"}
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger
                        value="html"
                        className="data-[state=active]:bg-brand data-[state=active]:text-white"
                      >
                        HTML
                      </TabsTrigger>
                      <TabsTrigger
                        value="text"
                        className="data-[state=active]:bg-brand data-[state=active]:text-white"
                      >
                        Plain Text
                      </TabsTrigger>
                      <TabsTrigger
                        value="preview"
                        className="data-[state=active]:bg-brand data-[state=active]:text-white"
                      >
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="mt-4">
                      <Textarea
                        className="font-mono min-h-[300px]"
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                      />
                    </TabsContent>
                    <TabsContent value="text" className="mt-4">
                      <Textarea
                        className="font-mono min-h-[300px]"
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="mt-4">
                      <div className="border rounded-lg p-6 min-h-[300px] prose max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: htmlContent.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                          const examples: Record<string, string> = {
                            firstName: 'John',
                            lastName: 'Doe',
                            email: 'john@example.com',
                            companyName: 'Acme Corp',
                            actionUrl: '#',
                            siteName: 'NeoSaaS',
                            orderNumber: 'ORD-2026-0042',
                            orderDate: '2026-02-16',
                            total: '129.00',
                            currency: 'EUR',
                            items: '[{"name":"Widget Pro","qty":2,"price":"49.50"}]',
                            licenseKey: 'XXXX-XXXX-XXXX-XXXX',
                            licenseInstructions: 'Go to Settings > Activate',
                            downloadUrl: 'https://example.com/download/abc123',
                            planName: 'Pro Monthly',
                            billingInterval: 'month',
                            nextRenewalDate: '2026-03-16',
                            paymentMethod: 'Visa •••• 4242',
                          }
                          return examples[key] || key
                        }) }} />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={isSaving}
                      className="bg-brand hover:bg-[#B8691C]"
                    >
                      {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Template
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-2">Subject: {subject}</div>
                  <div className="prose max-w-none text-sm">
                    <p>Template preview hidden. Click "Edit Template" to modify.</p>
                  </div>
                </div>
              )}

              {/* Test Email Section */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4" /> Send Test Email
                </h3>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={isSending || !testEmail}
                    variant="outline"
                  >
                    {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Test
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
