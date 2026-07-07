"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash, Star, X, Check, Percent } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface VatRate {
  id: string
  name: string
  country: string
  rate: number
  isDefault: boolean
  isActive: boolean
}

interface VatRatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRatesUpdated?: (rates: VatRate[]) => void
}

export function VatRatesDialog({ open, onOpenChange, onRatesUpdated }: VatRatesDialogProps) {
  const [vatRates, setVatRates] = useState<VatRate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    rate: "",
    isActive: true,
  })

  const fetchVatRates = async () => {
    try {
      const response = await fetch('/api/admin/vat-rates')
      if (response.ok) {
        const data = await response.json()
        setVatRates(data)
        // Appeler le callback immédiatement avec les données à jour
        onRatesUpdated?.(data)
      }
    } catch (error) {
      console.error('Failed to fetch VAT rates:', error)
    }
  }

  useEffect(() => {
    if (open) {
      fetchVatRates()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingId 
        ? `/api/admin/vat-rates/${editingId}` 
        : '/api/admin/vat-rates'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          rate: parseFloat(formData.rate) * 100, // Convert to basis points
          isActive: formData.isActive,
        }),
      })

      if (response.ok) {
        toast.success(editingId ? 'VAT rate updated' : 'VAT rate created')
        setFormData({ name: "", country: "", rate: "", isActive: true })
        setEditingId(null)
        await fetchVatRates()
      } else {
        toast.error('Failed to save VAT rate')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rate: VatRate) => {
    setEditingId(rate.id)
    setFormData({
      name: rate.name,
      country: rate.country,
      rate: (rate.rate / 100).toString(),
      isActive: rate.isActive,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this VAT rate?')) return

    try {
      const response = await fetch(`/api/admin/vat-rates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('VAT rate deleted')
        await fetchVatRates()
      } else {
        toast.error('Failed to delete VAT rate')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/vat-rates/${id}/set-default`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Default VAT rate updated')
        await fetchVatRates()
      } else {
        toast.error('Failed to set default')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/vat-rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })

      if (response.ok) {
        toast.success(currentActive ? 'VAT rate deactivated' : 'VAT rate activated')
        await fetchVatRates()
      }
    } catch (error) {
      toast.error('Failed to toggle status')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/20">
              <Percent className="h-5 w-5 text-brand" />
            </div>
            <span>Manage VAT Rates</span>
          </SheetTitle>
          <SheetDescription>
            Configure VAT rates for your products. Set a default rate for new products.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Add/Edit Form */}
          <form onSubmit={handleSubmit} className="p-4 rounded-lg border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingId ? 'Edit VAT Rate' : 'Add New VAT Rate'}
              </h3>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: "", country: "", rate: "", isActive: true })
                  }}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel Edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard VAT"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-xs">Country *</Label>
                <Input
                  id="country"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., FR"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate" className="text-xs">Rate (%) *</Label>
                <div className="relative">
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="e.g., 20.00"
                    className="h-9 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex items-end space-x-2 pb-1">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive" className="text-xs">Active</Label>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-brand hover:bg-[#B26B27] h-9"
            >
              <Check className="h-4 w-4 mr-2" />
              {editingId ? 'Update VAT Rate' : 'Add VAT Rate'}
            </Button>
          </form>

          {/* VAT Rates Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Existing VAT Rates</h3>
            <div className="border rounded-lg">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vatRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.name}</TableCell>
                    <TableCell>{rate.country}</TableCell>
                    <TableCell>{(rate.rate / 100).toFixed(2)}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={rate.isActive}
                        onCheckedChange={() => handleToggleActive(rate.id, rate.isActive)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(rate.id)}
                        className="p-0 h-auto"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            rate.isDefault
                              ? 'fill-brand text-brand'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(rate)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleDelete(rate.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vatRates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No VAT rates configured yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
