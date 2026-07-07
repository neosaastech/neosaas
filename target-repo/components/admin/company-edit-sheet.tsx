"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CompanyLogoUpload } from "@/components/dashboard/company-logo-upload"

interface Company {
  id: string
  name: string
  email: string
  logo?: string | null
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
  if (!company) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle>Edit Company</SheetTitle>
          <SheetDescription>Update company information and details.</SheetDescription>
        </SheetHeader>

        <CompanyLogoUpload
          companyName={company.name}
          companyEmail={company.email}
          initialLogo={company.logo}
          uploadUrl={`/api/admin/companies/${company.id}/logo`}
          deleteUrl={`/api/admin/companies/${company.id}/logo`}
        />

        <form onSubmit={onSave} className="space-y-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input id="edit-name" name="name" defaultValue={company.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input id="edit-email" name="email" type="email" defaultValue={company.email} required />
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
              <Input id="edit-siret" name="siret" defaultValue={company.siret || ""} placeholder="123 456 789 00010" />
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

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input id="edit-address" name="address" defaultValue={company.address || ""} placeholder="123 Main Street" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" name="city" defaultValue={company.city || ""} placeholder="Paris" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zipCode">Zip Code</Label>
              <Input id="edit-zipCode" name="zipCode" defaultValue={company.zipCode || ""} placeholder="75001" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-brand hover:bg-brand-hover">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
