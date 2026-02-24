"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { deleteProduct, upsertProduct } from "@/app/actions/ecommerce"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MoreHorizontal, 
  Trash, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Calendar,
  Eye,
  EyeOff,
  ChevronRight,
  Pencil,
  Info,
  Plus,
  Check,
  Sparkles,
  Download,
  FileUp,
  Repeat,
  Clock,
  CreditCard
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Link from "next/link"
import * as Icons from "lucide-react"
import Image from "next/image"
import { StatusBadge } from "@/components/ui/status-badge"
import { getProductTypeConfig } from "@/lib/status-configs"

interface VatRate {
  id: string
  name: string
  rate: number
}

interface Product {
  id: string
  title: string
  description?: string | null
  price: number
  hourlyRate?: number | null
  currency?: string
  isPublished: boolean
  isFeatured?: boolean
  type: string | null
  icon: string | null
  imageUrl: string | null
  vatRateId: string | null
  createdAt: Date
  updatedAt: Date
  salesCount?: number
  // Payment type fields v5.0
  paymentType?: string | null
  subscriptionPriceWeekly?: number | null
  subscriptionPriceMonthly?: number | null
  subscriptionPriceYearly?: number | null
}

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  currency: string | null
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageCount: number
  perUserLimit: number | null
  startDate: Date | null
  endDate: Date | null
  applicableProducts: any
  excludedProducts: any
  isActive: boolean
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

interface ProductsTableProps {
  products: Product[]
  vatRates: VatRate[]
  coupons: Coupon[]
  currency?: string
  sortField?: string | null
  sortDirection?: 'asc' | 'desc'
  onSort?: (field: string) => void
  onSelectionChange?: (count: number) => void
  onOpenVatDialog?: () => void
  visibleColumns?: {
    id: boolean
    createdAt: boolean
    updatedAt: boolean
    salesCount: boolean
    visual: boolean
    title: boolean
    type: boolean
    paymentType: boolean
    price: boolean
    vat: boolean
    status: boolean
  }
}

export interface ProductsTableHandle {
  openNewProduct: () => void
  getSelectedProducts: () => string[]
  exportSelectedProducts: () => void
  bulkUpdateField: (field: string, value: any) => Promise<void>
  bulkDelete: () => Promise<void>
}

const AVAILABLE_ICONS = [
  "ShoppingBag", "Package", "Zap", "Shield", "Globe", "Server", "Calendar", "FileDigit", "CreditCard", "User", "Briefcase", "Database"
]

// Taux de change (approximatifs, à mettre à jour régulièrement ou via API)
const EXCHANGE_RATES = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86
}

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£'
}

export const ProductsTable = forwardRef<ProductsTableHandle, ProductsTableProps>(({ products, vatRates, coupons, currency = 'EUR', sortField, sortDirection, onSort, onSelectionChange, onOpenVatDialog, visibleColumns }, ref) => {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [detailsProductId, setDetailsProductId] = useState<string | null>(null)
  const [isEditingInPanel, setIsEditingInPanel] = useState(false)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const csvImportInputRef = useRef<HTMLInputElement | null>(null)
  const [editValues, setEditValues] = useState<{
    title: string;
    subtitle: string;
    description: string;
    price: string;
    hourlyRate: string;
    currency: string;
    type: string;
    vatRateId: string;
    isPublished: boolean;
    isFeatured: boolean;
    icon: string;
    focusAreas: string;
    deliverables: string;
    upsellProductId: string | null;
    // Digital product fields
    downloadUrl: string;
    licenseKey: string;
    autoGenerateLicense: boolean;
    licenseInstructions: string;
    // Payment type fields v5.0
    paymentType: string;
    recurrenceType: '' | 'weekly' | 'monthly' | 'yearly';
    subscriptionPriceWeekly: string;
    subscriptionPriceMonthly: string;
    subscriptionPriceYearly: string;
  }>({
    title: '',
    subtitle: '',
    description: '',
    price: '',
    hourlyRate: '',
    currency: 'EUR',
    type: 'digital',
    vatRateId: '',
    isPublished: false,
    isFeatured: false,
    icon: 'ShoppingBag',
    focusAreas: '',
    deliverables: '',
    upsellProductId: null,
    // Digital product defaults
    downloadUrl: '',
    licenseKey: '',
    autoGenerateLicense: true,
    licenseInstructions: '',
    // Payment type defaults
    paymentType: 'one_time',
    recurrenceType: '',
    subscriptionPriceWeekly: '',
    subscriptionPriceMonthly: '',
    subscriptionPriceYearly: ''
  })
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  
  const detailsProduct = products.find(p => p.id === detailsProductId)
  
  // Fonction de conversion de prix
  const convertPrice = (priceInCents: number, targetCurrency: string = currency) => {
    const priceInEur = priceInCents / 100
    const rate = EXCHANGE_RATES[targetCurrency as keyof typeof EXCHANGE_RATES] || 1
    const convertedPrice = priceInEur * rate
    const symbol = CURRENCY_SYMBOLS[targetCurrency as keyof typeof CURRENCY_SYMBOLS] || '€'
    return { price: convertedPrice, symbol }
  }

  // Fonction pour générer les en-têtes de colonnes cliquables
  const SortableHeader = ({ field, children, className = "" }: { field: string, children: React.ReactNode, className?: string }) => {
    const isSorted = sortField === field
    return (
      <TableHead 
        className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
        onClick={() => onSort?.(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isSorted && (
            <span className="ml-1">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </TableHead>
    )
  }
  
  // Initialiser les valeurs d'édition quand le produit change
  useEffect(() => {
    if (detailsProduct) {
      // Extraire focusAreas et deliverables depuis features
      let focusAreasText = ''
      let deliverablesText = ''
      
      if (detailsProduct.features) {
        if (typeof detailsProduct.features === 'object' && !Array.isArray(detailsProduct.features)) {
          const features = detailsProduct.features as { focusAreas?: string[], deliverables?: string[] }
          focusAreasText = (features.focusAreas || []).join('\n')
          deliverablesText = (features.deliverables || []).join('\n')
        }
      }
      
      setEditValues({
        title: detailsProduct.title,
        subtitle: (detailsProduct as any).subtitle || '',
        description: detailsProduct.description || '',
        price: (detailsProduct.price / 100).toFixed(2),
        hourlyRate: detailsProduct.hourlyRate ? (detailsProduct.hourlyRate / 100).toFixed(2) : '',
        currency: detailsProduct.currency || 'EUR',
        type: detailsProduct.type || 'digital',
        vatRateId: detailsProduct.vatRateId || '',
        isPublished: detailsProduct.isPublished,
        isFeatured: detailsProduct.isFeatured || false,
        icon: detailsProduct.icon || 'ShoppingBag',
        focusAreas: focusAreasText,
        deliverables: deliverablesText,
        upsellProductId: (detailsProduct as any).upsellProductId || null,
        // Digital product fields
        downloadUrl: (detailsProduct as any).downloadUrl || '',
        licenseKey: (detailsProduct as any).licenseKey || '',
        autoGenerateLicense: !(detailsProduct as any).licenseKey, // Auto if no custom key exists
        licenseInstructions: (detailsProduct as any).licenseInstructions || '',
        // Payment type fields v5.0
        paymentType: detailsProduct.paymentType || 'one_time',
        recurrenceType: detailsProduct.subscriptionPriceWeekly
          ? 'weekly'
          : detailsProduct.subscriptionPriceMonthly
            ? 'monthly'
            : detailsProduct.subscriptionPriceYearly
              ? 'yearly'
              : '',
        subscriptionPriceWeekly: detailsProduct.subscriptionPriceWeekly ? (detailsProduct.subscriptionPriceWeekly / 100).toFixed(2) : '',
        subscriptionPriceMonthly: detailsProduct.subscriptionPriceMonthly ? (detailsProduct.subscriptionPriceMonthly / 100).toFixed(2) : '',
        subscriptionPriceYearly: detailsProduct.subscriptionPriceYearly ? (detailsProduct.subscriptionPriceYearly / 100).toFixed(2) : ''
      })
      setIsEditingInPanel(false)
      setIsNewProduct(false)
      setImagePreview(detailsProduct.imageUrl)
      setPendingImageFile(null)
    }
  }, [detailsProduct])

  const handleOpenNewProduct = () => {
    setEditValues({
      title: '',
      subtitle: '',
      description: '',
      price: '0.00',
      hourlyRate: '',
      currency: 'EUR',
      type: 'digital',
      vatRateId: vatRates[0]?.id || '',
      isPublished: false,
      isFeatured: false,
      icon: 'ShoppingBag',
      focusAreas: '',
      deliverables: '',
      upsellProductId: null,
      // Digital product defaults
      downloadUrl: '',
      licenseKey: '',
      autoGenerateLicense: true,
      licenseInstructions: '',
      // Payment type defaults
      paymentType: 'one_time',
      recurrenceType: '',
      subscriptionPriceWeekly: '',
      subscriptionPriceMonthly: '',
      subscriptionPriceYearly: ''
    })
    setIsNewProduct(true)
    setIsEditingInPanel(true)
    setDetailsProductId('new')
    setImagePreview(null)
    setPendingImageFile(null)
  }
  
  // Exposer la méthode openNewProduct via ref
  useImperativeHandle(ref, () => ({
    openNewProduct: handleOpenNewProduct,
    getSelectedProducts: () => Array.from(selectedProductIds),
    exportSelectedProducts: handleExportCSV,
    bulkUpdateField: handleBulkUpdateField,
    bulkDelete: handleBulkDelete
  }))

  // Fonction de modification groupée
  const handleBulkUpdateField = async (field: string, value: any) => {
    if (selectedProductIds.size === 0) {
      toast.error("No products selected")
      return
    }

    const productIds = Array.from(selectedProductIds)
    console.log(`[ProductsTable] Bulk updating ${field} to ${value} for ${productIds.length} products`)
    
    let successCount = 0
    let errorCount = 0

    for (const productId of productIds) {
      try {
        const result = await upsertProduct({
          id: productId,
          [field]: value
        })
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`[ProductsTable] Bulk update error for ${productId}:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} product(s) updated successfully${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`)
      setSelectedProductIds(new Set())
      router.refresh()
    } else {
      toast.error(`Failed to update products: ${errorCount} error(s)`)
    }
  }

  // Fonction de suppression groupée
  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) {
      toast.error("No products selected")
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedProductIds.size} product(s)? This action cannot be undone.`)) {
      return
    }

    const productIds = Array.from(selectedProductIds)
    console.log(`[ProductsTable] Bulk deleting ${productIds.length} products`)
    
    let successCount = 0
    let errorCount = 0

    for (const productId of productIds) {
      try {
        const result = await deleteProduct(productId)
        
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`[ProductsTable] Bulk delete error for ${productId}:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} product(s) deleted successfully${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`)
      setSelectedProductIds(new Set())
      router.refresh()
    } else {
      toast.error(`Failed to delete products: ${errorCount} error(s)`)
    }
  }

  // Gestion de la sélection
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProductIds)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProductIds(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set())
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)))
    }
  }

  // Notifier le parent du changement de sélection
  useEffect(() => {
    onSelectionChange?.(selectedProductIds.size)
  }, [selectedProductIds.size, onSelectionChange])

  // Export CSV
  const handleExportCSV = () => {
    const productsToExport = selectedProductIds.size > 0 
      ? products.filter(p => selectedProductIds.has(p.id))
      : products

    if (productsToExport.length === 0) {
      toast.error("No products to export")
      return
    }

    // Créer le CSV
    const headers = ["ID", "Title", "Description", "Price HT (EUR)", "Type", "VAT Rate ID", "Published", "Icon", "Image URL", "Sales Count", "Created At", "Updated At"]
    const rows = productsToExport.map(p => [
      p.id,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      Math.round(p.price / 100),
      p.type || '',
      p.vatRateId || '',
      p.isPublished ? 'true' : 'false',
      p.icon || '',
      p.imageUrl || '',
      p.salesCount || 0,
      new Date(p.createdAt).toISOString(),
      new Date(p.updatedAt).toISOString()
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success(`${productsToExport.length} product(s) exported`)
  }

  // Import CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      if (lines.length < 2) {
        toast.error("CSV file is empty")
        return
      }

      // Parser le CSV (simple parser, peut être amélioré)
      const headers = lines[0].split(',')
      const dataLines = lines.slice(1).filter(line => line.trim())
      
      let imported = 0
      let errors = 0

      for (const line of dataLines) {
        try {
          // Parser la ligne en tenant compte des champs entre guillemets
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || []
          
          if (values.length < 7) continue

          const productData = {
            id: values[0] !== 'new' ? values[0] : undefined,
            title: values[1],
            description: values[2] || null,
            price: Math.round(parseFloat(values[3]) * 100),
            type: values[4] || 'digital',
            vatRateId: values[5] || null,
            isPublished: values[6] === 'true',
            icon: values[7] || 'ShoppingBag',
            imageUrl: values[8] || null
          }

          const result = await upsertProduct(productData)
          if (result.success) {
            imported++
          } else {
            errors++
          }
        } catch (err) {
          errors++
        }
      }

      if (imported > 0) {
        toast.success(`${imported} product(s) imported successfully${errors > 0 ? `, ${errors} error(s)` : ''}`)
        router.refresh()
      } else {
        toast.error(`Import failed: ${errors} error(s)`)
      }
    } catch (error) {
      console.error('[ProductsTable] Import error:', error)
      toast.error("Failed to import CSV file")
    }

    // Reset l'input
    if (csvImportInputRef.current) {
      csvImportInputRef.current.value = ''
    }
  }

  const getVatRateDisplay = (vatRateId: string | null) => {
    if (!vatRateId) return "No VAT"
    const rate = vatRates.find(r => r.id === vatRateId)
    return rate ? `${(rate.rate / 100).toFixed(2)}%` : "Unknown"
  }

  const getProductTypeDisplay = (type: string | null) => {
    if (!type) return {
      label: "Undefined",
      icon: Package,
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-700 hover:bg-gray-100"
    }

    switch (type) {
      case "physical":
        return {
          label: "Physical",
          icon: Package,
          variant: "default" as const,
          className: "bg-orange-100 text-orange-700 hover:bg-orange-100"
        }
      case "digital":
        return {
          label: "Digital",
          icon: Icons.Rocket,
          variant: "default" as const,
          className: "bg-blue-100 text-blue-700 hover:bg-blue-100"
        }
      // Legacy types support (for backward compatibility)
      case "standard":
        return {
          label: "Standard (Legacy)",
          icon: Package,
          variant: "default" as const,
          className: "bg-green-100 text-green-700 hover:bg-green-100"
        }
      case "free":
        return {
          label: "Free (Legacy)",
          icon: Icons.Download,
          variant: "default" as const,
          className: "bg-amber-100 text-amber-700 hover:bg-amber-100"
        }
      case "consulting":
        return {
          label: "Consulting (Legacy)",
          icon: Calendar,
          variant: "default" as const,
          className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
        }
      default:
        return {
          label: type,
          icon: Package,
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-700 hover:bg-gray-100"
        }
    }
  }

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `-${coupon.discountValue}%`
    }

    const currency = coupon.currency || 'EUR'
    const amount = (coupon.discountValue / 100).toFixed(2)
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency

    if (symbol === '€') {
      return `-${amount}€`
    }

    return `-${symbol}${amount}`
  }

  const isCouponActive = (coupon: Coupon) => {
    if (!coupon.isActive) return false
    const now = new Date()
    if (coupon.startDate && new Date(coupon.startDate) > now) return false
    if (coupon.endDate && new Date(coupon.endDate) < now) return false
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false
    return true
  }

  const getProductCoupons = (productId: string) => {
    return coupons.filter((coupon) => {
      const appliesToAll = !coupon.applicableProducts
      const applicableIds = (coupon.applicableProducts as string[]) || []
      return appliesToAll || applicableIds.includes(productId)
    })
  }

  const getPromoTooltip = (productId: string) => {
    const activeCoupons = getProductCoupons(productId).filter(isCouponActive)
    if (activeCoupons.length === 0) return ""

    const entries = activeCoupons.map((coupon) => {
      return `${coupon.code}: ${formatCouponValue(coupon)}`
    })

    const shown = entries.slice(0, 3)
    const suffix = entries.length > 3 ? ` (+${entries.length - 3} more)` : ""
    return `${shown.join(" | ")}${suffix}`
  }

  const handleDelete = async () => {
    if (!deleteId) return
    console.log('[ProductsTable] handleDelete - Starting deletion for product:', deleteId)
    setIsDeleting(true)
    try {
      const result = await deleteProduct(deleteId)
      console.log('[ProductsTable] handleDelete - Result:', result)
      if (result.success) {
        toast.success("Product deleted successfully")
        console.log('[ProductsTable] handleDelete - Product deleted, refreshing...')
        router.refresh()
      } else {
        console.error('[ProductsTable] handleDelete - Failed:', result.error)
        toast.error(result.error || "Failed to delete product")
      }
    } catch (error) {
      console.error('[ProductsTable] handleDelete - Exception:', error)
      toast.error("An error occurred")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const updateField = async (id: string, field: string, value: any) => {
    console.log('[ProductsTable] updateField - Field:', field, 'Value:', value, 'Product ID:', id)
    try {
      const result = await upsertProduct({
        id,
        [field]: value
      })
      console.log('[ProductsTable] updateField - Result:', result)
      
      if (result.success) {
        toast.success(`${field} updated`)
        setEditingCell(null)
        console.log('[ProductsTable] updateField - Refreshing router...')
        router.refresh()
      } else {
        console.error('[ProductsTable] updateField - Failed:', result.error)
        toast.error(result.error || "Failed to update")
      }
    } catch (error) {
      console.error('[ProductsTable] updateField - Exception:', error)
      toast.error("An error occurred")
    }
  }

  const handleImageUpload = async (productId: string, file: File) => {
    console.log('[ProductsTable] handleImageUpload - Product:', productId, 'File:', file.name, 'Size:', file.size)
    const formData = new FormData()
    formData.append("image", file)
    formData.append("productId", productId)

    try {
      const response = await fetch("/api/products/image", {
        method: "POST",
        body: formData
      })
      console.log('[ProductsTable] handleImageUpload - Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[ProductsTable] handleImageUpload - Success:', data)
        toast.success("Image uploaded")
        router.refresh()
      } else {
        const errorText = await response.text()
        console.error('[ProductsTable] handleImageUpload - Failed:', errorText)
        toast.error("Failed to upload image")
      }
    } catch (error) {
      console.error('[ProductsTable] handleImageUpload - Exception:', error)
      toast.error("Upload error")
    }
  }

  const removeImage = async (productId: string) => {
    await updateField(productId, "imageUrl", null)
  }
  
  const handleImageUploadInPanel = async (file: File) => {
    console.log('[ProductsTable] handleImageUploadInPanel - File:', file.name, 'Size:', file.size, 'isNewProduct:', isNewProduct)
    
    // Pour les nouveaux produits, stocker l'image temporairement
    if (isNewProduct) {
      setPendingImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      toast.success("Image ready for upload (will be saved with product)")
      return
    }

    // Pour les produits existants, uploader immédiatement
    if (detailsProduct) {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("productId", detailsProduct.id)

      try {
        const response = await fetch("/api/products/image", {
          method: "POST",
          body: formData
        })
        console.log('[ProductsTable] handleImageUploadInPanel - Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('[ProductsTable] handleImageUploadInPanel - Success:', data)
          setImagePreview(data.imageUrl)
          toast.success("Image uploaded")
          router.refresh()
        } else {
          const errorText = await response.text()
          console.error('[ProductsTable] handleImageUploadInPanel - Failed:', errorText)
          toast.error("Failed to upload image")
        }
      } catch (error) {
        console.error('[ProductsTable] handleImageUploadInPanel - Exception:', error)
        toast.error("Upload error")
      }
    }
  }

  const removeImageInPanel = async () => {
    console.log('[ProductsTable] removeImageInPanel - isNewProduct:', isNewProduct)
    
    if (isNewProduct) {
      // Pour les nouveaux produits, juste effacer la preview
      setImagePreview(null)
      setPendingImageFile(null)
      toast.success("Image removed")
      return
    }

    // Pour les produits existants, supprimer de la DB
    if (detailsProduct) {
      try {
        const result = await upsertProduct({
          id: detailsProduct.id,
          imageUrl: null
        })

        if (result.success) {
          setImagePreview(null)
          setPendingImageFile(null)
          toast.success("Image removed")
          router.refresh()
        } else {
          toast.error("Failed to remove image")
        }
      } catch (error) {
        console.error('[ProductsTable] removeImageInPanel - Exception:', error)
        toast.error("Failed to remove image")
      }
    }
  }

  const handleSaveFromPanel = async () => {
    console.log('[ProductsTable] handleSaveFromPanel - Starting save', { isNewProduct, editValues })
    
    // Validation
    if (!editValues.title.trim()) {
      console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: Title is empty')
      toast.error("Title is required")
      return
    }
    
    // Valider qu'au moins un prix (de base ou horaire) est défini
    const hasBasePrice = editValues.price && parseFloat(editValues.price) >= 0
    const hasHourlyRate = editValues.hourlyRate && parseFloat(editValues.hourlyRate) > 0
    
    if (!hasBasePrice && !hasHourlyRate) {
      console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: No pricing defined')
      toast.error("At least one pricing option (base price or hourly rate) is required")
      return
    }
    
    if (editValues.price && parseFloat(editValues.price) < 0) {
      console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: Invalid price:', editValues.price)
      toast.error("Price must be 0 or greater")
      return
    }

    if (editValues.paymentType === 'subscription' && !editValues.recurrenceType) {
      console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: Recurrence type is missing')
      toast.error("Please select a recurrence period for subscriptions")
      return
    }
    
    try {
      const priceInCents = Math.round(parseFloat(editValues.price) * 100)
      const hourlyRateInCents = editValues.hourlyRate ? Math.round(parseFloat(editValues.hourlyRate) * 100) : null
      console.log('[ProductsTable] handleSaveFromPanel - Price conversion:', editValues.price, editValues.currency, '=', priceInCents, 'cents')
      
      // Préparer les features
      const focusAreas = editValues.focusAreas.split('\n').filter(s => s.trim() !== '')
      const deliverables = editValues.deliverables.split('\n').filter(s => s.trim() !== '')
      
      const productData: any = {
        title: editValues.title.trim(),
        subtitle: editValues.subtitle.trim() || null,
        description: editValues.description.trim() || null,
        price: priceInCents,
        hourlyRate: hourlyRateInCents,
        currency: editValues.currency,
        type: editValues.type,
        vatRateId: editValues.vatRateId || null,
        isPublished: editValues.isPublished,
        isFeatured: editValues.isFeatured,
        icon: editValues.icon,
        upsellProductId: editValues.upsellProductId || null,
        features: {
          focusAreas,
          deliverables
        },
        // Digital product fields (only relevant when type is 'digital')
        downloadUrl: editValues.type === 'digital' ? (editValues.downloadUrl.trim() || null) : null,
        licenseKey: editValues.type === 'digital' && !editValues.autoGenerateLicense ? (editValues.licenseKey.trim() || null) : null,
        licenseInstructions: editValues.type === 'digital' ? (editValues.licenseInstructions.trim() || null) : null,
        // Payment type fields v5.0
        paymentType: editValues.type === 'digital' ? editValues.paymentType : 'one_time',
        subscriptionPriceWeekly: editValues.paymentType === 'subscription' && editValues.recurrenceType === 'weekly' ? priceInCents : null,
        subscriptionPriceMonthly: editValues.paymentType === 'subscription' && editValues.recurrenceType === 'monthly' ? priceInCents : null,
        subscriptionPriceYearly: editValues.paymentType === 'subscription' && editValues.recurrenceType === 'yearly' ? priceInCents : null
      }
      
      // Si c'est une modification, ajouter l'id
      if (!isNewProduct && detailsProduct) {
        productData.id = detailsProduct.id
        console.log('[ProductsTable] handleSaveFromPanel - Update mode, Product ID:', detailsProduct.id)
      } else {
        console.log('[ProductsTable] handleSaveFromPanel - Create mode')
      }
      
      console.log('[ProductsTable] handleSaveFromPanel - Product data to save:', productData)
      const result = await upsertProduct(productData)
      console.log('[ProductsTable] handleSaveFromPanel - Result:', result)
      
      if (result.success) {
        // Si c'est un nouveau produit et qu'on a une image en attente, l'uploader maintenant
        if (isNewProduct && pendingImageFile && result.data?.id) {
          console.log('[ProductsTable] handleSaveFromPanel - Uploading pending image for new product:', result.data.id)
          const imgFormData = new FormData()
          imgFormData.append("image", pendingImageFile)
          imgFormData.append("productId", result.data.id)

          try {
            const imgResponse = await fetch("/api/products/image", {
              method: "POST",
              body: imgFormData
            })
            
            if (!imgResponse.ok) {
              console.error('[ProductsTable] handleSaveFromPanel - Image upload failed')
              toast.warning("Product created but image upload failed")
            } else {
              console.log('[ProductsTable] handleSaveFromPanel - Image uploaded successfully')
            }
          } catch (error) {
            console.error('[ProductsTable] handleSaveFromPanel - Image upload exception:', error)
            toast.warning("Product created but image upload failed")
          }
        }
        
        toast.success(isNewProduct ? "Product created successfully" : "Product updated successfully")
        console.log('[ProductsTable] handleSaveFromPanel - Success, closing panel and refreshing')
        setIsEditingInPanel(false)
        setDetailsProductId(null)
        setIsNewProduct(false)
        setImagePreview(null)
        setPendingImageFile(null)
        router.refresh()
      } else {
        console.error('[ProductsTable] handleSaveFromPanel - Failed:', result.error)
        toast.error(result.error || (isNewProduct ? "Failed to create product" : "Failed to update product"))
      }
    } catch (error) {
      console.error('[ProductsTable] handleSaveFromPanel - Exception:', error)
      toast.error("An error occurred while saving")
    }
  }

  const renderIcon = (iconName: string | null) => {
    if (!iconName) return <Icons.Package className="h-5 w-5" />
    // @ts-ignore
    const Icon = Icons[iconName] || Icons.Package
    return <Icon className="h-5 w-5" />
  }

  const renderProductVisual = (product: Product) => {
    if (product.imageUrl) {
      return (
        <div className="relative w-12 h-12 rounded-md overflow-hidden border">
          <Image 
            src={product.imageUrl} 
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20">
        {renderIcon(product.icon)}
      </div>
    )
  }

  const currencySymbol = editValues.currency === 'EUR' ? '€' : editValues.currency === 'USD' ? '$' : '£'
  const recurrenceLabel = editValues.recurrenceType === 'weekly'
    ? 'per week'
    : editValues.recurrenceType === 'monthly'
      ? 'per month'
      : editValues.recurrenceType === 'yearly'
        ? 'per year'
        : ''
  const recurrenceSuffix = editValues.recurrenceType === 'weekly'
    ? '/week'
    : editValues.recurrenceType === 'monthly'
      ? '/month'
      : editValues.recurrenceType === 'yearly'
        ? '/year'
        : ''

  return (
    <>
      <input
        ref={csvImportInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />
      
      {/* Vue Desktop - Tableau */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedProductIds.size === products.length && products.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>
              {/* Colonnes réorganisées : Visual → Title → ID → Created → Updated → Type → Price → Hourly Rate → VAT → Sales → Status → Actions */}
              {visibleColumns?.visual !== false && <TableHead className="w-[80px]">Visual</TableHead>}
              {visibleColumns?.title !== false && <SortableHeader field="title">Title</SortableHeader>}
              {visibleColumns?.id !== false && <SortableHeader field="id" className="w-[180px]">ID</SortableHeader>}
              {visibleColumns?.createdAt !== false && <SortableHeader field="createdAt" className="w-[140px]">Created</SortableHeader>}
              {visibleColumns?.updatedAt !== false && <SortableHeader field="updatedAt" className="w-[140px]">Updated</SortableHeader>}
              {visibleColumns?.type !== false && <SortableHeader field="type" className="w-[140px]">Type</SortableHeader>}
              {visibleColumns?.paymentType !== false && <SortableHeader field="paymentType" className="w-[160px]">Payment</SortableHeader>}
              {visibleColumns?.price !== false && <SortableHeader field="price" className="w-[120px]">Price HT</SortableHeader>}
              {visibleColumns?.hourlyRate !== false && <SortableHeader field="hourlyRate" className="w-[120px]">Hourly Rate</SortableHeader>}
              {visibleColumns?.vat !== false && <SortableHeader field="vatRateId" className="w-[100px]">VAT</SortableHeader>}
              {visibleColumns?.salesCount !== false && <SortableHeader field="salesCount" className="w-[90px]">Sales</SortableHeader>}
              {visibleColumns?.status !== false && <SortableHeader field="isPublished" className="w-[80px] text-center">Status</SortableHeader>}
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="group">
                {/* Checkbox de sélection */}
                <TableCell>
                  <Checkbox
                    checked={selectedProductIds.has(product.id)}
                    onCheckedChange={() => toggleProductSelection(product.id)}
                    aria-label={`Select ${product.title}`}
                  />
                </TableCell>

                {/* Visual (Image ou Icon) - EN PREMIÈRE POSITION */}
                {visibleColumns?.visual !== false && (
                  <TableCell>
                    <div className="relative">
                      {renderProductVisual(product)}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                      <input
                        ref={(el) => fileInputRefs.current[product.id] = el}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(product.id, file)
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                        onClick={() => fileInputRefs.current[product.id]?.click()}
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      {product.imageUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-white hover:text-white hover:bg-red-500/50"
                          onClick={() => removeImage(product.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      <Select
                        value={product.icon || "Package"}
                        onValueChange={(val) => updateField(product.id, "icon", val)}
                      >
                        <SelectTrigger className="h-6 w-6 p-0 border-0 bg-white/20 text-white [&>svg]:hidden">
                          <ImageIcon className="h-3 w-3" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ICONS.map(icon => {
                            // @ts-ignore
                            const IconComponent = Icons[icon]
                            return (
                              <SelectItem key={icon} value={icon}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <span>{icon}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TableCell>
                )}

                {/* Title - Click to edit - DEUXIÈME POSITION */}
                {visibleColumns?.title !== false && (
                  <TableCell>
                    {editingCell?.id === product.id && editingCell?.field === "title" ? (
                    <Input
                      autoFocus
                      defaultValue={product.title}
                      onBlur={(e) => {
                        if (e.target.value !== product.title) {
                          updateField(product.id, "title", e.target.value)
                        } else {
                          setEditingCell(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        } else if (e.key === "Escape") {
                          setEditingCell(null)
                        }
                      }}
                      className="h-8"
                    />
                  ) : (
                    <div
                      onClick={() => setEditingCell({ id: product.id, field: "title" })}
                      className="font-medium cursor-pointer hover:bg-muted/50 px-2 py-1 rounded flex items-center gap-2"
                    >
                      {product.title}
                      {product.isFeatured && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200">
                          ⭐ Most Popular
                        </Badge>
                      )}
                      {(() => {
                        const promoTooltip = getPromoTooltip(product.id)
                        if (!promoTooltip) return null
                        const promoLabel = promoTooltip.split(" | ")[0]?.split(": ")[1] || ""
                        return (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800 border-emerald-200"
                            title={promoTooltip}
                          >
                            Promo {promoLabel}
                          </Badge>
                        )
                      })()}
                    </div>
                  )}
                </TableCell>
                )}

                {/* ID - Copie au clic */}
                {visibleColumns?.id !== false && (
                  <TableCell>
                    <div 
                      className="font-mono text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                      onClick={() => {
                        navigator.clipboard.writeText(product.id)
                        toast.success("ID copied to clipboard")
                      }}
                      title={product.id}
                    >
                      {product.id.substring(0, 12)}...
                    </div>
                  </TableCell>
                )}

                {/* Date de création */}
                {visibleColumns?.createdAt !== false && (
                  <TableCell>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(product.createdAt).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </TableCell>
                )}

                {/* Date de modification */}
                {visibleColumns?.updatedAt !== false && (
                  <TableCell>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(product.updatedAt).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </TableCell>
                )}

                {/* Type - Cycle through types */}
                {visibleColumns?.type !== false && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const typeOrder = ['physical', 'digital']
                        const currentIndex = typeOrder.indexOf(product.type || 'physical')
                        const nextType = typeOrder[(currentIndex + 1) % typeOrder.length]
                        updateField(product.id, "type", nextType)
                      }}
                      className="h-8 px-3 hover:bg-muted/50"
                    >
                      <StatusBadge 
                        config={getProductTypeConfig(product.type)}
                        size="sm"
                        animated={true}
                      />
                    </Button>
                  </TableCell>
                )}

                {/* Payment Type - Badge display */}
                {visibleColumns?.paymentType !== false && (
                  <TableCell>
                    {(() => {
                      const pt = product.paymentType || 'one_time'
                      if (pt === 'subscription') {
                        // Show which periods are configured
                        const periods: string[] = []
                        if (product.subscriptionPriceWeekly) periods.push('W')
                        if (product.subscriptionPriceMonthly) periods.push('M')
                        if (product.subscriptionPriceYearly) periods.push('Y')
                        return (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                              <Repeat className="h-3 w-3 mr-1" />
                              Subscription
                            </Badge>
                            {periods.length > 0 && (
                              <div className="flex gap-0.5">
                                {periods.map(p => (
                                  <Badge key={p} variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      } else if (pt === 'hourly') {
                        return (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                            <Clock className="h-3 w-3 mr-1" />
                            Hourly
                          </Badge>
                        )
                      } else {
                        return (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                            <CreditCard className="h-3 w-3 mr-1" />
                            One-time
                          </Badge>
                        )
                      }
                    })()}
                  </TableCell>
                )}

                {/* Price - Click to edit - Prix HT sans virgule */}
                {visibleColumns?.price !== false && (
                  <TableCell>
                    {editingCell?.id === product.id && editingCell?.field === "price" ? (
                    <Input
                      autoFocus
                      type="number"
                      step="1"
                      defaultValue={Math.round(product.price / 100)}
                      onBlur={(e) => {
                        const newPrice = Math.round(parseFloat(e.target.value) * 100)
                        if (newPrice !== product.price) {
                          updateField(product.id, "price", newPrice)
                        } else {
                          setEditingCell(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        } else if (e.key === "Escape") {
                          setEditingCell(null)
                        }
                      }}
                      className="h-8 w-24"
                    />
                  ) : (
                    <div
                      onClick={() => setEditingCell({ id: product.id, field: "price" })}
                      className="font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                    >
                      {(() => {
                        // Afficher "Free" seulement si ni prix de base ni prix horaire
                        if (product.price === 0 && !product.hourlyRate) {
                          return "Free"
                        }
                        // Subscription: show the active subscription price with suffix
                        if (product.paymentType === 'subscription') {
                          const { symbol } = convertPrice(0)
                          if (product.subscriptionPriceMonthly) {
                            const { price: p } = convertPrice(product.subscriptionPriceMonthly)
                            return <span>{Math.round(p)} {symbol}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                          }
                          if (product.subscriptionPriceYearly) {
                            const { price: p } = convertPrice(product.subscriptionPriceYearly)
                            return <span>{Math.round(p)} {symbol}<span className="text-xs text-muted-foreground font-normal">/yr</span></span>
                          }
                          if (product.subscriptionPriceWeekly) {
                            const { price: p } = convertPrice(product.subscriptionPriceWeekly)
                            return <span>{Math.round(p)} {symbol}<span className="text-xs text-muted-foreground font-normal">/wk</span></span>
                          }
                        }
                        const { price, symbol } = convertPrice(product.price)
                        return `${Math.round(price)} ${symbol}`
                      })()}
                    </div>
                  )}
                </TableCell>
                )}

                {/* Hourly Rate - Click to edit */}
                {visibleColumns?.hourlyRate !== false && (
                  <TableCell>
                    {editingCell?.id === product.id && editingCell?.field === "hourlyRate" ? (
                    <Input
                      autoFocus
                      type="number"
                      step="1"
                      defaultValue={product.hourlyRate ? Math.round(product.hourlyRate / 100) : ""}
                      placeholder="-"
                      onBlur={(e) => {
                        const newRate = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                        if (newRate !== product.hourlyRate) {
                          updateField(product.id, "hourlyRate", newRate)
                        } else {
                          setEditingCell(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur()
                        } else if (e.key === "Escape") {
                          setEditingCell(null)
                        }
                      }}
                      className="h-8 w-24"
                    />
                  ) : (
                    <div
                      onClick={() => setEditingCell({ id: product.id, field: "hourlyRate" })}
                      className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded text-sm"
                    >
                      {product.hourlyRate ? (
                        <span className="font-medium">
                          {(() => {
                            const { price, symbol } = convertPrice(product.hourlyRate)
                            return `${Math.round(price)} ${symbol}/h`
                          })()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  )}
                </TableCell>
                )}

                {/* VAT - Click to change */}
                {visibleColumns?.vat !== false && (
                  <TableCell>
                    <Select
                      value={product.vatRateId || ""}
                      onValueChange={(val) => updateField(product.id, "vatRateId", val)}
                    >
                      <SelectTrigger className="h-8 border-transparent hover:border-input hover:bg-muted/50">
                        <SelectValue placeholder="No VAT">
                          {getVatRateDisplay(product.vatRateId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {vatRates.map(rate => (
                          <SelectItem key={rate.id} value={rate.id}>
                            <div className="flex items-center gap-2">
                              <span>{rate.name}</span>
                              <span className="text-muted-foreground">({(rate.rate / 100).toFixed(2)}%)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}

                {/* Nombre de ventes - APRÈS VAT */}
                {visibleColumns?.salesCount !== false && (
                  <TableCell className="text-center">
                    <div className="font-medium text-sm">
                      {product.salesCount || 0}
                    </div>
                  </TableCell>
                )}

                {/* Status - Click to toggle */}
                {visibleColumns?.status !== false && (
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateField(product.id, "isPublished", !product.isPublished)}
                      className={`h-8 w-8 transition-colors ${
                        product.isPublished 
                          ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                          : "text-red-600 hover:text-red-700 hover:bg-red-50"
                      }`}
                      title={product.isPublished ? "Published - Click to unpublish" : "Draft - Click to publish"}
                    >
                      {product.isPublished ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                )}

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {/* View & Edit - Bouton unique */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDetailsProductId(product.id)
                        setIsEditingInPanel(true)
                      }}
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="View and edit product"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(product.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete product"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vue Mobile - Cards améliorées */}
      <div className="md:hidden space-y-3">
        {products.map((product) => {
          const { price: convertedPrice, symbol } = convertPrice(product.price)
          const vatRate = vatRates.find(r => r.id === product.vatRateId)
          const vatAmount = vatRate ? (product.price / 100) * (vatRate.rate / 10000) : 0
          const totalPrice = (product.price / 100) + vatAmount
          
          return (
            <div key={product.id} className="rounded-lg border bg-card overflow-hidden">
              {/* En-tête avec checkbox, image et actions */}
              <div className="p-3 flex items-start gap-3 border-b bg-muted/20">
                <Checkbox
                  checked={selectedProductIds.has(product.id)}
                  onCheckedChange={() => toggleProductSelection(product.id)}
                  aria-label={`Select ${product.title}`}
                  className="mt-1"
                />
                
                {/* Image à gauche */}
                <div className="shrink-0">
                  {renderProductVisual(product)}
                </div>
                
                {/* Informations principales */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge
                      config={getProductTypeConfig(product.type)}
                      size="sm"
                    />
                    {(() => {
                      const promoTooltip = getPromoTooltip(product.id)
                      if (!promoTooltip) return null
                      const promoLabel = promoTooltip.split(" | ")[0]?.split(": ")[1] || ""
                      return (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-800 border-emerald-200"
                          title={promoTooltip}
                        >
                          Promo {promoLabel}
                        </Badge>
                      )
                    })()}
                    {/* Payment Type Badge */}
                    {product.paymentType === 'subscription' && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                        <Repeat className="h-3 w-3 mr-0.5" />
                        Sub
                      </Badge>
                    )}
                    {product.paymentType === 'hourly' && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                        <Clock className="h-3 w-3 mr-0.5" />
                        H
                      </Badge>
                    )}
                    {product.isPublished ? (
                      <Badge variant="default" className="text-xs">Published</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    ID: {product.id.substring(0, 12)}...
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDetailsProductId(product.id)
                      setIsEditingInPanel(true)
                    }}
                    className="h-8 w-8 text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(product.id)}
                    className="h-8 w-8 text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Informations de tarification */}
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Prix HT</span>
                    <div className="font-semibold">
                      {product.price === 0 && !product.hourlyRate ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `${Math.round(convertedPrice)} ${symbol}`
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">
                      {product.hourlyRate ? "Hourly Rate" : "TVA"}
                    </span>
                    {product.hourlyRate ? (
                      <div className="font-medium text-xs">
                        {(() => {
                          const { price: hourlyPrice, symbol: hourlySymbol } = convertPrice(product.hourlyRate)
                          return `${Math.round(hourlyPrice)} ${hourlySymbol}/h`
                        })()}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs">
                          {getVatRateDisplay(product.vatRateId)}
                        </div>
                        {vatRate && (
                          <div className="text-xs text-muted-foreground">
                            +{Math.round(vatAmount * (EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1))} {symbol}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Prix total TTC - affiché seulement si TVA et pas de tarif horaire */}
                {vatRate && !product.hourlyRate && (
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="text-sm font-medium">Prix TTC</span>
                    <span className="font-bold text-lg text-brand">
                      {Math.round(totalPrice * (EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES] || 1))} {symbol}
                    </span>
                  </div>
                )}
              </div>

              {/* Métadonnées */}
              <div className="px-3 pb-3 pt-2 border-t text-xs text-muted-foreground">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block mb-0.5">Ventes</span>
                    <span className="font-medium text-foreground">{product.salesCount || 0}</span>
                  </div>
                  <div>
                    <span className="block mb-0.5">Créé</span>
                    <span className="font-medium text-foreground">{new Date(product.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </div>
                  <div>
                    <span className="block mb-0.5">Updated</span>
                    <span className="font-medium text-foreground">{new Date(product.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found.
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Panel */}
      <Sheet open={!!detailsProductId} onOpenChange={(open) => {
        if (!open) {
          setDetailsProductId(null)
          setIsNewProduct(false)
          setIsEditingInPanel(false)
          setImagePreview(null)
          setPendingImageFile(null)
        }
      }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {(detailsProduct || isNewProduct) && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  {/* Visual avec gestion de l'upload */}
                  <div className="relative">
                    {imagePreview ? (
                      <div className="relative w-12 h-12 rounded-md overflow-hidden border group">
                        <Image 
                          src={imagePreview} 
                          alt={editValues.title || 'Product'}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <input
                            ref={(el) => fileInputRefs.current['panel-image'] = el}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUploadInPanel(file)
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                            onClick={() => fileInputRefs.current['panel-image']?.click()}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-white hover:text-white hover:bg-red-500/50"
                            onClick={removeImageInPanel}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20 group">
                        {renderIcon(editValues.icon)}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <input
                            ref={(el) => fileInputRefs.current['panel-image'] = el}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUploadInPanel(file)
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
                            onClick={() => fileInputRefs.current['panel-image']?.click()}
                          >
                            <Upload className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {isNewProduct ? "New Product" : (isEditingInPanel ? "Edit Product" : detailsProduct?.title)}
                    </div>
                    {!isNewProduct && detailsProduct && !isEditingInPanel && (
                      <div className="text-sm text-muted-foreground font-normal">
                        {(detailsProduct.price / 100).toFixed(2)} €
                      </div>
                    )}
                  </div>
                </SheetTitle>
                <SheetDescription>
                  {isNewProduct 
                    ? "Create a new product with all details" 
                    : (isEditingInPanel ? "Modify product information" : "Product details and quick actions")
                  }
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Mode édition/création complet */}
                {(isEditingInPanel || isNewProduct) ? (
                  <>
                    {/* Visual Upload Section - Simplifié et unifié */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Visual Identity
                      </h3>
                      <div className="p-4 rounded-lg border bg-card space-y-4">
                        {/* Image Upload - Interface simplifiée */}
                        <div className="space-y-3">
                          <Label className="text-xs font-medium">Product Image</Label>
                          
                          {/* Zone de preview et upload unifiée */}
                          <div 
                            className="relative w-full aspect-video max-w-sm mx-auto rounded-lg border-2 border-dashed overflow-hidden bg-muted/30 group cursor-pointer hover:border-brand transition-colors"
                            onClick={() => fileInputRefs.current['upload-image']?.click()}
                          >
                            {imagePreview ? (
                              <>
                                <Image 
                                  src={imagePreview} 
                                  alt="Product preview"
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                                  <Upload className="h-8 w-8" />
                                  <p className="text-sm font-medium">Click to replace</p>
                                  <p className="text-xs opacity-75">or drag and drop an image</p>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground group-hover:text-brand transition-colors">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                  <ImageIcon className="h-8 w-8" />
                                </div>
                                <div className="text-center px-4">
                                  <p className="text-sm font-medium">Click to add an image</p>
                                  <p className="text-xs mt-1 opacity-75">PNG, JPG up to 10MB</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <input
                            ref={(el) => fileInputRefs.current['upload-image'] = el}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUploadInPanel(file)
                            }}
                          />

                          {/* Actions rapides */}
                          {imagePreview && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  fileInputRefs.current['upload-image']?.click()
                                }}
                                className="flex-1"
                              >
                                <Upload className="h-3 w-3 mr-2" />
                                Replace image
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeImageInPanel()
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3 mr-2" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Icon Selector - Visual Grid */}
                        <div className="space-y-2">
                          <Label className="text-xs">Fallback Icon (if no image)</Label>
                          <div className="grid grid-cols-6 gap-2">
                            {AVAILABLE_ICONS.map(iconName => {
                              // @ts-ignore
                              const IconComponent = Icons[iconName]
                              const isSelected = editValues.icon === iconName
                              return (
                                <button
                                  key={iconName}
                                  type="button"
                                  onClick={() => setEditValues({...editValues, icon: iconName})}
                                  className={`relative flex items-center justify-center h-12 rounded-md border-2 transition-all hover:scale-105 ${
                                    isSelected
                                      ? 'border-brand bg-brand/10'
                                      : 'border-border bg-card hover:border-brand/50'
                                  }`}
                                  title={iconName}
                                >
                                  <IconComponent className="h-5 w-5" />
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.FileText className="h-4 w-4" />
                        Product Information
                      </h3>
                      <div className="p-4 rounded-lg border bg-card space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Title *</Label>
                          <Input
                            value={editValues.title}
                            onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                            placeholder="Product title"
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Subtitle</Label>
                          <Input
                            value={editValues.subtitle}
                            onChange={(e) => setEditValues({...editValues, subtitle: e.target.value})}
                            placeholder="e.g., Ideal for solo dev or small team"
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={editValues.description}
                            onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                            placeholder="Product description"
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Product Type</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditValues({...editValues, type: 'physical'})}
                              className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                editValues.type === 'physical'
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-border bg-card hover:border-orange-500/50'
                              }`}
                            >
                              <Icons.Package className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Physical</span>
                              {editValues.type === 'physical' && (
                                <Check className="h-4 w-4 mt-1 text-orange-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditValues({...editValues, type: 'digital'})}
                              className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                editValues.type === 'digital'
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-border bg-card hover:border-blue-500/50'
                              }`}
                            >
                              <Icons.Rocket className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Digital</span>
                              {editValues.type === 'digital' && (
                                <Check className="h-4 w-4 mt-1 text-blue-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Digital Product Configuration - Only shown when type is 'digital' */}
                        {editValues.type === 'digital' && (
                          <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-blue-600" />
                              <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Digital Product Configuration</Label>
                            </div>

                            {/* Download URL */}
                            <div className="space-y-2">
                              <Label className="text-xs">Download URL</Label>
                              <div className="relative">
                                <Input
                                  type="url"
                                  value={editValues.downloadUrl}
                                  onChange={(e) => setEditValues({...editValues, downloadUrl: e.target.value})}
                                  placeholder="https://example.com/files/product.zip"
                                  className="h-9 pl-9"
                                />
                                <FileUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                              <p className="text-[10px] text-muted-foreground">URL where customers can download the product after purchase</p>
                            </div>

                            {/* License Key Mode Toggle */}
                            <div className="space-y-2">
                              <Label className="text-xs">License Key</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditValues({...editValues, autoGenerateLicense: true, licenseKey: ''})}
                                  className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                    editValues.autoGenerateLicense
                                      ? 'border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/50'
                                      : 'border-border bg-card hover:border-blue-500/50'
                                  }`}
                                >
                                  <Icons.Wand2 className="h-5 w-5 mb-1" />
                                  <span className="text-xs font-medium">Auto-Generate</span>
                                  <span className="text-[10px] text-muted-foreground">System creates key</span>
                                  {editValues.autoGenerateLicense && (
                                    <Check className="h-3 w-3 mt-1 text-blue-600" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditValues({...editValues, autoGenerateLicense: false})}
                                  className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                    !editValues.autoGenerateLicense
                                      ? 'border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/50'
                                      : 'border-border bg-card hover:border-blue-500/50'
                                  }`}
                                >
                                  <Icons.Key className="h-5 w-5 mb-1" />
                                  <span className="text-xs font-medium">Custom Key</span>
                                  <span className="text-[10px] text-muted-foreground">Enter your own</span>
                                  {!editValues.autoGenerateLicense && (
                                    <Check className="h-3 w-3 mt-1 text-blue-600" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Custom License Key Input - Only shown when not auto-generating */}
                            {!editValues.autoGenerateLicense && (
                              <div className="space-y-2">
                                <Label className="text-xs">Custom License Key</Label>
                                <Input
                                  value={editValues.licenseKey}
                                  onChange={(e) => setEditValues({...editValues, licenseKey: e.target.value})}
                                  placeholder="XXXX-XXXX-XXXX-XXXX"
                                  className="h-9 font-mono"
                                />
                                <p className="text-[10px] text-muted-foreground">Enter a specific license key for this product</p>
                              </div>
                            )}

                            {/* License Instructions */}
                            <div className="space-y-2">
                              <Label className="text-xs">Activation Instructions</Label>
                              <Textarea
                                value={editValues.licenseInstructions}
                                onChange={(e) => setEditValues({...editValues, licenseInstructions: e.target.value})}
                                placeholder="Enter instructions for how customers should activate or use this product..."
                                rows={3}
                                className="resize-none text-sm"
                              />
                              <p className="text-[10px] text-muted-foreground">Instructions shown to customers after purchase</p>
                            </div>
                          </div>
                        )}

                        {/* Payment Type Section - For digital types */}
                        {editValues.type === 'digital' && (
                          <div className="space-y-3 p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-emerald-600" />
                              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Payment Type</Label>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setEditValues({...editValues, paymentType: 'one_time'})}
                                className={`flex flex-col items-center justify-center text-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                  editValues.paymentType === 'one_time'
                                    ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/50'
                                    : 'border-border bg-card hover:border-green-500/50'
                                }`}
                              >
                                <CreditCard className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">One-time</span>
                                {editValues.paymentType === 'one_time' && (
                                  <Check className="h-3 w-3 mt-1 text-green-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditValues({...editValues, paymentType: 'subscription'})}
                                className={`flex flex-col items-center justify-center text-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                  editValues.paymentType === 'subscription'
                                    ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50'
                                    : 'border-border bg-card hover:border-indigo-500/50'
                                }`}
                              >
                                <Repeat className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">Subscription</span>
                                {editValues.paymentType === 'subscription' && (
                                  <Check className="h-3 w-3 mt-1 text-indigo-600" />
                                )}
                              </button>
                            </div>

                            {/* Hourly Rate Display */}
                            {editValues.paymentType === 'hourly' && (
                              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded text-xs">
                                <p className="text-orange-800 dark:text-orange-200 font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Hourly billing - rate set in pricing section
                                </p>
                                <p className="text-orange-700 dark:text-orange-300 mt-0.5">
                                  Actual billing managed through Stripe after session.
                                </p>
                              </div>
                            )}

                            {/* Subscription Recurrence Selection */}
                            {editValues.paymentType === 'subscription' && (
                              <div className="space-y-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded">
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
                                  <Repeat className="h-3 w-3" />
                                  Recurrence Period
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditValues({ ...editValues, recurrenceType: 'weekly' })}
                                    className={`flex flex-col items-center justify-center text-center p-2 rounded-md border-2 transition-all hover:scale-105 ${
                                      editValues.recurrenceType === 'weekly'
                                        ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50'
                                        : 'border-border bg-card hover:border-indigo-500/50'
                                    }`}
                                  >
                                    <Clock className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-medium">Weekly</span>
                                    {editValues.recurrenceType === 'weekly' && (
                                      <Check className="h-3 w-3 mt-1 text-indigo-600" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditValues({ ...editValues, recurrenceType: 'monthly' })}
                                    className={`flex flex-col items-center justify-center text-center p-2 rounded-md border-2 transition-all hover:scale-105 ${
                                      editValues.recurrenceType === 'monthly'
                                        ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50'
                                        : 'border-border bg-card hover:border-indigo-500/50'
                                    }`}
                                  >
                                    <Calendar className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-medium">Monthly</span>
                                    {editValues.recurrenceType === 'monthly' && (
                                      <Check className="h-3 w-3 mt-1 text-indigo-600" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditValues({ ...editValues, recurrenceType: 'yearly' })}
                                    className={`flex flex-col items-center justify-center text-center p-2 rounded-md border-2 transition-all hover:scale-105 ${
                                      editValues.recurrenceType === 'yearly'
                                        ? 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50'
                                        : 'border-border bg-card hover:border-indigo-500/50'
                                    }`}
                                  >
                                    <Repeat className="h-4 w-4 mb-1" />
                                    <span className="text-[10px] font-medium">Yearly</span>
                                    {editValues.recurrenceType === 'yearly' && (
                                      <Check className="h-3 w-3 mt-1 text-indigo-600" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Select the billing period. Pricing is defined in the main pricing section.
                                </p>
                                {!editValues.recurrenceType && (
                                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                                    <p className="text-[10px] text-amber-800 dark:text-amber-200 flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Please choose a recurrence period
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs">Publication Status</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setEditValues({...editValues, isPublished: true})}
                              className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                editValues.isPublished
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-border bg-card hover:border-green-500/50'
                              }`}
                            >
                              <Eye className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Published</span>
                              <span className="text-[10px] text-muted-foreground">Visible to customers</span>
                              {editValues.isPublished && (
                                <Check className="h-4 w-4 mt-1 text-green-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditValues({...editValues, isPublished: false})}
                              className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-105 ${
                                !editValues.isPublished
                                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-border bg-card hover:border-orange-500/50'
                              }`}
                            >
                              <EyeOff className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Draft</span>
                              <span className="text-[10px] text-muted-foreground">Hidden from customers</span>
                              {!editValues.isPublished && (
                                <Check className="h-4 w-4 mt-1 text-orange-600" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">⭐ Highlight Product</Label>
                          <button
                            type="button"
                            onClick={() => setEditValues({...editValues, isFeatured: !editValues.isFeatured})}
                            className={`w-full flex items-center justify-between p-3 rounded-md border-2 transition-all hover:scale-[1.02] ${
                              editValues.isFeatured
                                ? 'border-amber-500 bg-amber-50 text-amber-800'
                                : 'border-border bg-card hover:border-amber-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className={`h-5 w-5 ${editValues.isFeatured ? 'text-amber-600' : 'text-muted-foreground'}`} />
                              <div className="text-left">
                                <div className="text-xs font-medium">Most Popular Badge</div>
                                <div className="text-[10px] text-muted-foreground">Highlight this product in the store</div>
                              </div>
                            </div>
                            {editValues.isFeatured && (
                              <Check className="h-4 w-4 text-amber-600" />
                            )}
                          </button>
                        </div>

                        {/* Upsell Product Selection - Only shows when 2+ products exist */}
                        {products.length >= 2 && (
                          <div className="space-y-2">
                            <Label className="text-xs">💼 Upsell Product (Optional)</Label>
                            <Select
                              value={editValues.upsellProductId || "none"}
                              onValueChange={(value) => setEditValues({...editValues, upsellProductId: value === "none" ? null : value})}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="No upsell product" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <div className="flex items-center gap-2">
                                    <X className="h-3 w-3" />
                                    <span>No upsell</span>
                                  </div>
                                </SelectItem>
                                {products
                                  .filter(p => p.id !== (isNewProduct ? null : detailsProduct?.id))
                                  .map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                      <div className="flex items-center gap-2">
                                        <Plus className="h-3 w-3" />
                                        <span>{product.title}</span>
                                        <span className="text-muted-foreground text-xs">
                                          ({(product.price / 100).toFixed(2)} €)
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                              Product shown as an optional addition in the cart
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Marketing Content */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.Sparkles className="h-4 w-4" />
                        Marketing Content
                      </h3>
                      <div className="p-4 rounded-lg border bg-card space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Possible Focus Areas</Label>
                          <Textarea
                            value={editValues.focusAreas}
                            onChange={(e) => setEditValues({...editValues, focusAreas: e.target.value})}
                            placeholder="Enter one focus area per line:\n2-hours live walkthrough\nDocker setup\nCLI usage & deployment\nEnvironment configuration"
                            rows={5}
                            className="resize-none font-mono text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">One item per line. Displayed with checkmarks on pricing page.</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">You'll Receive (Deliverables)</Label>
                          <Textarea
                            value={editValues.deliverables}
                            onChange={(e) => setEditValues({...editValues, deliverables: e.target.value})}
                            placeholder="Enter one deliverable per line:\nSetup notes and checklist\nCustomized configuration files\n30-day email support"
                            rows={5}
                            className="resize-none font-mono text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">One item per line. Displayed in separate section on pricing page.</p>
                        </div>
                      </div>
                    </div>

                    {/* Price Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.DollarSign className="h-4 w-4" />
                        Pricing
                      </h3>
                      <div className="p-4 rounded-lg border bg-card space-y-4">
                        {/* Sélecteur de monnaie */}
                        <div className="space-y-2">
                          <Label className="text-xs">Currency *</Label>
                          <Select
                            value={editValues.currency}
                            onValueChange={(val) => setEditValues({...editValues, currency: val})}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">€</span>
                                  <span>Euro (EUR)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="USD">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">$</span>
                                  <span>US Dollar (USD)</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="GBP">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">£</span>
                                  <span>British Pound (GBP)</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">
                            {editValues.paymentType === 'subscription'
                              ? `Recurring Price${recurrenceLabel ? ` (${recurrenceLabel})` : ''} (excl. VAT) *`
                              : 'Base Price (excl. VAT) *'}
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues.price}
                              onChange={(e) => setEditValues({...editValues, price: e.target.value})}
                              className="h-9 pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              {currencySymbol}
                            </span>
                          </div>
                        </div>
                        
                        {/* Coût horaire optionnel */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Hourly Rate (optional)</Label>
                            <span className="text-[10px] text-muted-foreground">For consulting</span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValues.hourlyRate}
                              onChange={(e) => setEditValues({...editValues, hourlyRate: e.target.value})}
                              placeholder="e.g., 150.00"
                              className="h-9 pr-20"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              {editValues.currency === 'EUR' ? '€' : editValues.currency === 'USD' ? '$' : '£'}/h
                            </span>
                          </div>
                          {editValues.hourlyRate && parseFloat(editValues.hourlyRate) > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              This rate will be displayed for time-based services
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">VAT Rate</Label>
                            {onOpenVatDialog && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  console.log('[ProductsTable] Opening VAT dialog from product panel')
                                  onOpenVatDialog()
                                }}
                                className="h-6 px-2 text-xs text-brand hover:text-[#B26B27] hover:bg-brand/10"
                              >
                                <Icons.Percent className="h-3 w-3 mr-1" />
                                Manage VAT
                              </Button>
                            )}
                          </div>
                          <Select
                            value={editValues.vatRateId}
                            onValueChange={(val) => setEditValues({...editValues, vatRateId: val})}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="No VAT" />
                            </SelectTrigger>
                            <SelectContent>
                              {vatRates.map(rate => (
                                <SelectItem key={rate.id} value={rate.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{rate.name}</span>
                                    <span className="text-muted-foreground">({(rate.rate / 100).toFixed(2)}%)</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Calcul dynamique */}
                        {editValues.vatRateId && (() => {
                          const rate = vatRates.find(r => r.id === editValues.vatRateId)
                          if (rate) {
                            const priceHT = parseFloat(editValues.price) || 0
                            const vatAmount = priceHT * (rate.rate / 10000)
                            const totalPrice = priceHT + vatAmount
                            return (
                              <div className="pt-3 space-y-2 border-t">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">VAT ({(rate.rate / 100).toFixed(2)}%)</span>
                                  <span className="font-medium">{vatAmount.toFixed(2)} {currencySymbol}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold">
                                    Total (incl. VAT){editValues.paymentType === 'subscription' && recurrenceSuffix ? ` ${recurrenceSuffix}` : ''}
                                  </span>
                                  <span className="font-bold text-lg text-brand">{totalPrice.toFixed(2)} {currencySymbol}</span>
                                </div>
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-4 border-t pt-4">
                      <Button
                        size="sm"
                        onClick={handleSaveFromPanel}
                        className="flex-1 bg-brand hover:bg-[#B26B27] h-10"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {isNewProduct ? "Create Product" : "Save Changes"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (isNewProduct) {
                            setDetailsProductId(null)
                            setIsNewProduct(false)
                            setImagePreview(null)
                            setPendingImageFile(null)
                          } else {
                            setIsEditingInPanel(false)
                            if (detailsProduct) {
                              // Réinitialiser les features
                              let focusAreasText = ''
                              let deliverablesText = ''
                              if (detailsProduct.features && typeof detailsProduct.features === 'object') {
                                const features = detailsProduct.features as { focusAreas?: string[], deliverables?: string[] }
                                focusAreasText = (features.focusAreas || []).join('\n')
                                deliverablesText = (features.deliverables || []).join('\n')
                              }
                              
                              setEditValues({
                                title: detailsProduct.title,
                                subtitle: (detailsProduct as any).subtitle || '',
                                description: detailsProduct.description || '',
                                price: (detailsProduct.price / 100).toFixed(2),
                                hourlyRate: detailsProduct.hourlyRate ? (detailsProduct.hourlyRate / 100).toFixed(2) : '',
                                currency: detailsProduct.currency || 'EUR',
                                type: detailsProduct.type || 'digital',
                                vatRateId: detailsProduct.vatRateId || '',
                                isPublished: detailsProduct.isPublished,
                                isFeatured: detailsProduct.isFeatured || false,
                                icon: detailsProduct.icon || 'ShoppingBag',
                                focusAreas: focusAreasText,
                                deliverables: deliverablesText,
                                upsellProductId: (detailsProduct as any).upsellProductId || null,
                                // Digital product fields
                                downloadUrl: (detailsProduct as any).downloadUrl || '',
                                licenseKey: (detailsProduct as any).licenseKey || '',
                                autoGenerateLicense: !(detailsProduct as any).licenseKey,
                                licenseInstructions: (detailsProduct as any).licenseInstructions || '',
                                // Payment type fields v5.0
                                paymentType: detailsProduct.paymentType || 'one_time',
                                recurrenceType: detailsProduct.subscriptionPriceWeekly
                                  ? 'weekly'
                                  : detailsProduct.subscriptionPriceMonthly
                                    ? 'monthly'
                                    : detailsProduct.subscriptionPriceYearly
                                      ? 'yearly'
                                      : '',
                                subscriptionPriceWeekly: detailsProduct.subscriptionPriceWeekly ? (detailsProduct.subscriptionPriceWeekly / 100).toFixed(2) : '',
                                subscriptionPriceMonthly: detailsProduct.subscriptionPriceMonthly ? (detailsProduct.subscriptionPriceMonthly / 100).toFixed(2) : '',
                                subscriptionPriceYearly: detailsProduct.subscriptionPriceYearly ? (detailsProduct.subscriptionPriceYearly / 100).toFixed(2) : ''
                              })
                              setImagePreview(detailsProduct.imageUrl)
                              setPendingImageFile(null)
                            }
                          }
                        }}
                        className="h-10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Mode lecture - Vue détails uniquement */}
                    {/* Status Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Publication Status
                      </h3>
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => detailsProduct && updateField(detailsProduct.id, "isPublished", !detailsProduct.isPublished)}
                          className={`h-10 w-10 ${
                            detailsProduct?.isPublished 
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          }`}
                        >
                          {detailsProduct?.isPublished ? (
                            <Eye className="h-5 w-5" />
                          ) : (
                            <EyeOff className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="font-medium">
                            {detailsProduct?.isPublished ? "Published" : "Draft"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {detailsProduct?.isPublished 
                              ? "Visible to customers" 
                              : "Hidden from customers"}
                          </div>
                        </div>
                        <Badge variant={detailsProduct?.isPublished ? "default" : "secondary"}>
                          {detailsProduct?.isPublished ? "Live" : "Draft"}
                        </Badge>
                      </div>
                    </div>

                    {/* Type Section */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.Package className="h-4 w-4" />
                        Product Type
                      </h3>
                      <div className="p-3 rounded-lg border bg-card">
                        <StatusBadge 
                          config={getProductTypeConfig(detailsProduct?.type || null)}
                          size="md"
                        />
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.FileText className="h-4 w-4" />
                        Product Details
                      </h3>
                      <div className="p-3 rounded-lg border bg-card space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Title</span>
                          <span className="font-semibold">{detailsProduct?.title}</span>
                        </div>
                        {detailsProduct?.description && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-muted-foreground block mb-1">Description</span>
                            <p className="text-sm">{detailsProduct.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.Euro className="h-4 w-4" />
                        Pricing
                      </h3>
                      <div className="p-3 rounded-lg border bg-card space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Price (excl. VAT)</span>
                          <span className="font-semibold">{detailsProduct && (detailsProduct.price / 100).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VAT Rate</span>
                          <span className="font-medium">{getVatRateDisplay(detailsProduct?.vatRateId || null)}</span>
                        </div>
                        {detailsProduct?.vatRateId && (() => {
                          const rate = vatRates.find(r => r.id === detailsProduct.vatRateId)
                          if (rate) {
                            const priceHT = detailsProduct.price / 100
                            const vatAmount = priceHT * (rate.rate / 10000)
                            const totalPrice = priceHT + vatAmount
                            return (
                              <>
                                <div className="flex justify-between text-sm pt-2 border-t">
                                  <span className="text-muted-foreground">VAT ({(rate.rate / 100).toFixed(2)}%)</span>
                                  <span>{vatAmount.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                  <span className="font-semibold">Total (incl. VAT)</span>
                                  <span className="font-bold text-lg text-brand">{totalPrice.toFixed(2)} €</span>
                                </div>
                              </>
                            )
                          }
                        })()}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Icons.Calendar className="h-4 w-4" />
                        Information
                      </h3>
                      <div className="p-3 rounded-lg border bg-card space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span>{detailsProduct && new Date(detailsProduct.createdAt).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Product ID</span>
                          <span className="font-mono text-xs">{detailsProduct && detailsProduct.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Quick Actions</h3>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start bg-brand text-white hover:bg-[#B26B27] hover:text-white"
                          onClick={() => setIsEditingInPanel(true)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Product
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (detailsProduct) {
                              setDeleteId(detailsProduct.id)
                              setDetailsProductId(null)
                            }
                          }}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete Product
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
})

ProductsTable.displayName = 'ProductsTable'
