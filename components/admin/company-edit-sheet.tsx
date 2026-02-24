"use client"

import { useState, useRef } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Upload, X } from "lucide-react"

interface Company {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
  siret?: string | null
  vatNumber?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
}

interface CompanyEditSheetProps {
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isLoading: boolean
}

export function CompanyEditSheet({ company, open, onOpenChange, onSave, isLoading }: CompanyEditSheetProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!company) return null

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle>Edit Company</SheetTitle>
          <SheetDescription>
            Update company information and details.
          </SheetDescription>
        </SheetHeader>

        {/* Company Logo - Positioned at top with overflow effect */}
        <div className="relative -mt-4 mb-8">
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg rounded-lg">
              {logoPreview ? (
                <img src={logoPreview} alt="Company logo" className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg">
                  <Building2 className="h-10 w-10" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          
          <div className="pt-16 pb-4 bg-gradient-to-b from-muted/50 to-transparent rounded-lg border border-dashed border-muted-foreground/20">
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="text-center">
                <p className="font-semibold">{company.name}</p>
                <p className="text-sm text-muted-foreground">{company.email}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                name="logo"
                onChange={handleLogoUpload}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {/* Metadata Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{new Date(company.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">{new Date(company.createdAt).toLocaleTimeString()}</p>
            </div>
            {company.updatedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">{new Date(company.updatedAt).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(company.updatedAt).toLocaleTimeString()}</p>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={company.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={company.email}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={company.phone || ""}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-siret">SIRET</Label>
              <Input
                id="edit-siret"
                name="siret"
                defaultValue={company.siret || ""}
                placeholder="123 456 789 00010"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-vatNumber">VAT Number</Label>
            <Input
              id="edit-vatNumber"
              name="vatNumber"
              defaultValue={company.vatNumber || ""}
              placeholder="FR12345678901"
            />
          </div>

          {/* Address Info */}
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              name="address"
              defaultValue={company.address || ""}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                name="city"
                defaultValue={company.city || ""}
                placeholder="Paris"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zipCode">Zip Code</Label>
              <Input
                id="edit-zipCode"
                name="zipCode"
                defaultValue={company.zipCode || ""}
                placeholder="75001"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-brand hover:bg-brand-hover"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
