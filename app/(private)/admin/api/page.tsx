"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Eye, EyeOff, Save, RefreshCw, Key, CheckCircle, XCircle, Loader2, Trash2, Plus, AlertCircle, Copy, Check, ChevronDown, ChevronsUpDown, Rocket, FlaskConical, ShieldAlert } from "lucide-react"
import { SiStripe, SiPaypal, SiResend, SiScaleway, SiGithub, SiGoogle, SiFacebook } from "react-icons/si"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { McpTokensCard } from "@/components/admin/mcp-tokens-card"


// Service categories for organized display
const serviceCategories = [
  {
    id: "payment",
    label: "💳 Payment",
    description: "Billing and payment services",
    services: [
      { id: "stripe", name: "Stripe", icon: "stripe", type: "payment", description: "Payment Processing", isMain: true },
      { id: "paypal", name: "PayPal", icon: "paypal", type: "payment", description: "Online Payments" },
    ]
  },
  {
    id: "email",
    label: "📧 Email",
    description: "Transactional email sending services",
    services: [
      { id: "resend", name: "Resend", icon: "📧", type: "email", description: "Transactional email service" },
      { id: "aws", name: "AWS SES", icon: "☁️", type: "email", description: "Amazon Simple Email Service" },
      { id: "scaleway", name: "Scaleway TEM", icon: "scaleway", type: "email", description: "Transactional Email" },
    ]
  },
  {
    id: "oauth",
    label: "🔐 OAuth Authentication",
    description: "Social authentication providers",
    services: [
      { id: "github", name: "GitHub", icon: "github", type: "oauth", description: "OAuth Authentication Provider" },
      { id: "google", name: "Google", icon: "google", type: "oauth", description: "OAuth Authentication Provider" },
      { id: "facebook", name: "Facebook", icon: "facebook", type: "oauth", description: "OAuth Authentication Provider" },
      { id: "microsoft", name: "Microsoft", icon: "microsoft", type: "oauth", description: "OAuth Authentication Provider" },
    ]
  },
]

// Flat list for backward compatibility
const services = serviceCategories.flatMap(cat => cat.services)

// SVG Icons for all services
function ServiceIcon({ service, size = "sm" }: { service: (typeof services)[0]; size?: "sm" | "md" | "lg" }) {
  // The `!` (important) prefix is required: SelectItem force-resizes any
  // descendant <svg> lacking a "size-" class to 16px via
  // `[&_svg:not([class*='size-'])]:size-4`, and CommandItem forces ALL
  // descendant svgs to size-4 unconditionally via `[&_svg]:size-4` — neither
  // is beatable by plain h-X/w-X classes. Confirmed live 2026-08-22 (Charles:
  // icons overflowing/inconsistent in the service picker).
  const sizeClass = size === "sm" ? "!size-5" : size === "md" ? "!size-6" : "!size-8"


  // Brands covered by Simple Icons (simpleicons.org via react-icons/si) —
  // official logo + official brand color, one line each instead of a
  // hand-maintained SVG path per service.
  if (service.id === "stripe") {
    return (
      <div className={`${sizeClass} rounded-md flex items-center justify-center`} style={{ backgroundColor: "#635BFF" }}>
        <SiStripe className={size === "sm" ? "!size-3" : size === "md" ? "!size-3.5" : "!size-5"} color="white" />
      </div>
    )
  }

  if (service.id === "paypal") {
    return <SiPaypal className={sizeClass} color="#003087" />
  }

  if (service.id === "resend") {
    return <SiResend className={sizeClass} color="#000000" />
  }

  // AWS SES - Amazon orange
  if (service.id === "aws") {
    return (
      <svg className={sizeClass} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#232F3E"/>
        <path d="M9 20.5c0 .3.2.5.5.5h1c.3 0 .5-.2.5-.5v-4l3 4.3c.1.1.2.2.4.2h1.1c.3 0 .5-.2.5-.5v-8c0-.3-.2-.5-.5-.5h-1c-.3 0-.5.2-.5.5v4l-3-4.3c-.1-.1-.2-.2-.4-.2H9.5c-.3 0-.5.2-.5.5v8z" fill="#FF9900"/>
        <path d="M18 17.5c0 .3.2.5.5.5h4c.3 0 .5-.2.5-.5v-1c0-.3-.2-.5-.5-.5h-2.5v-1.5h2c.3 0 .5-.2.5-.5v-1c0-.3-.2-.5-.5-.5h-2V11h2.5c.3 0 .5-.2.5-.5v-1c0-.3-.2-.5-.5-.5h-4c-.3 0-.5.2-.5.5v8z" fill="#FF9900"/>
      </svg>
    )
  }

  if (service.id === "scaleway" || service.icon === "scaleway") {
    return <SiScaleway className={sizeClass} color="#4F0599" />
  }

  if (service.id === "github") {
    return <SiGithub className={sizeClass} color="currentColor" />
  }

  if (service.id === "google") {
    return <SiGoogle className={sizeClass} color="#4285F4" />
  }

  if (service.id === "facebook") {
    return <SiFacebook className={sizeClass} color="#1877F2" />
  }

  // Microsoft - Official colors
  if (service.id === "microsoft") {
    return (
      <svg className={sizeClass} viewBox="0 0 24 24">
        <path fill="#f25022" d="M1 1h10v10H1z"/>
        <path fill="#00a4ef" d="M13 1h10v10H13z"/>
        <path fill="#7fba00" d="M1 13h10v10H1z"/>
        <path fill="#ffb900" d="M13 13h10v10H13z"/>
      </svg>
    )
  }

  // Default: emoji fallback
  return <span className={size === "lg" ? "text-2xl" : "text-base"}>{service.icon}</span>
}

interface ApiConfig {
  id: string
  serviceName: string
  serviceType: string
  environment: string
  isActive: boolean
  isDefault: boolean
  metadata?: any
  lastTestedAt?: string
}

export default function AdminApiPage() {
  const [allConfigs, setAllConfigs] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const { toast } = useToast()

  // Form state
  const [selectedService, setSelectedService] = useState(services[0].id)
  const [serviceComboOpen, setServiceComboOpen] = useState(false)
  const [environment, setEnvironment] = useState("production")
  const [showKey, setShowKey] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingInModal, setTestingInModal] = useState(false)
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [githubOAuthOpen, setGithubOAuthOpen] = useState(true)
  const [githubApiOpen, setGithubApiOpen] = useState(false)
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAutoSavedSignatureRef = useRef<string>("")

  // Service-specific configs
  const [scalewayConfig, setScalewayConfig] = useState({
    accessKey: "",
    secretKey: "",
    projectId: "",
  })
  const [resendConfig, setResendConfig] = useState({ apiKey: "", domain: "" })
  const [awsConfig, setAwsConfig] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    region: "eu-west-1",
    sessionToken: ""
  })
  const [stripeConfig, setStripeConfig] = useState({
    publicKey: "",
    secretKey: "",
    webhookSecret: "",
  })
  const [paypalConfig, setPaypalConfig] = useState({
    clientId: "",
    clientSecret: "",
    webhookId: "",
  })
  const [githubConfig, setGithubConfig] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  })
  const [githubApiConfig, setGithubApiConfig] = useState({
    personalAccessToken: "",
    repo: "",
  })

  const [googleConfig, setGoogleConfig] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  })

  // "GitHub API" (Personal Access Token) is saved via its own dedicated
  // route (/api/admin/configure-github-api, always environment "production")
  // rather than the generic /api/services/[service] dialog flow used by
  // Stripe/Google/etc — it never had a matching load call, so the field
  // rendered empty on every page visit even when a valid token was saved.
  const loadGithubApiConfig = async () => {
    try {
      const response = await fetch('/api/services/github_api?environment=production')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setGithubApiConfig({
            personalAccessToken: data.data.config.personalAccessToken || "",
            repo: data.data.config.repo || "",
          })
        }
      }
    } catch (error) {
      console.error("Error loading GitHub API configuration:", error)
    }
  }

  useEffect(() => {
    loadAllConfigs()
    loadGithubApiConfig()
  }, [])

  const loadAllConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAllConfigs(data.data || [])
        }
      }
    } catch (error) {
      console.error("Error loading configurations:", error)
      toast({
        title: "❌ Error",
        description: "Failed to load API configurations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setEditingConfig(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = async (config: ApiConfig) => {
    setEditingConfig(config)
    setSelectedService(config.serviceName)
    setEnvironment(config.environment)

    // Load the actual config data
    try {
      const response = await fetch(`/api/services/${config.serviceName}?environment=${config.environment}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          switch (config.serviceName) {
            case "scaleway":
              setScalewayConfig({
                accessKey: data.data.config.accessKey || "",
                secretKey: data.data.config.secretKey || "",
                projectId: data.data.config.projectId || "",
              })
              break
            case "resend":
              setResendConfig({ ...data.data.config, domain: data.data.metadata?.domain || "" })
              break
            case "aws":
              setAwsConfig(data.data.config)
              break
            case "stripe":
              setStripeConfig({
                publicKey: data.data.config.publicKey || "",
                secretKey: data.data.config.secretKey || "",
                webhookSecret: data.data.config.webhookSecret || "",
              })
              break
            case "paypal":
              setPaypalConfig({
                clientId: data.data.config.clientId || "",
                clientSecret: data.data.config.clientSecret || "",
                webhookId: data.data.config.webhookId || "",
              })
              break
            case "github":
              setGithubConfig({
                clientId: data.data.config.clientId || "",
                clientSecret: data.data.config.clientSecret || "",
                redirectUri: data.data.metadata?.redirectUri || "",
              })
              break
            case "google":
              setGoogleConfig({
                clientId: data.data.config.clientId || "",
                clientSecret: data.data.config.clientSecret || "",
                redirectUri: data.data.metadata?.redirectUri || "",
              })
              break
          }
        }
      }
    } catch (error) {
      console.error("Error loading config details:", error)
    }

    setDialogOpen(true)
  }

  const resetForm = () => {
    setSelectedService(services[0].id)
    setEnvironment("production")
    setScalewayConfig({ accessKey: "", secretKey: "", projectId: "" })
    setResendConfig({ apiKey: "", domain: "" })
    setAwsConfig({ accessKeyId: "", secretAccessKey: "", region: "eu-west-1", sessionToken: "" })
    setStripeConfig({ publicKey: "", secretKey: "", webhookSecret: "" })
    setPaypalConfig({ clientId: "", clientSecret: "", webhookId: "" })
    setGithubConfig({ clientId: "", clientSecret: "", redirectUri: "" })
    setGoogleConfig({ clientId: "", clientSecret: "", redirectUri: "" })
    setShowKey(false)
    setShowSecretKey(false)
    setModalTestResult(null)
    setAutoSaveState("idle")
    lastAutoSavedSignatureRef.current = ""
  }

  const handleTestInModal = async () => {
    setTestingInModal(true)
    setModalTestResult(null)

    try {
      let config: any
      let metadata: any = {}

      switch (selectedService) {
        case "scaleway":
          // For TEM, only Secret Key and Project ID are required
          // Access Key is optional (not used by the TEM API)
          if (!scalewayConfig.secretKey || !scalewayConfig.projectId) {
            throw new Error("Secret Key and Project ID are required")
          }
          config = {
            accessKey: scalewayConfig.accessKey || "", // Optional for TEM
            secretKey: scalewayConfig.secretKey,
            projectId: scalewayConfig.projectId,
          }
          metadata = {}
          break
        case "resend":
          if (!resendConfig.apiKey) {
            throw new Error("Please fill in the API key")
          }
          config = { apiKey: resendConfig.apiKey }
          metadata = { domain: resendConfig.domain }
          break
        case "aws":
          if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
            throw new Error("Please fill in all required fields")
          }
          config = awsConfig
          break
        case "stripe":
          if (!stripeConfig.secretKey || !stripeConfig.publicKey) {
            throw new Error("Please fill in the API keys")
          }
          // Validate key/environment consistency
          {
            const isTestSk = stripeConfig.secretKey.startsWith('sk_test_')
            const isTestPk = stripeConfig.publicKey.startsWith('pk_test_')
            const isProd = environment === "production"
            if (isProd && (isTestSk || isTestPk)) {
              throw new Error("You are in Production mode but the keys are test keys (sk_test_ / pk_test_). Use your live keys from the Stripe dashboard.")
            }
            if (!isProd && (!isTestSk || !isTestPk)) {
              throw new Error("You are in Test mode but the keys are live keys (sk_live_ / pk_live_). Use your test keys from the Stripe dashboard.")
            }
          }
          config = stripeConfig
          break
        case "paypal":
          if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
            throw new Error("Please fill in the credentials")
          }
          config = paypalConfig
          break
        case "github":
          if (!githubConfig.clientId) {
            throw new Error("GitHub Personal Access Token is required")
          }
          // For GitHub, we just test whether the token is valid via the GitHub API
          const githubTestResponse = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${githubConfig.clientId}`,
              'Accept': 'application/vnd.github+json',
            }
          })

          if (!githubTestResponse.ok) {
            throw new Error("Invalid GitHub token or insufficient permissions")
          }

          const githubUser = await githubTestResponse.json()
          setModalTestResult({
            success: true,
            message: `Valid token for user ${githubUser.login}`
          })
          toast({
            title: "✅ Valid GitHub token",
            description: `Connected as ${githubUser.login}`,
          })
          setTestingInModal(false)
          return // Exit here, the test has already been handled
      }

      const response = await fetch(`/api/services/${selectedService}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: editingConfig ? environment : undefined,
          testConfig: !editingConfig ? { config, metadata } : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setModalTestResult({ success: true, message: data.message })
        toast({
          title: "Key valid",
          description: `${data.message} (${data.responseTime}ms)`,
        })

      } else {
        setModalTestResult({ success: false, message: data.message || data.error })
        toast({
          title: "❌ Invalid key",
          description: data.message || data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify the key"
      setModalTestResult({ success: false, message })
      toast({
        title: "❌ Erreur",
        description: message,
        variant: "destructive",
      })
    } finally {
      setTestingInModal(false)
    }
  }

  // Required fields per service, mirrored from the validation inside
  // handleSave -- used to decide when the autosave effect is allowed to fire
  // (never attempt a save while the user is still mid-way through filling
  // a form, only once every required field for that service is present).
  const isCurrentServiceComplete = () => {
    switch (selectedService) {
      case "scaleway":
        return !!(scalewayConfig.secretKey && scalewayConfig.projectId)
      case "resend":
        return !!resendConfig.apiKey
      case "aws":
        return !!(awsConfig.accessKeyId && awsConfig.secretAccessKey)
      case "stripe":
        return !!(stripeConfig.secretKey && stripeConfig.publicKey)
      case "paypal":
        return !!(paypalConfig.clientId && paypalConfig.clientSecret)
      case "github":
        return !!(githubConfig.clientId && githubConfig.clientSecret)
      case "google":
        return !!(googleConfig.clientId && googleConfig.clientSecret)
      default:
        return false
    }
  }

  const handleSave = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    setSaving(true)
    if (silent) setAutoSaveState("saving")

    try {
      let config: any
      let metadata: any = {}
      const currentService = services.find(s => s.id === selectedService)

      switch (selectedService) {
        case "scaleway":
          // For TEM, only Secret Key and Project ID are required
          if (!scalewayConfig.secretKey || !scalewayConfig.projectId) {
            throw new Error("Secret Key and Project ID are required")
          }
          config = {
            accessKey: scalewayConfig.accessKey || "", // Optionnel pour TEM
            secretKey: scalewayConfig.secretKey,
            projectId: scalewayConfig.projectId,
          }
          metadata = {}
          break
        case "resend":
          if (!resendConfig.apiKey) {
            throw new Error("API Key is required")
          }
          config = { apiKey: resendConfig.apiKey }
          metadata = { domain: resendConfig.domain }
          break
        case "aws":
          if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
            throw new Error("Access Key ID and Secret Access Key are required")
          }
          config = awsConfig
          break
        case "stripe":
          if (!stripeConfig.secretKey || !stripeConfig.publicKey) {
            throw new Error("Secret Key and Public Key are required")
          }
          // Validate key/environment consistency
          {
            const isTestSk = stripeConfig.secretKey.startsWith('sk_test_')
            const isTestPk = stripeConfig.publicKey.startsWith('pk_test_')
            const isProd = environment === "production"
            if (isProd && (isTestSk || isTestPk)) {
              throw new Error("Production mode requires live keys (sk_live_ / pk_live_). Check your Stripe dashboard.")
            }
            if (!isProd && (!isTestSk || !isTestPk)) {
              throw new Error("Test mode requires test keys (sk_test_ / pk_test_). Check your Stripe dashboard.")
            }
            // Block duplicate Stripe environment
            if (!editingConfig) {
              const existingStripe = allConfigs.filter(c => c.serviceName === 'stripe')
              if (existingStripe.some(c => c.environment === environment)) {
                throw new Error(`A Stripe ${isProd ? 'Production' : 'Test'} configuration already exists. Edit the existing one instead.`)
              }
            }
          }
          config = stripeConfig
          break
        case "paypal":
          if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
            throw new Error("Client ID and Client Secret are required")
          }
          config = paypalConfig
          break
        case "github":
          // Direct registration of GitHub OAuth credentials
          console.log("🔧 [Frontend] Registering GitHub OAuth credentials")
          console.log("📝 [Frontend] Client ID:", githubConfig.clientId ? `${githubConfig.clientId.substring(0, 10)}...` : 'NONE')
          console.log("📝 [Frontend] Client Secret:", githubConfig.clientSecret ? '***' : 'NONE')
          
          if (!githubConfig.clientId || !githubConfig.clientSecret) {
            throw new Error("Client ID and Client Secret are required")
          }
          
          console.log("📡 [Frontend] Sending request to /api/admin/configure-github-oauth...")
          
          // Call configuration API with direct credentials
          const githubResponse = await fetch('/api/admin/configure-github-oauth', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: githubConfig.clientId,
              clientSecret: githubConfig.clientSecret,
              environment,
            }),
          })
          
          console.log(`📊 [Frontend] Response received: ${githubResponse.status} ${githubResponse.statusText}`)

          const githubData = await githubResponse.json()
          console.log("📦 [Frontend] Response data:", githubData)

          if (!githubData.success) {
            console.error("❌ [Frontend] Configuration failed:", githubData.error)
            throw new Error(githubData.error || "Failed to save GitHub OAuth configuration")
          }

          console.log("✅ [Frontend] Configuration successful")
          setSaving(false)

          if (silent) {
            setAutoSaveState("saved")
          } else {
            setDialogOpen(false)
            resetForm()
            toast({
              title: "✅ GitHub OAuth Saved",
              description: githubData.message || "GitHub OAuth credentials have been saved successfully.",
              duration: 3000,
            })
          }

          console.log("🔄 [Frontend] Reloading configurations...")
          await loadAllConfigs()

          return // Exit function as we already handled the save
        case "google":
          if (!googleConfig.clientId || !googleConfig.clientSecret) {
            throw new Error("Client ID and Client Secret are required")
          }
          config = googleConfig
          metadata = { redirectUri: googleConfig.redirectUri }
          break
      }

      const payload = {
        serviceType: currentService?.type,
        environment,
        isActive: true,
        isDefault: true,
        config,
        metadata,
      }

      console.log("Saving configuration:", { service: selectedService, payload })

      const response = await fetch(`/api/services/${selectedService}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status)
      const data = await response.json()
      console.log("Response data:", data)

      if (data.success) {
        if (silent) {
          setAutoSaveState("saved")
        } else {
          toast({
            title: "Configuration Saved",
            description: `${currentService?.name} configuration has been saved and encrypted.`,
          })
          setDialogOpen(false)
          resetForm()
        }
        await loadAllConfigs()

      } else {
        throw new Error(data.error || "Failed to save configuration")
      }
    } catch (error) {
      if (silent) setAutoSaveState("error")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Autosave: once every required field for the selected service is filled,
  // debounce and persist in the background instead of requiring an explicit
  // Save click. `lastAutoSavedSignatureRef` skips redundant saves when the
  // effect re-fires with unchanged values (e.g. a sibling field re-rendering).
  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

    if (!dialogOpen || !isCurrentServiceComplete()) {
      return
    }

    const signature = JSON.stringify({
      selectedService,
      environment,
      scalewayConfig,
      resendConfig,
      awsConfig,
      stripeConfig,
      paypalConfig,
      githubConfig,
      googleConfig,
    })
    if (signature === lastAutoSavedSignatureRef.current) {
      return
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      lastAutoSavedSignatureRef.current = signature
      handleSave({ silent: true })
    }, 800)

    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, selectedService, environment, scalewayConfig, resendConfig, awsConfig, stripeConfig, paypalConfig, githubConfig, googleConfig])

  const handleTest = async (config: ApiConfig) => {
    setTestingId(config.id)

    try {
      const response = await fetch(`/api/services/${config.serviceName}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: config.environment }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Valid Key",
          description: `${data.message} (${data.responseTime}ms)`,
        })
        await loadAllConfigs()

      } else {
        toast({
          title: "Invalid Key",
          description: data.message || data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to verify key",
        variant: "destructive",
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (config: ApiConfig) => {
    const serviceInfo = getServiceInfo(config.serviceName)
    if (!confirm(`Are you sure you want to delete the ${serviceInfo?.name || config.serviceName} API configuration?`)) {
      return
    }

    try {
      const response = await fetch(`/api/services/${config.serviceName}?id=${config.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Configuration Deleted",
          description: "The configuration has been removed.",
        })
        await loadAllConfigs()
      } else {
        throw new Error(data.error || "Failed to delete configuration")
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to delete configuration",
        variant: "destructive",
      })
    }
  }

  const renderConfigFields = () => {
    switch (selectedService) {
      case "scaleway":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Secret Key *</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={scalewayConfig.secretKey}
                  onChange={(e) => setScalewayConfig({ ...scalewayConfig, secretKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Secret key generated during API key creation (visible only once)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Project ID *</Label>
              <Input
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={scalewayConfig.projectId}
                onChange={(e) => setScalewayConfig({ ...scalewayConfig, projectId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Console Scaleway → Settings → Project Settings
              </p>
            </div>
            <div className="space-y-2">
              <Label>Access Key (optional)</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="SCW..."
                  value={scalewayConfig.accessKey}
                  onChange={(e) => setScalewayConfig({ ...scalewayConfig, accessKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                API key identifier (not required for TEM)
              </p>
            </div>
          </div>
        )

      case "resend":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key *</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="re_..."
                  value={resendConfig.apiKey}
                  onChange={(e) => setResendConfig({ ...resendConfig, apiKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Domain (Optional)</Label>
              <Input
                type="text"
                placeholder="example.com"
                value={resendConfig.domain}
                onChange={(e) => setResendConfig({ ...resendConfig, domain: e.target.value })}
              />
            </div>
          </div>
        )

      case "aws":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Access Key ID *</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="AKIA..."
                  value={awsConfig.accessKeyId}
                  onChange={(e) => setAwsConfig({ ...awsConfig, accessKeyId: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key *</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  placeholder="Secret Access Key"
                  value={awsConfig.secretAccessKey}
                  onChange={(e) => setAwsConfig({ ...awsConfig, secretAccessKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Region *</Label>
              <Select value={awsConfig.region} onValueChange={(value) => setAwsConfig({ ...awsConfig, region: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session Token (Optional)</Label>
              <Input
                type="password"
                placeholder="Session Token"
                value={awsConfig.sessionToken}
                onChange={(e) => setAwsConfig({ ...awsConfig, sessionToken: e.target.value })}
              />
            </div>
          </div>
        )


      case "stripe": {
        // Check existing Stripe configs for duplicate prevention
        const existingStripeConfigs = allConfigs.filter(c => c.serviceName === 'stripe')
        const hasStripeProd = existingStripeConfigs.some(c => c.environment === 'production')
        const hasStripeTest = existingStripeConfigs.some(c => c.environment === 'test')
        const editingCurrentEnv = editingConfig?.serviceName === 'stripe' ? editingConfig.environment : null
        const canSaveProd = !hasStripeProd || editingCurrentEnv === 'production'
        const canSaveTest = !hasStripeTest || editingCurrentEnv === 'test'

        // Auto-detect environment from key prefix
        const detectedEnv = stripeConfig.secretKey.startsWith('sk_live_') || stripeConfig.publicKey.startsWith('pk_live_')
          ? 'production'
          : stripeConfig.secretKey.startsWith('sk_test_') || stripeConfig.publicKey.startsWith('pk_test_')
          ? 'test'
          : null

        // Warning if keys don't match selected environment
        const keyEnvMismatch = detectedEnv !== null && detectedEnv !== environment

        return (
          <div className="space-y-4">
            {/* Environment toggle with colored indicator */}
            <div className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
              environment === "production"
                ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
            }`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {environment === "production" ? (
                    <Rocket className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <FlaskConical className="h-4 w-4 text-amber-600" />
                  )}
                  <Label className="text-base font-semibold">
                    {environment === "production" ? "🟢 Production Mode" : "🟡 Test Mode"}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {environment === "production"
                    ? "Real payments — sk_live_ / pk_live_ keys required"
                    : "Test mode — sk_test_ / pk_test_ keys required"}
                </p>
              </div>
              <Switch
                checked={environment === "production"}
                onCheckedChange={(checked) => setEnvironment(checked ? "production" : "test")}
              />
            </div>

            {/* Warning: duplicate env already exists */}
            {!editingConfig && environment === 'production' && !canSaveProd && (
              <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                <p className="text-sm text-red-700 font-medium">⛔ A <strong>Production</strong> Stripe configuration already exists. Edit the existing one instead of creating a new one.</p>
              </div>
            )}
            {!editingConfig && environment === 'test' && !canSaveTest && (
              <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                <p className="text-sm text-red-700 font-medium">⛔ A <strong>Test</strong> Stripe configuration already exists. Edit the existing one instead of creating a new one.</p>
              </div>
            )}

            {/* Warning: key prefix doesn't match environment */}
            {keyEnvMismatch && (
              <div className="p-3 border rounded-lg bg-yellow-50 border-yellow-300">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ The keys entered are <strong>{detectedEnv === 'production' ? 'live (production)' : 'test'}</strong> keys, but you are in <strong>{environment === 'production' ? 'Production' : 'Test'}</strong> mode. Toggle the switch or fix your keys.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Public Key *</Label>
              <Input
                type="text"
                placeholder={environment === 'production' ? 'pk_live_...' : 'pk_test_...'}
                value={stripeConfig.publicKey}
                onChange={(e) => setStripeConfig({ ...stripeConfig, publicKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Key *</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  placeholder={environment === 'production' ? 'sk_live_...' : 'sk_test_...'}
                  value={stripeConfig.secretKey}
                  onChange={(e) => setStripeConfig({ ...stripeConfig, secretKey: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret (Optional)</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="whsec_..."
                  value={stripeConfig.webhookSecret}
                  onChange={(e) => setStripeConfig({ ...stripeConfig, webhookSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Info: max 2 Stripe configs */}
            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>💡 Tip:</strong> Stripe allows a maximum of <strong>2 configurations</strong> — one for Production (<code>sk_live_</code> keys) and one for Test (<code>sk_test_</code> keys). The active mode is controlled from <strong>Payment Config</strong> in the admin Overview.
              </p>
            </div>
          </div>
        )
      }

      case "paypal":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-base">Environment Mode</Label>
                <p className="text-sm text-muted-foreground">
                  {environment === "production" ? "Production Mode" : "Sandbox Mode"}
                </p>
              </div>
              <Switch
                checked={environment === "production"}
                onCheckedChange={(checked) => setEnvironment(checked ? "production" : "test")}
              />
            </div>

            <div className="space-y-2">
              <Label>Client ID *</Label>
              <Input
                type="text"
                placeholder="Client ID"
                value={paypalConfig.clientId}
                onChange={(e) => setPaypalConfig({ ...paypalConfig, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret *</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  placeholder="Client Secret"
                  value={paypalConfig.clientSecret}
                  onChange={(e) => setPaypalConfig({ ...paypalConfig, clientSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Webhook ID (Optional)</Label>
              <Input
                type="text"
                placeholder="Webhook ID"
                value={paypalConfig.webhookId}
                onChange={(e) => setPaypalConfig({ ...paypalConfig, webhookId: e.target.value })}
              />
            </div>
          </div>
        )

      case "github":
        const callbackUrl = typeof window !== 'undefined' 
          ? `${window.location.origin}/api/auth/oauth/github/callback`
          : `${process.env.NEXT_PUBLIC_APP_URL || 'https://votredomaine.com'}/api/auth/oauth/github/callback`;
        
        const copyToClipboard = (text: string) => {
          navigator.clipboard.writeText(text);
          setCopiedUrl(true);
          setTimeout(() => setCopiedUrl(false), 2000);
          toast({
            title: "✅ Copied!",
            description: "URL copied to clipboard",
            duration: 2000,
          });
        };

        return (
          <div className="space-y-4">
            {/* OAuth Configuration Section */}
            <Collapsible open={githubOAuthOpen} onOpenChange={setGithubOAuthOpen}>
              <div className="border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950/20 transition-all duration-300">
                <CollapsibleTrigger className="w-full p-4 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          🔐 OAuth Configuration (User Authentication)
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Allows users to sign in with GitHub
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-blue-600 transition-transform duration-300 ${githubOAuthOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="transition-all duration-300 ease-in-out">
                  <div className="p-4 border-t border-blue-200 dark:border-blue-800 space-y-4">
                    {/* Callback URL - Facilement copiable */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Authorization Callback URL *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={callbackUrl}
                          readOnly
                          className="font-mono text-xs bg-white dark:bg-gray-900"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(callbackUrl)}
                          className="shrink-0"
                        >
                          {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Copy this exact URL into your GitHub OAuth App
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github-oauth-client-id">Client ID *</Label>
                      <Input
                        id="github-oauth-client-id"
                        type="text"
                        placeholder="Iv1.xxxxxxxxxxxx"
                        value={githubConfig.clientId}
                        onChange={(e) => setGithubConfig({ ...githubConfig, clientId: e.target.value })}
                        className="font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github-oauth-client-secret">Client Secret *</Label>
                      <div className="relative">
                        <Input
                          id="github-oauth-client-secret"
                          type={showSecretKey ? "text" : "password"}
                          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={githubConfig.clientSecret}
                          onChange={(e) => setGithubConfig({ ...githubConfig, clientSecret: e.target.value })}
                          className="pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        >
                          {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Test automatique OAuth */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!githubConfig.clientId || !githubConfig.clientSecret) {
                            toast({
                              title: "❌ Error",
                              description: "Please fill in Client ID and Client Secret",
                              variant: "destructive",
                            });
                            return;
                          }
                          setTestingInModal(true);
                          setModalTestResult(null);

                          // Validate GitHub OAuth Client ID format
                          // Old format: Iv1.xxxxxxxxxxxxxxxx (legacy OAuth Apps)
                          // New format: Ov2Xxxxxxxxxxxxxxxxxxx (new OAuth Apps, no dot)
                          const isValid =
                            githubConfig.clientId.startsWith('Iv1.') ||  // Old: Iv1. (with dot)
                            githubConfig.clientId.startsWith('Ov2') ||   // New: Ov2X (no dot)
                            githubConfig.clientId.startsWith('Ov1');     // Backup format

                          setModalTestResult({
                            success: isValid,
                            message: isValid
                              ? `✅ Client ID format valid (${githubConfig.clientId.substring(0, 4)}...)`
                              : "⚠️ Client ID format appears invalid (should start with Iv1., Ov1, or Ov2)"
                          });
                          setTestingInModal(false);
                        }}
                        disabled={testingInModal}
                        className="w-full"
                      >
                        {testingInModal ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Test OAuth Configuration
                          </>
                        )}
                      </Button>
                      
                      {modalTestResult && (
                        <div className={`mt-2 p-3 rounded-lg text-xs ${
                          modalTestResult.success 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {modalTestResult.message}
                        </div>
                      )}
                    </div>

                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        <strong>🔑 Create a GitHub OAuth App:</strong>{" "}
                        <a 
                          href="https://github.com/settings/developers" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline font-semibold hover:text-blue-900"
                        >
                          GitHub Settings → Developer Settings → OAuth Apps → New OAuth App
                        </a>
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* API Configuration Section */}
            <Collapsible open={githubApiOpen} onOpenChange={setGithubApiOpen}>
              <div className="border-2 border-purple-500 rounded-lg bg-purple-50 dark:bg-purple-950/20 transition-all duration-300">
                <CollapsibleTrigger className="w-full p-4 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <Key className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                          🔑 API Configuration (Server Integration)
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          To interact with GitHub API from your server
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-purple-600 transition-transform duration-300 ${githubApiOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="transition-all duration-300 ease-in-out">
                  <div className="p-4 border-t border-purple-200 dark:border-purple-800 space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        ℹ️ <strong>GitHub API Integration</strong>: Configure a Personal Access Token to fetch GitHub logs, manage repositories, and integrate GitHub data into your monitoring system.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github-api-token">Personal Access Token (Classic) *</Label>
                      <div className="relative">
                        <Input
                          id="github-api-token"
                          type={showKey ? "text" : "password"}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={githubApiConfig.personalAccessToken}
                          onChange={(e) => setGithubApiConfig({ ...githubApiConfig, personalAccessToken: e.target.value })}
                          className="pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scopes required: <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">repo</code>, <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">read:org</code>, <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">read:user</code>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github-api-repo">Target repository for updates (optional)</Label>
                      <Input
                        id="github-api-repo"
                        placeholder="neosaastech/neosaas-website"
                        value={githubApiConfig.repo}
                        onChange={(e) => setGithubApiConfig({ ...githubApiConfig, repo: e.target.value })}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        When set, this token is also used by the "Apply update" button (Updates tab) to trigger this repository's deployment.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          if (!githubApiConfig.personalAccessToken) {
                            toast.error("Please enter a Personal Access Token");
                            return;
                          }

                          setSaving(true);
                          try {
                            const response = await fetch('/api/admin/configure-github-api', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                personalAccessToken: githubApiConfig.personalAccessToken,
                                repo: githubApiConfig.repo || undefined,
                              }),
                            });

                            const data = await response.json();

                            if (response.ok) {
                              toast.success("GitHub API Token saved successfully!");
                            } else {
                              toast.error(data.error || "Failed to save token");
                            }
                          } catch (error) {
                            toast.error("Error saving token");
                            console.error("Save error:", error);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving || !githubApiConfig.personalAccessToken}
                        className="flex-1"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save API Token
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!githubApiConfig.personalAccessToken) {
                            toast.error("Please enter a token first");
                            return;
                          }

                          setTestingInModal(true);
                          setModalTestResult(null);

                          try {
                            const response = await fetch('/api/admin/test-github-api', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                personalAccessToken: githubApiConfig.personalAccessToken,
                              }),
                            });

                            const data = await response.json();

                            setModalTestResult({
                              success: response.ok,
                              message: response.ok
                                ? `✅ Token valid! User: ${data.user?.login}`
                                : `❌ ${data.error || 'Invalid token'}`
                            });
                          } catch (error) {
                            setModalTestResult({
                              success: false,
                              message: "❌ Failed to test token"
                            });
                          } finally {
                            setTestingInModal(false);
                          }
                        }}
                        disabled={testingInModal || !githubApiConfig.personalAccessToken}
                      >
                        {testingInModal ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          "Test Token"
                        )}
                      </Button>
                    </div>

                    {modalTestResult && (
                      <div className={`p-3 rounded-lg border ${
                        modalTestResult.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <p className={`text-xs ${
                          modalTestResult.success
                            ? 'text-green-800'
                            : 'text-red-800'
                        }`}>
                          {modalTestResult.message}
                        </p>
                      </div>
                    )}

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs font-semibold text-gray-900 mb-2">
                        📋 How to create a GitHub Personal Access Token:
                      </p>
                      <ol className="text-xs text-gray-700 space-y-1 ml-4 list-decimal">
                        <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Settings → Developer settings → Personal access tokens</a></li>
                        <li>Click "Generate new token (classic)"</li>
                        <li>Select scopes: <code>repo</code>, <code>read:org</code>, <code>read:user</code></li>
                        <li>Copy the token and paste it above</li>
                        <li>Test and save</li>
                      </ol>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 space-y-3">
              <p className="text-xs font-semibold text-green-900 dark:text-green-100">
                📋 OAuth Configuration Guide:
              </p>
              <ol className="text-xs text-green-700 dark:text-green-300 space-y-1 ml-4 list-decimal">
                <li>Click the link to create an OAuth App on GitHub</li>
                <li>Copy the callback URL above (copy button)</li>
                <li>Paste it in the "Authorization callback URL" field on GitHub</li>
                <li>Copy the Client ID and Client Secret here</li>
                <li>Test the configuration</li>
                <li>Enable and save</li>
              </ol>
            </div>
          </div>
        )

      case "google":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID *</Label>
              <Input
                type="text"
                placeholder="123456789012-abc...apps.googleusercontent.com"
                value={googleConfig.clientId}
                onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Found in Google Cloud Console → Credentials
              </p>
            </div>
            <div className="space-y-2">
              <Label>Client Secret *</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? "text" : "password"}
                  placeholder="GOCSPX-..."
                  value={googleConfig.clientSecret}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, clientSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Redirect URI</Label>
              <Input
                type="text"
                placeholder="https://yourdomain.com/api/auth/oauth/google/callback"
                value={googleConfig.redirectUri}
                onChange={(e) => setGoogleConfig({ ...googleConfig, redirectUri: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Must match authorized redirect URIs in Google Console
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <strong>Setup:</strong>{" "}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Create OAuth 2.0 credentials
                </a>
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getServiceInfo = (serviceName: string) => {
    return services.find(s => s.id === serviceName)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">API Management</h1>
          <p className="text-muted-foreground mt-1">Configure and manage your external service integrations</p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-brand hover:bg-[#B8691C]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add API
        </Button>
      </div>

      {/* API List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-brand" />
            Registered API Configurations
          </CardTitle>
          <CardDescription>Manage your external service API keys and credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allConfigs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No API configurations yet. Click "Add API" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allConfigs.map((config) => {
                const serviceInfo = getServiceInfo(config.serviceName)
                const isPayment = serviceInfo?.type === 'payment'
                const isProd = config.environment === 'production'
                const isTest = config.environment === 'test' || config.environment === 'sandbox'
                
                return (
                  <div
                    key={config.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isPayment && isProd
                        ? 'bg-purple-50/50 border-purple-200 hover:bg-purple-50 shadow-xs'
                        : isPayment && isTest
                        ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50 shadow-xs'
                        : 'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {serviceInfo && <ServiceIcon service={serviceInfo} size="lg" />}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">{serviceInfo?.name || config.serviceName}</span>
                          {isPayment && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                              Payment Provider
                            </Badge>
                          )}
                          {/* Environment badge */}
                          {isProd ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-mono text-xs">
                              <Rocket className="h-3 w-3 mr-1" />
                              PRODUCTION
                            </Badge>
                          ) : isTest ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-mono text-xs">
                              <FlaskConical className="h-3 w-3 mr-1" />
                              {config.environment.toUpperCase()}
                            </Badge>
                          ) : config.environment ? (
                            <Badge variant="outline" className="text-gray-500 font-mono text-xs">
                              <ShieldAlert className="h-3 w-3 mr-1" />
                              {config.environment.toUpperCase()}
                            </Badge>
                          ) : null}
                          {config.isActive && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="capitalize">{config.serviceType}</span>
                          {config.metadata && (
                            <>
                              {config.metadata.region && <span>• Region: {config.metadata.region}</span>}
                              {config.metadata.domain && <span>• Domain: {config.metadata.domain}</span>}
                            </>
                          )}
                          {config.lastTestedAt && (
                            <span>• Last tested: {new Date(config.lastTestedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(config)}
                        disabled={testingId === config.id}
                      >
                        {testingId === config.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(config)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(config)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <McpTokensCard />

      {/* Add/Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="max-w-xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-brand" />
              {editingConfig ? "Edit API Configuration" : "Add New API Configuration"}
            </SheetTitle>
            <SheetDescription>
              {editingConfig
                ? "Update the API configuration below"
                : "Configure a new external service integration"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 px-6 py-6">
            <div className="space-y-2">
              <Label>Select Service</Label>
              <Popover open={serviceComboOpen} onOpenChange={setServiceComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={serviceComboOpen}
                    disabled={!!editingConfig}
                    className="w-full h-auto py-3 justify-between shadow-xs font-normal"
                  >
                    {(() => {
                      const current = services.find((s) => s.id === selectedService)
                      if (!current) return "Select a service..."
                      return (
                        <span className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-8 w-8 rounded-md shrink-0 bg-muted">
                            <ServiceIcon service={current} size="sm" />
                          </div>
                          <span className="flex flex-col text-left">
                            <span className="font-medium">{current.name}</span>
                            <span className="text-xs text-muted-foreground">{current.description}</span>
                          </span>
                        </span>
                      )
                    })()}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search a service..." />
                    <CommandList className="max-h-[400px]">
                      <CommandEmpty>No service found.</CommandEmpty>
                      {serviceCategories.map((category) => (
                        <CommandGroup key={category.id} heading={category.label}>
                          {category.services.map((service) => {
                            const bgColor = service.type === 'payment'
                              ? 'bg-purple-100 text-purple-600'
                              : service.type === 'email'
                              ? 'bg-blue-100 text-blue-600'
                              : service.type === 'oauth'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-muted'

                            const badgeColor = service.type === 'payment'
                              ? 'bg-purple-100 text-purple-700'
                              : service.type === 'email'
                              ? 'bg-blue-100 text-blue-700'
                              : service.type === 'oauth'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'

                            return (
                              <CommandItem
                                key={service.id}
                                value={`${service.name} ${service.description} ${service.id}`}
                                onSelect={() => {
                                  setSelectedService(service.id)
                                  setServiceComboOpen(false)
                                }}
                                className="py-2 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`flex items-center justify-center h-10 w-10 rounded-md shrink-0 ${bgColor}`}>
                                    <ServiceIcon service={service} size="md" />
                                  </div>
                                  <div className="flex flex-col text-left flex-1 min-w-0">
                                    <span className="font-medium flex items-center gap-2">
                                      {service.name}
                                      {'isMain' in service && service.isMain && (
                                        <Badge variant="secondary" className={`text-[10px] h-4 px-1 ${badgeColor}`}>
                                          Main
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">{service.description}</span>
                                  </div>
                                  {service.id === selectedService && <Check className="h-4 w-4 shrink-0" />}
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Warning if Stripe is fully configured */}
            {!editingConfig && selectedService === 'stripe' && (() => {
              const stripeConfigs = allConfigs.filter(c => c.serviceName === 'stripe')
              const hasProd = stripeConfigs.some(c => c.environment === 'production')
              const hasTest = stripeConfigs.some(c => c.environment === 'test')
              if (hasProd && hasTest) {
                return (
                  <div className="p-4 border-2 rounded-lg bg-red-50 border-red-300">
                    <p className="text-sm text-red-800 font-semibold">⛔ Stripe is already fully configured (Production + Test).</p>
                    <p className="text-xs text-red-700 mt-1">To change a key, use the <strong>Edit</strong> button on the existing configuration.</p>
                  </div>
                )
              }
              if (hasProd || hasTest) {
                const availableEnv = hasProd ? 'Test' : 'Production'
                return (
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 Stripe {hasProd ? 'Production' : 'Test'} is already configured. You can add the <strong>{availableEnv}</strong> configuration.
                    </p>
                  </div>
                )
              }
              return null
            })()}

            {renderConfigFields()}

            {modalTestResult && (
              <div className={`p-4 rounded-lg border ${modalTestResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {modalTestResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className={modalTestResult.success ? "text-green-800" : "text-red-800"}>
                    {modalTestResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="gap-2 p-6 border-t shrink-0 bg-background">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-h-4">
              {autoSaveState === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              )}
              {autoSaveState === "saved" && (
                <>
                  <Save className="h-3.5 w-3.5 text-green-600" />
                  All changes saved
                </>
              )}
              {autoSaveState === "error" && (
                <span className="text-destructive">Auto-save failed — see error above</span>
              )}
            </div>
            <Button
              className="bg-brand hover:bg-[#B8691C] w-full"
              onClick={handleTestInModal}
              disabled={saving || testingInModal}
            >
              {testingInModal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verify Key
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
