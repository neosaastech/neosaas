"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Eye, EyeOff, Save, RefreshCw, Key, CheckCircle, XCircle, Loader2, Trash2, Plus, AlertCircle, Copy, Check, ChevronDown, Rocket, FlaskConical, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"


// Service categories for organized display
const serviceCategories = [
  {
    id: "payment",
    label: "💳 Paiement",
    description: "Services de facturation et paiement",
    services: [
      { id: "stripe", name: "Stripe", icon: "stripe", type: "payment", description: "Payment Processing", isMain: true },
      { id: "paypal", name: "PayPal", icon: "paypal", type: "payment", description: "Online Payments" },
    ]
  },
  {
    id: "email",
    label: "📧 Email",
    description: "Services d'envoi d'emails transactionnels",
    services: [
      { id: "resend", name: "Resend", icon: "📧", type: "email", description: "Transactional email service" },
      { id: "aws", name: "AWS SES", icon: "☁️", type: "email", description: "Amazon Simple Email Service" },
      { id: "scaleway", name: "Scaleway TEM", icon: "scaleway", type: "email", description: "Transactional Email" },
    ]
  },
  {
    id: "oauth",
    label: "🔐 Authentification OAuth",
    description: "Providers d'authentification sociale",
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
  const sizeClass = size === "sm" ? "h-5 w-5" : size === "md" ? "h-6 w-6" : "h-8 w-8"


  // Stripe - Official logo
  if (service.id === "stripe") {
    return (
      <svg className={sizeClass} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#635BFF"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M14.5 12.6c0-.9.7-1.3 1.9-1.3 1.7 0 3.8.5 5.5 1.4V8.2c-1.8-.7-3.6-1-5.5-1-4.5 0-7.5 2.3-7.5 6.2 0 6.1 8.4 5.1 8.4 7.7 0 1.1-.9 1.4-2.2 1.4-1.9 0-4.3-.8-6.2-1.9v4.6c2.1.9 4.2 1.3 6.2 1.3 4.6 0 7.8-2.3 7.8-6.2 0-6.6-8.4-5.4-8.4-7.7z" fill="white"/>
      </svg>
    )
  }

  // PayPal - Official colors
  if (service.id === "paypal") {
    return (
      <svg className={sizeClass} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#003087"/>
        <path d="M23.2 10.8c-.5 3.3-2.9 4.4-5.8 4.4h-1.5c-.4 0-.7.3-.8.6l-.8 4.8-.2 1.4c0 .2.2.4.4.4h3c.3 0 .6-.2.7-.5l.6-3.8c.1-.3.4-.5.7-.5h.4c2.8 0 5-1.1 5.6-4.4.3-1.4.1-2.5-.5-3.3-.2-.4-.5-.7-.8-1.1z" fill="#009CDE"/>
        <path d="M22.4 10.4c-.2-.1-.4-.1-.6-.2-.2 0-.5-.1-.7-.1h-4.2c-.3 0-.6.2-.7.5l-.9 5.7v.2c.1-.4.4-.6.8-.6h1.5c2.9 0 5.3-1.2 5.8-4.4v-.3c-.2-.4-.5-.6-1-.8z" fill="#012169"/>
        <path d="M11.4 7h5.5c.6 0 1.2 0 1.7.1.2 0 .3 0 .5.1.4.1.8.2 1.1.4.4-2.3 0-3.9-1.3-5.3C17.4.7 15.3 0 12.6 0H6.1c-.4 0-.8.3-.9.7L2.5 18.2c0 .3.2.5.5.5h3.7l.9-5.9 1-6.2c.1-.4.4-.6.8-.6z" fill="#003087"/>
      </svg>
    )
  }

  // Resend - Email service
  if (service.id === "resend") {
    return (
      <svg className={sizeClass} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#000000"/>
        <path d="M8 8h16v16H8V8z" fill="none" stroke="white" strokeWidth="2"/>
        <path d="M8 8l8 8 8-8" fill="none" stroke="white" strokeWidth="2"/>
      </svg>
    )
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

  // Scaleway - Purple logo (based on provided image)
  if (service.id === "scaleway" || service.icon === "scaleway") {
    return (
      <svg className={sizeClass} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="#4F0599"/>
        <path d="M22 8H10c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" fill="none" stroke="white" strokeWidth="2"/>
        <path d="M13 12h6v2h-6v-2zm0 4h6v2h-6v-2z" fill="white"/>
        <circle cx="22" cy="22" r="4" fill="#CBD5E1"/>
      </svg>
    )
  }

  // GitHub - Official
  if (service.id === "github") {
    return (
      <svg className={sizeClass} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    )
  }

  // Google - Official colors
  if (service.id === "google") {
    return (
      <svg className={sizeClass} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    )
  }

  // Facebook - Official blue
  if (service.id === "facebook") {
    return (
      <svg className={sizeClass} fill="#1877F2" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    )
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
  const [environment, setEnvironment] = useState("production")
  const [showKey, setShowKey] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingInModal, setTestingInModal] = useState(false)
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [githubOAuthOpen, setGithubOAuthOpen] = useState(true)
  const [githubApiOpen, setGithubApiOpen] = useState(false)

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
  })

  const [googleConfig, setGoogleConfig] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
  })

  useEffect(() => {
    loadAllConfigs()
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
  }

  const handleTestInModal = async () => {
    setTestingInModal(true)
    setModalTestResult(null)

    try {
      let config: any
      let metadata: any = {}

      switch (selectedService) {
        case "scaleway":
          // Pour TEM, seuls Secret Key et Project ID sont requis
          // Access Key est optionnel (non utilisé par l'API TEM)
          if (!scalewayConfig.secretKey || !scalewayConfig.projectId) {
            throw new Error("Secret Key et Project ID sont requis")
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
            throw new Error("Veuillez remplir la clé API")
          }
          config = { apiKey: resendConfig.apiKey }
          metadata = { domain: resendConfig.domain }
          break
        case "aws":
          if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
            throw new Error("Veuillez remplir tous les champs requis")
          }
          config = awsConfig
          break
        case "stripe":
          if (!stripeConfig.secretKey || !stripeConfig.publicKey) {
            throw new Error("Veuillez remplir les clés API")
          }
          // Validate key/environment consistency
          {
            const isTestSk = stripeConfig.secretKey.startsWith('sk_test_')
            const isTestPk = stripeConfig.publicKey.startsWith('pk_test_')
            const isProd = environment === "production"
            if (isProd && (isTestSk || isTestPk)) {
              throw new Error("Vous êtes en mode Production mais les clés sont des clés test (sk_test_ / pk_test_). Utilisez vos clés live depuis le dashboard Stripe.")
            }
            if (!isProd && (!isTestSk || !isTestPk)) {
              throw new Error("Vous êtes en mode Test mais les clés sont des clés live (sk_live_ / pk_live_). Utilisez vos clés test depuis le dashboard Stripe.")
            }
          }
          config = stripeConfig
          break
        case "paypal":
          if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
            throw new Error("Veuillez remplir les identifiants")
          }
          config = paypalConfig
          break
        case "github":
          if (!githubConfig.clientId) {
            throw new Error("GitHub Personal Access Token est requis")
          }
          // Pour GitHub, on teste juste si le token est valide via l'API GitHub
          const githubTestResponse = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `Bearer ${githubConfig.clientId}`,
              'Accept': 'application/vnd.github+json',
            }
          })
          
          if (!githubTestResponse.ok) {
            throw new Error("Token GitHub invalide ou permissions insuffisantes")
          }
          
          const githubUser = await githubTestResponse.json()
          setModalTestResult({ 
            success: true, 
            message: `Token valide pour l'utilisateur ${githubUser.login}` 
          })
          toast({
            title: "✅ Token GitHub valide",
            description: `Connecté en tant que ${githubUser.login}`,
          })
          setTestingInModal(false)
          return // Sortir car on a déjà géré le test
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
          title: "❌ Clé invalide",
          description: data.message || data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de vérifier la clé"
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

  const handleSave = async () => {
    setSaving(true)

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

          console.log("✅ [Frontend] Configuration successful, closing dialog...")
          
          // If successful, close dialog and show message
          setDialogOpen(false)
          setSaving(false)
          
          toast({
            title: "✅ GitHub OAuth Saved",
            description: githubData.message || "GitHub OAuth credentials have been saved successfully.",
            duration: 3000,
          })
          
          console.log("🔄 [Frontend] Reloading configurations...")
          
          // Reload configs
          await loadAllConfigs()
          resetForm()
          
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
        toast({
          title: "Configuration Saved",
          description: `${currentService?.name} configuration has been saved and encrypted.`,
        })
        setDialogOpen(false)
        resetForm()
        await loadAllConfigs()

      } else {
        throw new Error(data.error || "Failed to save configuration")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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
                    ? "Paiements réels — clés sk_live_ / pk_live_ requises"
                    : "Mode test — clés sk_test_ / pk_test_ requises"}
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
                <p className="text-sm text-red-700 font-medium">⛔ Une configuration Stripe <strong>Production</strong> existe déjà. Modifiez l'existante au lieu d'en créer une nouvelle.</p>
              </div>
            )}
            {!editingConfig && environment === 'test' && !canSaveTest && (
              <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                <p className="text-sm text-red-700 font-medium">⛔ Une configuration Stripe <strong>Test</strong> existe déjà. Modifiez l'existante au lieu d'en créer une nouvelle.</p>
              </div>
            )}

            {/* Warning: key prefix doesn't match environment */}
            {keyEnvMismatch && (
              <div className="p-3 border rounded-lg bg-yellow-50 border-yellow-300">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Les clés saisies sont des clés <strong>{detectedEnv === 'production' ? 'live (production)' : 'test'}</strong>, mais vous êtes en mode <strong>{environment === 'production' ? 'Production' : 'Test'}</strong>. Basculez le toggle ou corrigez vos clés.
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
                <strong>💡 Conseil :</strong> Stripe autorise maximum <strong>2 configurations</strong> — une pour la Production (clés <code>sk_live_</code>) et une pour le Test (clés <code>sk_test_</code>). Le mode actif est piloté depuis <strong>Payment Config</strong> dans l'Overview admin.
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
                          className="flex-shrink-0"
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
                        ? 'bg-purple-50/50 border-purple-200 hover:bg-purple-50 shadow-sm'
                        : isPayment && isTest
                        ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50 shadow-sm'
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
                            Vérification...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Vérifier
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

      {/* Add/Edit Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="max-w-xl overflow-y-auto">
          <SheetHeader>
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

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Select Service</Label>
              <Select
                value={selectedService}
                onValueChange={setSelectedService}
                disabled={!!editingConfig}
              >
                <SelectTrigger className="h-auto py-3 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {serviceCategories.map((category) => (
                    <SelectGroup key={category.id}>
                      <SelectLabel className="flex items-center gap-2 py-2 px-2 text-sm font-semibold text-foreground bg-muted/50 sticky top-0">
                        {category.label}
                      </SelectLabel>
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
                          <SelectItem key={service.id} value={service.id} className="py-2 cursor-pointer pl-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center h-10 w-10 rounded-md shrink-0 ${bgColor}`}>
                                <ServiceIcon service={service} size="md" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="font-medium flex items-center gap-2">
                                  {service.name}
                                  {'isMain' in service && service.isMain && (
                                    <Badge variant="secondary" className={`text-[10px] h-4 px-1 ${badgeColor}`}>
                                      Principal
                                    </Badge>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">{service.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning if Stripe is fully configured */}
            {!editingConfig && selectedService === 'stripe' && (() => {
              const stripeConfigs = allConfigs.filter(c => c.serviceName === 'stripe')
              const hasProd = stripeConfigs.some(c => c.environment === 'production')
              const hasTest = stripeConfigs.some(c => c.environment === 'test')
              if (hasProd && hasTest) {
                return (
                  <div className="p-4 border-2 rounded-lg bg-red-50 border-red-300">
                    <p className="text-sm text-red-800 font-semibold">⛔ Stripe est déjà entièrement configuré (Production + Test).</p>
                    <p className="text-xs text-red-700 mt-1">Pour modifier une clé, utilisez le bouton <strong>Edit</strong> sur la configuration existante.</p>
                  </div>
                )
              }
              if (hasProd || hasTest) {
                const availableEnv = hasProd ? 'Test' : 'Production'
                return (
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 Stripe {hasProd ? 'Production' : 'Test'} existe déjà. Vous pouvez ajouter la configuration <strong>{availableEnv}</strong>.
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

          <SheetFooter className="gap-2 flex-col sm:flex-row mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving || testingInModal}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleTestInModal}
              disabled={saving || testingInModal}
              className="w-full sm:w-auto"
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
            <Button
              className="bg-brand hover:bg-[#B8691C] w-full sm:w-auto"
              onClick={handleSave}
              disabled={saving || testingInModal}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingConfig ? "Update" : "Save"} Configuration
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
