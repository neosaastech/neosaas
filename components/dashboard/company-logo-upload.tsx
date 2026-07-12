"use client"

import { useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Building2, Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { CroppedFileInput, type CroppedFileInputHandle } from "@/components/ui/cropped-file-input"

interface CompanyLogoUploadProps {
  companyName?: string
  companyEmail?: string
  initialLogo?: string | null
  uploadUrl: string
  deleteUrl?: string
  onLogoChange?: (logo: string | null) => void
  disabled?: boolean
}

export function CompanyLogoUpload({
  companyName,
  companyEmail,
  initialLogo = null,
  uploadUrl,
  deleteUrl,
  onLogoChange,
  disabled = false,
}: CompanyLogoUploadProps) {
  const fileInputRef = useRef<CroppedFileInputHandle>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo)
  const [isUploading, setIsUploading] = useState(false)

  const uploadLogo = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("logo", file)

      const response = await fetch(uploadUrl, { method: "POST", body: formData })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload logo")
      }

      const nextLogo = data.logo || data.company?.logo || null
      setLogoPreview(nextLogo)
      onLogoChange?.(nextLogo)
      window.dispatchEvent(new CustomEvent("companyLogoUpdated", { detail: { logo: nextLogo } }))
      toast.success("Company logo updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload logo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!deleteUrl && !logoPreview) return

    setIsUploading(true)
    try {
      if (deleteUrl) {
        const response = await fetch(deleteUrl, { method: "DELETE" })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to remove logo")
        }
      }

      setLogoPreview(null)
      onLogoChange?.(null)
      window.dispatchEvent(new CustomEvent("companyLogoUpdated", { detail: { logo: null } }))
      fileInputRef.current?.clear()
      toast.success("Logo removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove logo")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative -mt-2 mb-6">
      <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-10">
        <Avatar className="h-20 w-20 border-4 border-background shadow-lg rounded-lg">
          {logoPreview ? (
            <img src={logoPreview} alt="Company logo" className="h-full w-full object-cover rounded-lg" />
          ) : (
            <AvatarFallback className="rounded-lg bg-linear-to-br from-brand/80 to-brand text-white">
              <Building2 className="h-8 w-8" />
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <div className="pt-14 pb-4 bg-linear-to-b from-muted/50 to-transparent rounded-lg border border-dashed border-muted-foreground/20">
        <div className="flex flex-col items-center gap-2 pt-2">
          {(companyName || companyEmail) && (
            <div className="text-center">
              {companyName && <p className="font-semibold">{companyName}</p>}
              {companyEmail && <p className="text-sm text-muted-foreground">{companyEmail}</p>}
            </div>
          )}

          <CroppedFileInput ref={fileInputRef} onFileReady={uploadLogo} fileName="logo.png" />

          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.open()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {logoPreview ? "Change logo" : "Upload logo"}
            </Button>

            {logoPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isUploading}
                onClick={handleRemoveLogo}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">PNG, JPG or WebP — max 2MB</p>
        </div>
      </div>
    </div>
  )
}
