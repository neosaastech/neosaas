"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface VatRateFormProps {
  initialData?: {
    id: string
    name: string
    country: string
    rate: number
    description: string | null
    isDefault: boolean
    isActive: boolean
  }
}

const COUNTRIES = [
  { code: "ALL", name: "All Countries" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "GB", name: "United Kingdom" },
  { code: "BE", name: "Belgium" },
  { code: "NL", name: "Netherlands" },
  { code: "PT", name: "Portugal" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "GR", name: "Greece" },
  { code: "HR", name: "Croatia" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" },
  { code: "LU", name: "Luxembourg" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "NO", name: "Norway" },
]

export function VatRateForm({ initialData }: VatRateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    country: initialData?.country || "FR",
    rate: initialData?.rate ? (initialData.rate / 100).toString() : "",
    description: initialData?.description || "",
    isDefault: initialData?.isDefault || false,
    isActive: initialData?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const rateInBasisPoints = Math.round(parseFloat(formData.rate) * 100)
      
      const payload = {
        name: formData.name,
        country: formData.country,
        rate: rateInBasisPoints,
        description: formData.description || null,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      }

      const url = initialData 
        ? `/api/admin/vat-rates/${initialData.id}`
        : "/api/admin/vat-rates"
      
      const method = initialData ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(initialData ? "VAT rate updated" : "VAT rate created")
        router.push("/admin/vat-rates")
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to save VAT rate")
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
        <Link href="/admin/vat-rates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {initialData ? "Edit VAT Rate" : "New VAT Rate"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg bg-card">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            required
            placeholder="e.g., France Standard VAT"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData({ ...formData, country: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate">Rate (%) *</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              placeholder="20.00"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Optional description of this VAT rate..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isDefault">Default for Country</Label>
              <p className="text-sm text-muted-foreground">
                Use this rate as the default for this country
              </p>
            </div>
            <Switch
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                Make this rate available for use
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : (initialData ? "Update VAT Rate" : "Create VAT Rate")}
        </Button>
      </form>
    </div>
  )
}
