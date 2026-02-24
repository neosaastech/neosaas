"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  SERVICE_BRANDS, 
  ServiceBrandDefinition, 
  ServiceApiDefinition,
  getAllCategories,
  getCategoryLabel,
  getCategoryIcon,
  getServiceBrandsByCategory
} from "@/lib/data/service-brands"
import { Cloud } from "lucide-react"

interface BrandServiceSelectorProps {
  selectedBrandId?: string
  selectedApiId?: string
  onBrandChange?: (brandId: string) => void
  onApiChange?: (apiId: string, brand: ServiceBrandDefinition, api: ServiceApiDefinition) => void
  disabled?: boolean
  showCategoryFilter?: boolean
}

/**
 * Brand Service Selector - Two-step hierarchical selector
 * Step 1: Select Brand (GitHub, Google, Stripe, etc.)
 * Step 2: Select API/Service under that brand
 * 
 * Features:
 * - Full width responsive design
 * - Logo display for brands
 * - Category grouping
 * - Rich preview cards
 */
export function BrandServiceSelector({
  selectedBrandId,
  selectedApiId,
  onBrandChange,
  onApiChange,
  disabled = false,
  showCategoryFilter = true,
}: BrandServiceSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  
  // Get selected brand and API objects
  const selectedBrand = useMemo(() => {
    return SERVICE_BRANDS.find(b => b.id === selectedBrandId)
  }, [selectedBrandId])

  const selectedApi = useMemo(() => {
    if (!selectedBrand) return undefined
    return selectedBrand.apis.find(a => a.id === selectedApiId)
  }, [selectedBrand, selectedApiId])

  // Filter brands by category
  const filteredBrands = useMemo(() => {
    if (selectedCategory === 'all') return SERVICE_BRANDS
    return getServiceBrandsByCategory(selectedCategory as any)
  }, [selectedCategory])

  // Grouped brands by category for select dropdown
  const brandsByCategory = useMemo(() => {
    const grouped: Record<string, ServiceBrandDefinition[]> = {}
    filteredBrands.forEach(brand => {
      if (!grouped[brand.category]) {
        grouped[brand.category] = []
      }
      grouped[brand.category].push(brand)
    })
    return grouped
  }, [filteredBrands])

  const handleBrandChange = (brandId: string) => {
    onBrandChange?.(brandId)
    // Reset API selection when brand changes
    const brand = SERVICE_BRANDS.find(b => b.id === brandId)
    if (brand && brand.apis.length > 0) {
      // Auto-select first API if there's only one
      if (brand.apis.length === 1) {
        onApiChange?.(brand.apis[0].id, brand, brand.apis[0])
      }
    }
  }

  const handleApiChange = (apiId: string) => {
    if (!selectedBrand) return
    const api = selectedBrand.apis.find(a => a.id === apiId)
    if (api) {
      onApiChange?.(apiId, selectedBrand, api)
    }
  }

  const renderBrandLogo = (brand: ServiceBrandDefinition, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
    
    // Special handling for GitHub
    if (brand.slug === 'github') {
      return (
        <svg className={sizeClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    }

    // Special handling for Google
    if (brand.slug === 'google') {
      return (
        <svg className={sizeClass} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )
    }

    // Scaleway custom icon
    if (brand.slug === 'scaleway') {
      return (
        <div className={`flex items-center justify-center rounded bg-purple-600 text-white ${sizeClass}`}>
          <Cloud className="h-3 w-3" />
        </div>
      )
    }

    // Try to load image for others (Stripe, PayPal, etc.)
    if (brand.logoComponent === 'image' && brand.logoUrl) {
      return (
        <div className={`relative ${sizeClass} flex items-center justify-center`}>
          <Image 
            src={brand.logoUrl} 
            alt={brand.name} 
            fill
            className="object-contain"
          />
        </div>
      )
    }

    // Fallback: first letter
    return (
      <div className={`flex items-center justify-center ${sizeClass} bg-muted rounded text-sm font-semibold`}>
        {brand.name.charAt(0)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category Filter (Optional) */}
      {showCategoryFilter && (
        <div className="space-y-2">
          <Label>Filter by Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span>📦</span>
                  <span>All Categories</span>
                </div>
              </SelectItem>
              {getAllCategories().map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    <span>{getCategoryLabel(category)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step 1: Brand Selection */}
      <div className="space-y-2">
        <Label htmlFor="brand-select">
          Select Service Provider / Brand *
        </Label>
        <Select 
          value={selectedBrandId} 
          onValueChange={handleBrandChange}
          disabled={disabled}
        >
          <SelectTrigger id="brand-select" className="w-full h-auto py-3">
            <SelectValue placeholder="Choose a service provider...">
              {selectedBrand && (
                <div className="flex items-center gap-3">
                  {renderBrandLogo(selectedBrand)}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">{selectedBrand.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getCategoryLabel(selectedBrand.category)}
                    </span>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {Object.entries(brandsByCategory).map(([category, brands]) => (
              <SelectGroup key={category}>
                <SelectLabel className="flex items-center gap-2 text-xs font-semibold">
                  <span>{getCategoryIcon(category as any)}</span>
                  <span>{getCategoryLabel(category as any)}</span>
                </SelectLabel>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id} className="py-3 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {renderBrandLogo(brand)}
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{brand.name}</span>
                          {brand.category === 'payment' && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700">
                              Payment
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {brand.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: API Selection (only shown when brand is selected) */}
      {selectedBrand && selectedBrand.apis.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="api-select">
            Select API / Service Type *
            <span className="text-xs text-muted-foreground ml-2">
              ({selectedBrand.apis.length} available)
            </span>
          </Label>
          <Select 
            value={selectedApiId} 
            onValueChange={handleApiChange}
            disabled={disabled}
          >
            <SelectTrigger id="api-select" className="w-full h-auto py-3">
              <SelectValue placeholder="Choose an API...">
                {selectedApi && (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {selectedApi.apiType.toUpperCase()}
                    </Badge>
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{selectedApi.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedApi.description}
                      </span>
                    </div>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectedBrand.apis.map(api => (
                <SelectItem key={api.id} value={api.id} className="py-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {api.apiType.toUpperCase()}
                    </Badge>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{api.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {api.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Preview Card - Shows detailed info when both are selected */}
      {selectedBrand && selectedApi && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {renderBrandLogo(selectedBrand, 'md')}
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="font-semibold text-sm">
                  {selectedBrand.name} → {selectedApi.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedApi.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(selectedBrand.category)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedApi.apiType}
                </Badge>
                {selectedApi.testable && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    ✓ Testable
                  </Badge>
                )}
              </div>

              {selectedApi.documentationUrl && (
                <a
                  href={selectedApi.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  📚 View Documentation →
                </a>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
