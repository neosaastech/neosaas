"use client"

import { useState, useRef } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, User } from "lucide-react"

interface Company {
  id: string
  name: string
  email: string
}

interface UserCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  companies: Company[]
  isLoading: boolean
}

export function UserCreateSheet({ open, onOpenChange, onSave, companies, isLoading }: UserCreateSheetProps) {
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setProfileImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle>Create New User</SheetTitle>
          <SheetDescription>
            Add a new user to the platform with role assignment.
          </SheetDescription>
        </SheetHeader>

        {/* Profile Image - Positioned at top with overflow effect */}
        <div className="relative -mt-4 mb-8">
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profileImagePreview || ""} alt="New user" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-brand to-brand-hover text-white">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="pt-16 pb-4 bg-gradient-to-b from-muted/50 to-transparent rounded-lg border border-dashed border-muted-foreground/20">
            <div className="flex flex-col items-center gap-2 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                name="profileImage"
                onChange={handleImageUpload}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                {profileImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Optional profile picture</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username (Optional)</Label>
              <Input
                id="create-username"
                name="username"
                placeholder="john_doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-firstName">First Name *</Label>
                <Input
                  id="create-firstName"
                  name="firstName"
                  required
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-lastName">Last Name *</Label>
                <Input
                  id="create-lastName"
                  name="lastName"
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  name="email"
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  name="phone"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                name="password"
                type="password"
                required
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          {/* Company & Role Assignment */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <h3 className="font-medium text-sm">Assignment</h3>
            
            <div className="space-y-2">
              <Label htmlFor="create-companyId">Company</Label>
              <Select name="companyId" defaultValue="none">
                <SelectTrigger id="create-companyId">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Company (Platform Admin)</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-role">Role *</Label>
              <Select name="role" defaultValue="reader">
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reader">Company Reader</SelectItem>
                  <SelectItem value="writer">Company Writer</SelectItem>
                  <SelectItem value="admin">Platform Admin</SelectItem>
                  <SelectItem value="super_admin">Platform Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-position">Position / Job Title</Label>
              <Input
                id="create-position"
                name="position"
                placeholder="CEO, Developer, Manager..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                name="address"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-city">City</Label>
                <Input
                  id="create-city"
                  name="city"
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-postalCode">Postal Code</Label>
                <Input
                  id="create-postalCode"
                  name="postalCode"
                  placeholder="75001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-country">Country</Label>
                <Input
                  id="create-country"
                  name="country"
                  placeholder="France"
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
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
