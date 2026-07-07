"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteCoupon, upsertCoupon } from "@/app/actions/coupons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Trash, 
  Pencil, 
  Plus, 
  Copy, 
  Check,
  Calendar,
  Percent,
  Euro,
  Users,
  TrendingUp,
  X
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

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

interface Product {
  id: string
  title: string
  price: number
}

interface CouponsTableProps {
  coupons: Coupon[]
  products: Product[]
}

export function CouponsTable({ coupons, products }: CouponsTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minPurchaseAmount: "",
    maxDiscountAmount: "",
    usageLimit: "",
    perUserLimit: "",
    startDate: "",
    endDate: "",
    applicableProducts: [] as string[],
    excludedProducts: [] as string[],
    isActive: true
  })

  const handleDelete = async () => {
    if (!deleteId) return
    
    const result = await deleteCoupon(deleteId)
    if (result.success) {
      toast.success("Coupon deleted")
      router.refresh()
    } else {
      toast.error("Failed to delete coupon")
    }
    setDeleteId(null)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountType === 'percentage' 
        ? coupon.discountValue.toString() 
        : (coupon.discountValue / 100).toFixed(2),
      minPurchaseAmount: coupon.minPurchaseAmount ? (coupon.minPurchaseAmount / 100).toFixed(2) : "",
      maxDiscountAmount: coupon.maxDiscountAmount ? (coupon.maxDiscountAmount / 100).toFixed(2) : "",
      usageLimit: coupon.usageLimit?.toString() || "",
      perUserLimit: coupon.perUserLimit?.toString() || "",
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : "",
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : "",
      applicableProducts: (coupon.applicableProducts as string[]) || [],
      excludedProducts: (coupon.excludedProducts as string[]) || [],
      isActive: coupon.isActive
    })
  }

  const handleCreate = () => {
    setIsCreating(true)
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minPurchaseAmount: "",
      maxDiscountAmount: "",
      usageLimit: "",
      perUserLimit: "",
      startDate: "",
      endDate: "",
      applicableProducts: [],
      excludedProducts: [],
      isActive: true
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const discountValue = formData.discountType === 'percentage'
        ? parseInt(formData.discountValue)
        : Math.round(parseFloat(formData.discountValue) * 100)

      const result = await upsertCoupon({
        id: editingCoupon?.id,
        code: formData.code,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue: discountValue,
        minPurchaseAmount: formData.minPurchaseAmount ? Math.round(parseFloat(formData.minPurchaseAmount) * 100) : null,
        maxDiscountAmount: formData.maxDiscountAmount ? Math.round(parseFloat(formData.maxDiscountAmount) * 100) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit) : null,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : null,
        excludedProducts: formData.excludedProducts.length > 0 ? formData.excludedProducts : null,
        isActive: formData.isActive
      })

      if (result.success) {
        toast.success(editingCoupon ? "Coupon updated" : "Coupon created")
        setEditingCoupon(null)
        setIsCreating(false)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to save coupon")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copied to clipboard")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const toggleProductSelection = (productId: string, field: 'applicableProducts' | 'excludedProducts') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(productId)
        ? prev[field].filter(id => id !== productId)
        : [...prev[field], productId]
    }))
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date()
    
    if (!coupon.isActive) return { label: "Inactive", color: "bg-gray-500" }
    if (coupon.startDate && new Date(coupon.startDate) > now) return { label: "Scheduled", color: "bg-blue-500" }
    if (coupon.endDate && new Date(coupon.endDate) < now) return { label: "Expired", color: "bg-orange-500" }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { label: "Used Up", color: "bg-red-500" }
    return { label: "Active", color: "bg-green-500" }
  }

  return (
    <>
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Coupons</h2>
          <Button onClick={handleCreate} className="bg-brand hover:bg-brand-hover">
            <Plus className="mr-2 h-4 w-4" />
            Add Coupon
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No coupons found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const status = getCouponStatus(coupon)
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm font-bold">
                          {coupon.code}
                        </code>
                        <Button
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
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {coupon.description || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {coupon.discountType === 'percentage' ? (
                          <>
                            <Percent className="h-3 w-3" />
                            {coupon.discountValue}%
                          </>
                        ) : (
                          <>
                            <Euro className="h-3 w-3" />
                            {(coupon.discountValue / 100).toFixed(2)} €
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {coupon.usageCount}
                        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {coupon.startDate && (
                          <div className="text-muted-foreground">
                            From: {formatDate(coupon.startDate)}
                          </div>
                        )}
                        {coupon.endDate && (
                          <div className="text-muted-foreground">
                            To: {formatDate(coupon.endDate)}
                          </div>
                        )}
                        {!coupon.startDate && !coupon.endDate && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-white`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteId(coupon.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={!!editingCoupon || isCreating} onOpenChange={(open) => {
        if (!open) {
          setEditingCoupon(null)
          setIsCreating(false)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon 
                ? "Modify the coupon details below" 
                : "Fill in the details to create a new discount coupon"
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code and Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SUMMER2024"
                  required
                  disabled={!!editingCoupon}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setFormData({...formData, isActive: value === "active"})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Summer promotion - 20% off all products"
                rows={2}
              />
            </div>

            {/* Discount Type and Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => setFormData({...formData, discountType: value, discountValue: ""})}
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

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === 'percentage' ? 'Percentage' : 'Amount (€)'} *
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                  placeholder={formData.discountType === 'percentage' ? '20' : '10.00'}
                  step={formData.discountType === 'percentage' ? '1' : '0.01'}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Minimum and Maximum */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchaseAmount">Min Purchase Amount (€)</Label>
                <Input
                  id="minPurchaseAmount"
                  type="number"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => setFormData({...formData, minPurchaseAmount: e.target.value})}
                  placeholder="50.00"
                  step="0.01"
                  min="0"
                />
              </div>

              {formData.discountType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="maxDiscountAmount">Max Discount Amount (€)</Label>
                  <Input
                    id="maxDiscountAmount"
                    type="number"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({...formData, maxDiscountAmount: e.target.value})}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}
            </div>

            {/* Usage Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Total Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                  placeholder="100"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="perUserLimit">Per User Limit</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({...formData, perUserLimit: e.target.value})}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
            </div>

            {/* Product Selection */}
            {products.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Applicable Products (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select products this coupon applies to. Leave empty for all products.
                  </p>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`applicable-${product.id}`}
                          checked={formData.applicableProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id, 'applicableProducts')}
                        />
                        <label
                          htmlFor={`applicable-${product.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {product.title} - {(product.price / 100).toFixed(2)} €
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Excluded Products (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select products this coupon cannot be used with.
                  </p>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                    {products.map(product => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`excluded-${product.id}`}
                          checked={formData.excludedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id, 'excludedProducts')}
                        />
                        <label
                          htmlFor={`excluded-${product.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {product.title} - {(product.price / 100).toFixed(2)} €
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingCoupon(null)
                  setIsCreating(false)
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-brand hover:bg-brand-hover"
              >
                {loading ? "Saving..." : (editingCoupon ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this coupon? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
