"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  SERVICE_BRANDS,
  ServiceBrandDefinition,
  ServiceApiDefinition,
  getAllCategories,
  getCategoryLabel,
  getCategoryIcon,
} from "@/lib/data/service-brands"
import { 
  RefreshCw, 
  Trash2, 
  Edit, 
  Loader2, 
  Search, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Cloud,
  ExternalLink,
  FlaskConical,
  Rocket,
  ShieldAlert
} from "lucide-react"

export interface ServiceApiConfigRow {
  id: string
  brandId: string
  brandName: string
  brandSlug: string
  apiId: string
  apiName: string
  apiType: string
  environment: string
  isActive: boolean
  isDefault: boolean
  lastTestedAt?: string
  lastTestStatus?: 'success' | 'failed' | 'pending'
  lastTestMessage?: string
  metadata?: any
}

interface ServiceApiTableProps {
  configs: ServiceApiConfigRow[]
  loading?: boolean
  onTest?: (config: ServiceApiConfigRow) => void
  onEdit?: (config: ServiceApiConfigRow) => void
  onDelete?: (config: ServiceApiConfigRow) => void
  testingId?: string | null
}

/**
 * Service API Table - Display all configured APIs with filtering and sorting
 * 
 * Features:
 * - Filter by brand, category, environment
 * - Search by name
 * - Sort by multiple criteria
 * - Responsive design
 * - Action buttons (Test, Edit, Delete)
 */
export function ServiceApiTable({
  configs,
  loading = false,
  onTest,
  onEdit,
  onDelete,
  testingId,
}: ServiceApiTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [selectedBrand, setSelectedBrand] = useState<string | 'all'>('all')
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | 'all'>('all')
  const [sortBy, setSortBy] = useState<'brand' | 'api' | 'recent'>('brand')

  // Get unique environments from configs
  const environments = useMemo(() => {
    const envs = new Set(configs.map(c => c.environment))
    return Array.from(envs).sort()
  }, [configs])

  // Get unique brands actually in use
  const brandsInUse = useMemo(() => {
    const brandIds = new Set(configs.map(c => c.brandId))
    return SERVICE_BRANDS.filter(b => brandIds.has(b.id))
  }, [configs])

  // Filtered and sorted configs
  const filteredConfigs = useMemo(() => {
    let filtered = configs

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.brandName.toLowerCase().includes(term) ||
        c.apiName.toLowerCase().includes(term) ||
        c.apiType.toLowerCase().includes(term)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => {
        const brand = SERVICE_BRANDS.find(b => b.id === c.brandId)
        return brand?.category === selectedCategory
      })
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(c => c.brandId === selectedBrand)
    }

    // Environment filter
    if (selectedEnvironment !== 'all') {
      filtered = filtered.filter(c => c.environment === selectedEnvironment)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'brand') {
        return a.brandName.localeCompare(b.brandName)
      } else if (sortBy === 'api') {
        return a.apiName.localeCompare(b.apiName)
      } else if (sortBy === 'recent') {
        const aDate = a.lastTestedAt ? new Date(a.lastTestedAt).getTime() : 0
        const bDate = b.lastTestedAt ? new Date(b.lastTestedAt).getTime() : 0
        return bDate - aDate
      }
      return 0
    })

    return filtered
  }, [configs, searchTerm, selectedCategory, selectedBrand, selectedEnvironment, sortBy])

  const renderBrandLogo = (config: ServiceApiConfigRow) => {
    const brand = SERVICE_BRANDS.find(b => b.id === config.brandId)
    if (!brand) return null

    // GitHub
    if (brand.slug === 'github') {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    }

    // Google
    if (brand.slug === 'google') {
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )
    }

    // Scaleway
    if (brand.slug === 'scaleway') {
      return (
        <div className="flex items-center justify-center h-5 w-5 rounded bg-purple-600 text-white">
          <Cloud className="h-3 w-3" />
        </div>
      )
    }

    // Image logos (Stripe, PayPal, etc.)
    if (brand.logoComponent === 'image' && brand.logoUrl) {
      return (
        <div className="relative h-5 w-5 flex items-center justify-center">
          <Image 
            src={brand.logoUrl} 
            alt={brand.name} 
            width={20}
            height={20}
            className="object-contain"
          />
        </div>
      )
    }

    // Fallback
    return (
      <div className="flex items-center justify-center h-5 w-5 bg-muted rounded text-xs font-semibold">
        {brand.name.charAt(0)}
      </div>
    )
  }

  const getStatusIcon = (status?: 'success' | 'failed' | 'pending') => {
    if (!status) return <AlertCircle className="h-4 w-4 text-gray-400" />
    
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (configs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No API configurations found.<br />
            Click "Add API" to create your first configuration.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by brand or API name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getAllCategories().map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand Filter */}
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brandsInUse.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Environment Filter */}
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger>
                <SelectValue placeholder="All Environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                {environments.map(env => (
                  <SelectItem key={env} value={env}>
                    <span className="flex items-center gap-1.5">
                      {env === 'production' ? (
                        <Rocket className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <FlaskConical className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort & Results Count */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {filteredConfigs.length} of {configs.length} configurations
            </p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Sort by Brand</SelectItem>
                <SelectItem value="api">Sort by API Name</SelectItem>
                <SelectItem value="recent">Sort by Recent Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Logo</TableHead>
              <TableHead>Brand / Service</TableHead>
              <TableHead>API Type</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Test</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConfigs.map((config) => {
              const brand = SERVICE_BRANDS.find(b => b.id === config.brandId)
              const isPayment = brand?.category === 'payment'
              const isTestOrSandbox = config.environment === 'test' || config.environment === 'sandbox'
              
              return (
                <TableRow 
                  key={config.id}
                  className={
                    isTestOrSandbox
                      ? 'bg-amber-50/30 dark:bg-amber-950/10'
                      : isPayment
                        ? 'bg-purple-50/30 dark:bg-purple-950/10'
                        : undefined
                  }
                >
                  {/* Logo */}
                  <TableCell>
                    {renderBrandLogo(config)}
                  </TableCell>

                  {/* Brand / Service */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{config.brandName}</span>
                        {isPayment && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700">
                            Payment
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{config.apiName}</p>
                    </div>
                  </TableCell>

                  {/* API Type */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {config.apiType.toUpperCase()}
                    </Badge>
                  </TableCell>

                  {/* Environment */}
                  <TableCell>
                    {config.environment === 'production' ? (
                      <Badge 
                        variant="outline"
                        className="text-xs font-mono border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                      >
                        <Rocket className="h-3 w-3 mr-1" />
                        PROD
                      </Badge>
                    ) : config.environment === 'test' || config.environment === 'sandbox' ? (
                      <Badge 
                        variant="outline"
                        className="text-xs font-mono border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                      >
                        <FlaskConical className="h-3 w-3 mr-1" />
                        {config.environment.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline"
                        className="text-xs font-mono border-gray-400/50 text-gray-500"
                      >
                        <ShieldAlert className="h-3 w-3 mr-1" />
                        {config.environment.toUpperCase()}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {config.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Last Test */}
                  <TableCell>
                    {config.lastTestedAt ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(config.lastTestStatus)}
                        <div className="text-xs">
                          <div className="text-muted-foreground">
                            {new Date(config.lastTestedAt).toLocaleDateString()}
                          </div>
                          {config.lastTestMessage && (
                            <div className="text-muted-foreground truncate max-w-[150px]">
                              {config.lastTestMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not tested</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onTest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTest(config)}
                          disabled={testingId === config.id}
                        >
                          {testingId === config.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(config)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(config)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
