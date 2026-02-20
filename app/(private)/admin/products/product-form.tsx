"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { upsertProduct } from "@/app/actions/ecommerce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Upload, X, ImageIcon, Package, Monitor, Calendar, Box, Ticket, Plus, Check, Copy, Trash, Gift, Download, Key, FileText, Repeat, Clock, CreditCard } from "lucide-react"
import Link from "next/link"
import * as Icons from "lucide-react"
import Image from "next/image"
import { getCoupons, upsertCoupon, deleteCoupon } from "@/app/actions/coupons"

interface VatRate {
  id: string
  name: string
  country: string
  rate: number
  isDefault: boolean
  isActive: boolean
}

interface ProductFormProps {
  initialData?: {
    id: string
    title: string
    description: string | null
    price: number
    type: string | null
    isPublished: boolean
    fileUrl: string | null
    outlookEventTypeId: string | null
    icon: string | null
    features?: unknown
    currency?: string | null
    upsellProductId?: string | null
    imageUrl?: string | null
    vatRateId?: string | null
    // New fields v3.0
    isFree?: boolean
    digitalDeliveryType?: string | null
    licenseKey?: string | null
    licenseInstructions?: string | null
    requiresShipping?: boolean
    weight?: number | null
    dimensions?: { length?: number; width?: number; height?: number } | null
    stockQuantity?: number | null
    shippingNotes?: string | null
    appointmentMode?: string | null
    appointmentDuration?: number | null
    // Payment type fields v5.0
    paymentType?: string | null
    subscriptionPriceWeekly?: number | null
    subscriptionPriceMonthly?: number | null
    subscriptionPriceYearly?: number | null
  }
  products?: { id: string; title: string }[]
  vatRates: VatRate[]
}

export function ProductForm({ initialData, products = [], vatRates }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const couponSectionRef = useRef<HTMLDivElement | null>(null)
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [coupons, setCoupons] = useState<any[]>([])
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [pendingCoupon, setPendingCoupon] = useState(false)
  const [couponFormData, setCouponFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    startDate: "",
    endDate: "",
    usageLimit: "",
  })

  // Find default VAT rate or first active rate
  const defaultVatRate = vatRates.find(r => r.isDefault && r.isActive) || vatRates.find(r => r.isActive)

  // Load coupons applicable to this product
  useEffect(() => {
    const loadCoupons = async () => {
      if (!initialData?.id) return
      
      const result = await getCoupons()
      if (result.success && result.data) {
        // Filter coupons that apply to this product
        const productCoupons = result.data.filter((coupon: any) => {
          if (!coupon.applicableProducts) return true // All products
          const applicableIds = coupon.applicableProducts as string[]
          return applicableIds.includes(initialData.id)
        })
        setCoupons(productCoupons)
      }
    }
    loadCoupons()
  }, [initialData?.id])

  // State to track which subscription periods are enabled
  const [enabledRecurrences, setEnabledRecurrences] = useState({
    weekly: !!initialData?.subscriptionPriceWeekly,
    monthly: !!initialData?.subscriptionPriceMonthly,
    yearly: !!initialData?.subscriptionPriceYearly,
  })

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    price: initialData?.price ? (initialData.price / 100).toString() : "",
    currency: initialData?.currency || "EUR",
    // Product Type - v4.0: 'physical' | 'digital' | 'appointment'
    type: initialData?.type || "physical",
    isPublished: initialData?.isPublished || false,
    isFeatured: (initialData as any)?.isFeatured || false,
    // Free option - any product type can be free
    isFree: initialData?.isFree || false,
    // Digital product fields
    // Infer delivery type from existing data if not explicitly set
    digitalDeliveryType: initialData?.digitalDeliveryType || (
      // If both fileUrl and licenseKey exist (or licenseInstructions), default to 'both'
      (initialData?.fileUrl && (initialData?.licenseKey || initialData?.licenseInstructions)) ? 'both' :
      // If only fileUrl exists, default to 'url'
      initialData?.fileUrl ? 'url' :
      // Otherwise default to 'license'
      'license'
    ),
    fileUrl: initialData?.fileUrl || "",
    licenseKey: initialData?.licenseKey || "",
    licenseInstructions: initialData?.licenseInstructions || "",
    autoGenerateLicense: !initialData?.licenseKey, // Auto if no custom key
    // Physical product fields
    requiresShipping: initialData?.requiresShipping || false,
    weight: initialData?.weight?.toString() || "",
    dimensionLength: initialData?.dimensions?.length?.toString() || "",
    dimensionWidth: initialData?.dimensions?.width?.toString() || "",
    dimensionHeight: initialData?.dimensions?.height?.toString() || "",
    stockQuantity: initialData?.stockQuantity?.toString() || "",
    shippingNotes: initialData?.shippingNotes || "",
    // Consulting product fields
    appointmentMode: initialData?.appointmentMode || "packaged",
    appointmentDuration: initialData?.appointmentDuration?.toString() || "60",
    outlookEventTypeId: initialData?.outlookEventTypeId || "",
    hourlyRate: (initialData as any)?.hourlyRate ? ((initialData as any).hourlyRate / 100).toString() : "",
    // Payment type fields v5.0
    paymentType: initialData?.paymentType || "one_time",
    subscriptionPriceWeekly: initialData?.subscriptionPriceWeekly ? (initialData.subscriptionPriceWeekly / 100).toString() : "",
    subscriptionPriceMonthly: initialData?.subscriptionPriceMonthly ? (initialData.subscriptionPriceMonthly / 100).toString() : "",
    subscriptionPriceYearly: initialData?.subscriptionPriceYearly ? (initialData.subscriptionPriceYearly / 100).toString() : "",
    // Common fields
    icon: initialData?.icon || "ShoppingBag",
    focusAreas: (initialData?.features as any)?.focusAreas?.join("\n") || (Array.isArray(initialData?.features) ? initialData.features.join("\n") : ""),
    deliverables: (initialData?.features as any)?.deliverables?.join("\n") || "",
    upsellProductId: initialData?.upsellProductId || "none",
    vatRateId: initialData?.vatRateId || defaultVatRate?.id || "",
  })

  const handleImageUpload = async (file: File) => {
    // For new products, store the file temporarily and show preview
    if (!initialData?.id) {
      setPendingImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      toast.success("Image ready for upload (will be saved with product)")
      return
    }

    // For existing products, upload immediately
    const formData = new FormData()
    formData.append("image", file)
    formData.append("productId", initialData.id)

    try {
      const response = await fetch("/api/products/image", {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setImagePreview(data.imageUrl)
        toast.success("Image uploaded")
        router.refresh()
      } else {
        toast.error("Failed to upload image")
      }
    } catch (error) {
      toast.error("Upload error")
    }
  }

  const removeImage = async () => {
    if (!initialData?.id) {
      // For new products, just clear the preview and pending file
      setImagePreview(null)
      setPendingImageFile(null)
      toast.success("Image removed")
      return
    }

    // For existing products, update in database
    try {
      const result = await upsertProduct({
        id: initialData.id,
        imageUrl: null
      })

      if (result.success) {
        setImagePreview(null)
        setPendingImageFile(null)
        toast.success("Image removed")
        router.refresh()
      }
    } catch (error) {
      toast.error("Failed to remove image")
    }
  }

  // Check if product requires payment (not free and has price logic)
  const requiresPayment = !formData.isFree && (
    formData.type === 'physical' ||
    formData.type === 'digital' ||
    formData.type === 'standard' ||
    (formData.type === 'consulting' && formData.appointmentMode === 'packaged')
  )

  // Coupon management functions
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialData?.id) {
      setPendingCoupon(true)
      setShowCouponForm(false)
      toast.success("Coupon will be created after the product is saved")
      return
    }
    
    setCouponLoading(true)
    try {
      const discountValue = couponFormData.discountType === 'percentage'
        ? parseInt(couponFormData.discountValue)
        : Math.round(parseFloat(couponFormData.discountValue) * 100)

      const result = await upsertCoupon({
        code: couponFormData.code,
        description: couponFormData.description || null,
        discountType: couponFormData.discountType,
        discountValue: discountValue,
        startDate: couponFormData.startDate ? new Date(couponFormData.startDate) : null,
        endDate: couponFormData.endDate ? new Date(couponFormData.endDate) : null,
        usageLimit: couponFormData.usageLimit ? parseInt(couponFormData.usageLimit) : null,
        applicableProducts: [initialData.id],
        isActive: true,
      })

      if (result.success) {
        toast.success("Coupon created successfully")
        setShowCouponForm(false)
        setCouponFormData({
          code: "",
          description: "",
          discountType: "percentage",
          discountValue: "",
          startDate: "",
          endDate: "",
          usageLimit: "",
        })
        // Reload coupons
        const couponsResult = await getCoupons()
        if (couponsResult.success && couponsResult.data) {
          const productCoupons = couponsResult.data.filter((coupon: any) => {
            if (!coupon.applicableProducts) return true
            const applicableIds = coupon.applicableProducts as string[]
            return applicableIds.includes(initialData.id)
          })
          setCoupons(productCoupons)
        }
      } else {
        toast.error(result.error || "Failed to create coupon")
      }
    } catch (error) {
      toast.error("An error occurred while creating the coupon")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return
    
    const result = await deleteCoupon(couponId)
    if (result.success) {
      toast.success("Coupon deleted")
      setCoupons(coupons.filter(c => c.id !== couponId))
    } else {
      toast.error("Failed to delete coupon")
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copied to clipboard")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: if subscription, at least one recurrence must be enabled
    if (formData.paymentType === 'subscription') {
      if (!enabledRecurrences.weekly && !enabledRecurrences.monthly && !enabledRecurrences.yearly) {
        toast.error("Veuillez sélectionner au moins une période d'abonnement")
        return
      }
      
      // Check that enabled recurrences have prices
      if (enabledRecurrences.weekly && !formData.subscriptionPriceWeekly) {
        toast.error("Veuillez définir un prix pour l'abonnement hebdomadaire")
        return
      }
      if (enabledRecurrences.monthly && !formData.subscriptionPriceMonthly) {
        toast.error("Veuillez définir un prix pour l'abonnement mensuel")
        return
      }
      if (enabledRecurrences.yearly && !formData.subscriptionPriceYearly) {
        toast.error("Veuillez définir un prix pour l'abonnement annuel")
        return
      }
    }
    
    setLoading(true)

    try {
      const features = {
        focusAreas: formData.focusAreas.split("\n").filter((s: string) => s.trim() !== ""),
        deliverables: formData.deliverables.split("\n").filter((s: string) => s.trim() !== ""),
      }

      // Price handling based on type and free status
      let price = 0
      if (!formData.isFree && requiresPayment) {
        price = Math.round(parseFloat(formData.price || "0") * 100)
      }

      // Build dimensions object if physical product
      let dimensions = null
      if (formData.type === 'physical') {
        const length = parseFloat(formData.dimensionLength) || null
        const width = parseFloat(formData.dimensionWidth) || null
        const height = parseFloat(formData.dimensionHeight) || null
        if (length || width || height) {
          dimensions = { length, width, height }
        }
      }

      const result = await upsertProduct({
        id: initialData?.id,
        title: formData.title,
        description: formData.description,
        price: price,
        currency: formData.currency,
        type: formData.type,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        isFree: formData.isFree,
        // Digital product fields
        digitalDeliveryType: formData.type === 'digital' ? formData.digitalDeliveryType : null,
        fileUrl: formData.type === 'digital' && (formData.digitalDeliveryType === 'url' || formData.digitalDeliveryType === 'both') ? formData.fileUrl : null,
        licenseKey: formData.type === 'digital' && (formData.digitalDeliveryType === 'license' || formData.digitalDeliveryType === 'both') ? formData.licenseKey : null,
        licenseInstructions: formData.type === 'digital' && (formData.digitalDeliveryType === 'license' || formData.digitalDeliveryType === 'both') ? formData.licenseInstructions : null,
        // Physical product fields
        requiresShipping: formData.type === 'physical',
        weight: formData.type === 'physical' && formData.weight ? parseInt(formData.weight) : null,
        dimensions: formData.type === 'physical' ? dimensions : null,
        stockQuantity: formData.type === 'physical' && formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
        shippingNotes: formData.type === 'physical' ? formData.shippingNotes : null,
        // Consulting product fields
        appointmentMode: formData.type === 'consulting' ? formData.appointmentMode : null,
        appointmentDuration: formData.type === 'consulting' && formData.appointmentDuration ? parseInt(formData.appointmentDuration) : null,
        outlookEventTypeId: formData.type === 'consulting' ? formData.outlookEventTypeId : null,
        hourlyRate: formData.type === 'consulting' && formData.hourlyRate ? Math.round(parseFloat(formData.hourlyRate) * 100) : null,
        // Payment type fields v5.0
        paymentType: (formData.type === 'digital' || formData.type === 'appointment') ? formData.paymentType : 'one_time',
        subscriptionPriceWeekly: formData.paymentType === 'subscription' && enabledRecurrences.weekly && formData.subscriptionPriceWeekly ? Math.round(parseFloat(formData.subscriptionPriceWeekly) * 100) : null,
        subscriptionPriceMonthly: formData.paymentType === 'subscription' && enabledRecurrences.monthly && formData.subscriptionPriceMonthly ? Math.round(parseFloat(formData.subscriptionPriceMonthly) * 100) : null,
        subscriptionPriceYearly: formData.paymentType === 'subscription' && enabledRecurrences.yearly && formData.subscriptionPriceYearly ? Math.round(parseFloat(formData.subscriptionPriceYearly) * 100) : null,
        // Common fields
        icon: formData.icon,
        features: features,
        upsellProductId: formData.upsellProductId === "none" ? null : formData.upsellProductId,
        vatRateId: requiresPayment ? (formData.vatRateId || null) : null,
      })

      if (result.success) {
        // If we have a pending image file and the product was just created, upload it now
        if (pendingImageFile && result.data?.id) {
          const imgFormData = new FormData()
          imgFormData.append("image", pendingImageFile)
          imgFormData.append("productId", result.data.id)

          try {
            await fetch("/api/products/image", {
              method: "POST",
              body: imgFormData
            })
          } catch (error) {
            console.error("Image upload error:", error)
            toast.error("Product created but image upload failed")
          }
        }

        toast.success(initialData ? "Product updated" : "Product created")

        if (pendingCoupon && result.data?.id) {
          const discountValue = couponFormData.discountType === 'percentage'
            ? parseInt(couponFormData.discountValue)
            : Math.round(parseFloat(couponFormData.discountValue) * 100)

          const couponResult = await upsertCoupon({
            code: couponFormData.code,
            description: couponFormData.description || null,
            discountType: couponFormData.discountType,
            discountValue: discountValue,
            startDate: couponFormData.startDate ? new Date(couponFormData.startDate) : null,
            endDate: couponFormData.endDate ? new Date(couponFormData.endDate) : null,
            usageLimit: couponFormData.usageLimit ? parseInt(couponFormData.usageLimit) : null,
            applicableProducts: [result.data.id],
            isActive: true,
          })

          if (couponResult.success) {
            toast.success("Coupon created")
            setPendingCoupon(false)
            setCouponFormData({
              code: "",
              description: "",
              discountType: "percentage",
              discountValue: "",
              startDate: "",
              endDate: "",
              usageLimit: "",
            })
          } else {
            toast.error(couponResult.error || "Failed to create coupon")
          }
        }

        router.push("/admin/products")
        router.refresh()
      } else {
        toast.error("Failed to save product")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{initialData ? "Edit Product" : "New Product"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg bg-card">
        {/* Image Upload Section */}
        <div className="space-y-4 border p-4 rounded-md bg-muted/20">
          <Label>Product Image</Label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              {imagePreview ? (
                <div className="relative w-full max-w-xs">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-brand/20">
                    <Image
                      src={imagePreview}
                      alt="Product preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-48 h-48 border-2 border-dashed rounded-lg bg-muted/50">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No image uploaded</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {initialData?.id ? "Upload Image" : "Select Image"}
              </Button>
              {!initialData?.id && pendingImageFile && (
                <p className="text-xs text-green-600 mt-2">
                  Image ready to upload with product
                </p>
              )}
              {!initialData?.id && !pendingImageFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  You can select an image now. It will be uploaded when you create the product.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Select
            value={formData.icon}
            onValueChange={(value) => setFormData({ ...formData, icon: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select icon" />
            </SelectTrigger>
            <SelectContent>
              {["ShoppingBag", "Package", "Zap", "Shield", "Globe", "Server", "Cloud", "Database", "Code", "Smartphone", "Box", "Truck", "Download", "Key", "Users", "Calendar"].map((iconName) => {
                 const Icon = Icons[iconName as keyof typeof Icons] as any
                 return (
                   <SelectItem key={iconName} value={iconName}>
                     <div className="flex items-center gap-2">
                       {Icon && <Icon className="h-4 w-4" />}
                       <span>{iconName}</span>
                     </div>
                   </SelectItem>
                 )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="focusAreas">Possible Focus Areas (One per line)</Label>
          <Textarea
            id="focusAreas"
            value={formData.focusAreas}
            onChange={(e) => setFormData({ ...formData, focusAreas: e.target.value })}
            placeholder="e.g. Docker setup&#10;CLI usage"
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliverables">You'll Receive (One per line)</Label>
          <Textarea
            id="deliverables"
            value={formData.deliverables}
            onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
            placeholder="e.g. Setup notes&#10;Recorded session"
            rows={3}
          />
        </div>

        {/* Product Type Selection - v4.0 */}
        <div className="space-y-4 border p-4 rounded-md bg-muted/10">
          <div className="space-y-2">
            <Label>Product Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Physical</span>
                      <span className="text-xs text-muted-foreground">Shipped by mail with tracking</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="digital">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Digital</span>
                      <span className="text-xs text-muted-foreground">Instant delivery via code/download</span>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="appointment">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Appointment</span>
                      <span className="text-xs text-muted-foreground">Book a time slot after purchase</span>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.type === 'physical' && '📦 Physical product shipped by mail - Admin will be notified to ship the package with tracking'}
              {formData.type === 'digital' && '💻 Digital product with instant delivery via download link or activation code'}
              {formData.type === 'appointment' && '📅 Appointment booking - Customer selects time slot during checkout'}
            </p>
            {/* Debug: Current type */}
            <p className="text-xs text-blue-500 mt-1">Current type: <strong>{formData.type}</strong></p>
          </div>

          {/* Free Product Checkbox - Available for all types */}
          <div className="flex items-center space-x-2 pt-2 border-t">
            <Switch
              id="isFree"
              checked={formData.isFree}
              onCheckedChange={(checked) => setFormData({ ...formData, isFree: checked })}
            />
            <Label htmlFor="isFree" className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-500" />
              Free Product (no payment required)
            </Label>
          </div>
          {formData.isFree && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
              This product will be available for free. No payment will be collected.
            </p>
          )}
        </div>

        {/* Physical Product Configuration */}
        {formData.type === 'physical' && (
          <div className="space-y-4 border p-4 rounded-md bg-orange-50 dark:bg-orange-950/20">
            <h3 className="font-medium flex items-center gap-2">
              <Box className="h-4 w-4" />
              Physical Product Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (grams)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dimensions (cm)</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min="0"
                  value={formData.dimensionLength}
                  onChange={(e) => setFormData({ ...formData, dimensionLength: e.target.value })}
                  placeholder="Length"
                />
                <Input
                  type="number"
                  min="0"
                  value={formData.dimensionWidth}
                  onChange={(e) => setFormData({ ...formData, dimensionWidth: e.target.value })}
                  placeholder="Width"
                />
                <Input
                  type="number"
                  min="0"
                  value={formData.dimensionHeight}
                  onChange={(e) => setFormData({ ...formData, dimensionHeight: e.target.value })}
                  placeholder="Height"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingNotes">Shipping Notes</Label>
              <Textarea
                id="shippingNotes"
                value={formData.shippingNotes}
                onChange={(e) => setFormData({ ...formData, shippingNotes: e.target.value })}
                placeholder="Special shipping instructions..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Digital Product Configuration */}
        {formData.type === 'digital' && (
          <div className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <h3 className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Monitor className="h-4 w-4 text-blue-500" />
              Digital Product Configuration
            </h3>

            {/* Delivery Type Selector */}
            <div className="space-y-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                Delivery Type
              </Label>
              <Select
                value={formData.digitalDeliveryType}
                onValueChange={(value) => setFormData({ ...formData, digitalDeliveryType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Download URL only</span>
                        <span className="text-xs text-muted-foreground">Customer receives a download link</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="license">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-amber-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">License Key only</span>
                        <span className="text-xs text-muted-foreground">Customer receives a license/activation key</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-green-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">URL + License Key</span>
                        <span className="text-xs text-muted-foreground">Customer receives both download link and license key</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.digitalDeliveryType === 'url' && '🔗 Le client recevra uniquement un lien de téléchargement après achat.'}
                {formData.digitalDeliveryType === 'license' && '🔑 Le client recevra uniquement une clé de licence/activation après achat.'}
                {formData.digitalDeliveryType === 'both' && '📦 Le client recevra un lien de téléchargement ET une clé de licence après achat.'}
              </p>
            </div>

            {/* Download URL Section - Only show if delivery type includes URL */}
            {(formData.digitalDeliveryType === 'url' || formData.digitalDeliveryType === 'both') && (
              <div className="space-y-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <Label htmlFor="fileUrl" className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  Download URL
                </Label>
                <Input
                  id="fileUrl"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="https://storage.example.com/file.zip"
                  required={formData.digitalDeliveryType === 'url' || formData.digitalDeliveryType === 'both'}
                />
                <p className="text-xs text-muted-foreground">
                  Direct download link for the digital product (e.g., cloud storage URL, file hosting link)
                </p>
              </div>
            )}

            {/* License Key Section - Only show if delivery type includes license */}
            {(formData.digitalDeliveryType === 'license' || formData.digitalDeliveryType === 'both') && (
              <div className="space-y-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-500" />
                    License Key
                  </Label>
                </div>

                {/* Toggle for auto vs custom */}
                <div className="flex items-center space-x-2 p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded">
                  <Switch
                    id="autoGenerateLicense"
                    checked={formData.autoGenerateLicense}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      autoGenerateLicense: checked,
                      licenseKey: checked ? '' : formData.licenseKey
                    })}
                  />
                  <Label htmlFor="autoGenerateLicense" className="text-sm cursor-pointer">
                    Auto-generate license key for each purchase
                  </Label>
                </div>

                {formData.autoGenerateLicense ? (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded text-sm">
                    <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Automatic license generation enabled
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                      A unique license key (format: XXXX-XXXX-XXXX-XXXX) will be generated for each customer upon purchase.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="licenseKey" className="text-sm">Custom License Key / Template</Label>
                    <Input
                      id="licenseKey"
                      value={formData.licenseKey}
                      onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                      placeholder="PROD-XXXX-XXXX-XXXX or your-custom-key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a fixed license key (same for all customers) or use XXXX as placeholders for random characters.
                    </p>
                  </div>
                )}

                {/* License Instructions */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="licenseInstructions" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Activation Instructions (Optional)
                  </Label>
                  <Textarea
                    id="licenseInstructions"
                    value={formData.licenseInstructions}
                    onChange={(e) => setFormData({ ...formData, licenseInstructions: e.target.value })}
                    placeholder="1. Go to Settings > License&#10;2. Enter your license key&#10;3. Click Activate"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Instructions shown to the customer after purchase explaining how to activate their product.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointment Product Configuration */}
        {formData.type === 'appointment' && (
          <div className="space-y-4 border p-4 rounded-md bg-purple-50 dark:bg-purple-950/20">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointment Configuration
            </h3>

            <div className="space-y-2">
              <Label>Appointment Mode</Label>
              <Select
                value={formData.appointmentMode}
                onValueChange={(value) => setFormData({ ...formData, appointmentMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packaged">
                    <div className="flex flex-col">
                      <span className="font-medium">Packaged (Fixed Price)</span>
                      <span className="text-xs text-muted-foreground">Payment required before appointment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hourly">
                    <div className="flex flex-col">
                      <span className="font-medium">Hourly Rate</span>
                      <span className="text-xs text-muted-foreground">No upfront payment - billed after session</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.appointmentMode === 'packaged'
                  ? '💰 Customer pays the fixed price, then books an appointment'
                  : '📅 Customer books an appointment first, billing comes later based on actual time'}
              </p>
            </div>

            {formData.appointmentMode === 'hourly' && (
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (for display only)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="150.00"
                />
                <p className="text-xs text-muted-foreground">
                  Indicative hourly rate displayed to customers. No payment collected at booking.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentDuration">Session Duration (minutes)</Label>
                <Select
                  value={formData.appointmentDuration}
                  onValueChange={(value) => setFormData({ ...formData, appointmentDuration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outlookEventTypeId">Outlook Event Type ID</Label>
                <Input
                  id="outlookEventTypeId"
                  value={formData.outlookEventTypeId}
                  onChange={(e) => setFormData({ ...formData, outlookEventTypeId: e.target.value })}
                  placeholder="Event Type ID"
                />
              </div>
            </div>
          </div>
        )}

        {/* Payment Type Section - For digital and appointment types only */}
        {(formData.type === 'digital' || formData.type === 'appointment') && (
          <div className="space-y-4 border p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
            <h3 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Type
            </h3>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select
                value={formData.paymentType}
                onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">One-time Payment</span>
                        <span className="text-xs text-muted-foreground">Single payment at purchase</span>
                      </div>
                    </div>
                  </SelectItem>
                  {formData.type === 'appointment' && (
                    <SelectItem value="hourly">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <div className="flex flex-col">
                          <span className="font-medium">Hourly Rate</span>
                          <span className="text-xs text-muted-foreground">Billed after session based on time</span>
                        </div>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="subscription">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-indigo-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Subscription</span>
                        <span className="text-xs text-muted-foreground">Recurring weekly, monthly or yearly</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.paymentType === 'one_time' && 'The customer pays once at the time of purchase.'}
                {formData.paymentType === 'hourly' && 'Display-only rate. Billing will be handled separately after the session.'}
                {formData.paymentType === 'subscription' && 'The customer subscribes and is billed on a recurring basis via Stripe.'}
              </p>
            </div>

            {/* Hourly Rate Display Module */}
            {formData.paymentType === 'hourly' && (
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded text-sm">
                <p className="text-orange-800 dark:text-orange-200 font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hourly billing mode
                </p>
                <p className="text-orange-700 dark:text-orange-300 text-xs mt-1">
                  The hourly rate configured in the appointment section will be displayed to the customer.
                  Actual billing will be managed through Stripe after the session.
                </p>
              </div>
            )}

            {/* Subscription Pricing Fields */}
            {formData.paymentType === 'subscription' && (
              <div className="space-y-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded">
                <p className="text-indigo-800 dark:text-indigo-200 font-medium flex items-center gap-2 text-sm">
                  <Repeat className="h-4 w-4" />
                  Recurrence Periods
                </p>

                {/* Recurrence Type Selection Buttons */}
                <div className="space-y-3">
                  <Label className="text-sm">Subscription periods offered</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Weekly Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !enabledRecurrences.weekly
                        setEnabledRecurrences({ ...enabledRecurrences, weekly: newValue })
                        // Clear price if disabled
                        if (!newValue) {
                          setFormData({ ...formData, subscriptionPriceWeekly: "" })
                        }
                      }}
                      className={`
                        relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                        ${enabledRecurrences.weekly
                          ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 shadow-sm'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300'
                        }
                      `}
                    >
                      {enabledRecurrences.weekly && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      <Calendar className={`h-6 w-6 mb-2 ${
                        enabledRecurrences.weekly ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
                      }`} />
                      <span className={`font-medium text-sm ${
                        enabledRecurrences.weekly ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        Weekly
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">Every week</span>
                    </button>

                    {/* Monthly Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !enabledRecurrences.monthly
                        setEnabledRecurrences({ ...enabledRecurrences, monthly: newValue })
                        // Clear price if disabled
                        if (!newValue) {
                          setFormData({ ...formData, subscriptionPriceMonthly: "" })
                        }
                      }}
                      className={`
                        relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                        ${enabledRecurrences.monthly
                          ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 shadow-sm'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300'
                        }
                      `}
                    >
                      {enabledRecurrences.monthly && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      <Calendar className={`h-6 w-6 mb-2 ${
                        enabledRecurrences.monthly ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
                      }`} />
                      <span className={`font-medium text-sm ${
                        enabledRecurrences.monthly ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        Monthly
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">Every month</span>
                    </button>

                    {/* Yearly Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !enabledRecurrences.yearly
                        setEnabledRecurrences({ ...enabledRecurrences, yearly: newValue })
                        // Clear price if disabled
                        if (!newValue) {
                          setFormData({ ...formData, subscriptionPriceYearly: "" })
                        }
                      }}
                      className={`
                        relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                        ${enabledRecurrences.yearly
                          ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 shadow-sm'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300'
                        }
                      `}
                    >
                      {enabledRecurrences.yearly && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                      <Calendar className={`h-6 w-6 mb-2 ${
                        enabledRecurrences.yearly ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
                      }`} />
                      <span className={`font-medium text-sm ${
                        enabledRecurrences.yearly ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        Yearly
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">Every year</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select the subscription periods you want to offer for this product.
                  </p>
                </div>

                {/* Price Fields - Only show for enabled recurrences */}
                {(enabledRecurrences.weekly || enabledRecurrences.monthly || enabledRecurrences.yearly) && (
                  <div className="space-y-3 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                    <Label className="text-sm font-medium">Price per period (excl. VAT)</Label>
                    <div className="grid gap-3" style={{
                      gridTemplateColumns: `repeat(${[enabledRecurrences.weekly, enabledRecurrences.monthly, enabledRecurrences.yearly].filter(Boolean).length}, 1fr)`
                    }}>
                      {/* Weekly Price Field */}
                      {enabledRecurrences.weekly && (
                        <div className="space-y-2">
                          <Label htmlFor="subscriptionPriceWeekly" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Weekly
                          </Label>
                          <div className="relative">
                            <Input
                              id="subscriptionPriceWeekly"
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={formData.subscriptionPriceWeekly}
                              onChange={(e) => setFormData({ ...formData, subscriptionPriceWeekly: e.target.value })}
                              placeholder="9.99"
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {formData.currency}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Per week</p>
                        </div>
                      )}

                      {/* Monthly Price Field */}
                      {enabledRecurrences.monthly && (
                        <div className="space-y-2">
                          <Label htmlFor="subscriptionPriceMonthly" className="text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Monthly
                          </Label>
                          <div className="relative">
                            <Input
                              id="subscriptionPriceMonthly"
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={formData.subscriptionPriceMonthly}
                              onChange={(e) => setFormData({ ...formData, subscriptionPriceMonthly: e.target.value })}
                              placeholder="29.99"
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {formData.currency}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Per month</p>
                        </div>
                      )}

                      {/* Yearly Price Field */}
                      {enabledRecurrences.yearly && (
                        <div className="space-y-2">
                          <Label htmlFor="subscriptionPriceYearly" className="text-xs flex items-center gap-1">
                            <Repeat className="h-3 w-3" />
                            Yearly
                          </Label>
                          <div className="relative">
                            <Input
                              id="subscriptionPriceYearly"
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={formData.subscriptionPriceYearly}
                              onChange={(e) => setFormData({ ...formData, subscriptionPriceYearly: e.target.value })}
                              placeholder="249.99"
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {formData.currency}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Per year</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground bg-white dark:bg-gray-900 p-2 rounded border">
                      Prices are excluding VAT and will be connected to Stripe billing plans.
                    </p>
                  </div>
                )}

                {/* Warning if no recurrence selected */}
                {!enabledRecurrences.weekly && !enabledRecurrences.monthly && !enabledRecurrences.yearly && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Please select at least one subscription period
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pricing Section - For paid products only */}
        {requiresPayment && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price {formData.type === 'consulting' && formData.appointmentMode === 'packaged' ? '(Package)' : ''} Excl. VAT</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required={requiresPayment}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vatRateId">VAT Rate</Label>
                <div className="flex items-center gap-2">
                  {requiresPayment && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-brand hover:text-[#B26B27] hover:bg-brand/10"
                      onClick={() => {
                        setShowCouponForm(true)
                        couponSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                    >
                      <Ticket className="h-3 w-3 mr-1" />
                      Manage Coupons
                    </Button>
                  )}
                  <Link href="/admin/vat-rates" className="text-xs text-brand hover:underline">
                    Manage VAT
                  </Link>
                </div>
              </div>
              <Select
                value={formData.vatRateId}
                onValueChange={(value) => setFormData({ ...formData, vatRateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select VAT rate" />
                </SelectTrigger>
                <SelectContent>
                  {vatRates.filter(r => r.isActive).map(rate => (
                    <SelectItem key={rate.id} value={rate.id}>
                      <div className="flex items-center gap-2">
                        <span>{rate.name}</span>
                        <span className="text-muted-foreground">({(rate.rate / 100).toFixed(2)}%)</span>
                        {rate.isDefault && <span className="text-xs text-brand">Default</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Currency - All Types */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 border p-4 rounded-md">
          <Label>Upsell Configuration</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Select a product to offer as an upsell during checkout.
          </p>
          <Select
            value={formData.upsellProductId}
            onValueChange={(value) => setFormData({ ...formData, upsellProductId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an upsell product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {products.filter(p => p.id !== initialData?.id).map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isPublished"
              checked={formData.isPublished}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
            />
            <Label htmlFor="isPublished">Published</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isFeatured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
            />
            <Label htmlFor="isFeatured" className="flex items-center gap-2">
              Most Popular
            </Label>
          </div>
        </div>

        {/* Discount Coupons Section */}
        {requiresPayment && (initialData?.id || formData.price) && (
          <div
            ref={couponSectionRef}
            className="space-y-4 border p-4 rounded-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium">Discount Coupons</h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCouponForm(!showCouponForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </div>

            {/* Create Coupon Form */}
            {showCouponForm && (
              <form onSubmit={handleCreateCoupon} className="space-y-4 border p-4 rounded-md bg-white dark:bg-gray-900">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponCode">Coupon Code *</Label>
                    <Input
                      id="couponCode"
                      value={couponFormData.code}
                      onChange={(e) => setCouponFormData({...couponFormData, code: e.target.value.toUpperCase()})}
                      placeholder="SUMMER2024"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couponDiscountType">Discount Type *</Label>
                    <Select
                      value={couponFormData.discountType}
                      onValueChange={(value) => setCouponFormData({...couponFormData, discountType: value, discountValue: ""})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponDiscountValue">
                      {couponFormData.discountType === 'percentage' ? 'Percentage (%)' : 'Amount (€)'} *
                    </Label>
                    <Input
                      id="couponDiscountValue"
                      type="number"
                      step={couponFormData.discountType === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={couponFormData.discountType === 'percentage' ? '100' : undefined}
                      value={couponFormData.discountValue}
                      onChange={(e) => setCouponFormData({...couponFormData, discountValue: e.target.value})}
                      placeholder={couponFormData.discountType === 'percentage' ? '20' : '10.00'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couponUsageLimit">Usage Limit</Label>
                    <Input
                      id="couponUsageLimit"
                      type="number"
                      min="1"
                      value={couponFormData.usageLimit}
                      onChange={(e) => setCouponFormData({...couponFormData, usageLimit: e.target.value})}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="couponDescription">Description</Label>
                  <Textarea
                    id="couponDescription"
                    value={couponFormData.description}
                    onChange={(e) => setCouponFormData({...couponFormData, description: e.target.value})}
                    placeholder="Summer promotion - 20% off this product"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponStartDate">Start Date</Label>
                    <Input
                      id="couponStartDate"
                      type="date"
                      value={couponFormData.startDate}
                      onChange={(e) => setCouponFormData({...couponFormData, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couponEndDate">End Date</Label>
                    <Input
                      id="couponEndDate"
                      type="date"
                      value={couponFormData.endDate}
                      onChange={(e) => setCouponFormData({...couponFormData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={couponLoading} size="sm">
                    {couponLoading ? "Creating..." : "Create Coupon"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCouponForm(false)
                      setCouponFormData({
                        code: "",
                        description: "",
                        discountType: "percentage",
                        discountValue: "",
                        startDate: "",
                        endDate: "",
                        usageLimit: "",
                      })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {pendingCoupon && !initialData?.id && (
              <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Coupon will be created after the product is saved.
                </p>
              </div>
            )}

            {/* Existing Coupons List */}
            {coupons.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {coupons.length} coupon{coupons.length > 1 ? 's' : ''} applicable to this product:
                </p>
                <div className="space-y-2">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-white dark:bg-gray-900"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm font-bold">
                            {coupon.code}
                          </code>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% off`
                            : `€${(coupon.discountValue / 100).toFixed(2)} off`}
                          {coupon.description && ` - ${coupon.description}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Used: {coupon.usageCount}/{coupon.usageLimit || '∞'}
                          {coupon.endDate && ` • Expires: ${new Date(coupon.endDate).toLocaleDateString('en-US')}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No coupons created for this product yet.
              </p>
            )}
          </div>
        )}

        {!initialData?.id && requiresPayment && formData.price && (
          <div className="border p-4 rounded-md bg-blue-50 dark:bg-blue-950/20">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Save the product to activate the promo code.
            </p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : (initialData ? "Update Product" : "Create Product")}
        </Button>
      </form>
    </div>
  )
}
