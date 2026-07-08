"use client"

import { useState, useRef, useId } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Upload, X, Building2 } from "lucide-react"
import { CroppedFileInput, type CroppedFileInputHandle } from "@/components/ui/cropped-file-input"

interface CompanyCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isLoading: boolean
}

export function CompanyCreateSheet({ open, onOpenChange, onSave, isLoading }: CompanyCreateSheetProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<CroppedFileInputHandle>(null)
  // useId() rather than a hardcoded string: a hardcoded form id would collide
  // (and silently break the file input's `form=` association) if this sheet
  // is ever mounted more than once at a time, as its user-management sibling
  // (UserCreateSheet) already is for separate desktop/mobile render paths.
  const formId = useId()

  const handleLogoReady = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    fileInputRef.current?.clear()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle>Create New Company</SheetTitle>
          <SheetDescription>
            Add a new company organization to the platform.
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
              <CroppedFileInput
                ref={fileInputRef}
                onFileReady={handleLogoReady}
                fileName="logo.png"
                name="logo"
                form={formId}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.open()}
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
              <p className="text-xs text-muted-foreground">Optional company logo</p>
            </div>
          </div>
        </div>

        <form id={formId} onSubmit={onSave} className="space-y-6">
          {/* Basic Company Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Company Name *</Label>
                <Input
                  id="create-name"
                  name="name"
                  required
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  name="email"
                  type="email"
                  required
                  placeholder="contact@acme.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  name="phone"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-siret">SIRET</Label>
                <Input
                  id="create-siret"
                  name="siret"
                  placeholder="123 456 789 00012"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-vatNumber">VAT Number</Label>
              <Input
                id="create-vatNumber"
                name="vatNumber"
                placeholder="FR12345678901"
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h3 className="font-medium text-sm">Address Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="create-address">Street Address</Label>
              <Input
                id="create-address"
                name="address"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-city">City</Label>
                <Input
                  id="create-city"
                  name="city"
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-zipCode">Zip Code</Label>
                <Input
                  id="create-zipCode"
                  name="zipCode"
                  placeholder="75001"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand hover:bg-brand-hover"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
