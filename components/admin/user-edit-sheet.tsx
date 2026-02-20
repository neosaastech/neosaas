"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
}

interface User {
  id: string
  username?: string | null
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  position?: string | null
  profileImage?: string | null
  companyId: string | null
  isActive: boolean
  isSiteManager: boolean
  isDpo?: boolean
  company?: Company | null
  userRoles: {
    role: {
      name: string
      scope: string
    }
  }[]
  createdAt: Date
  updatedAt?: Date
}

interface UserEditSheetProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  companies: Company[]
  isLoading: boolean
}

export function UserEditSheet({ user, open, onOpenChange, onSave, companies, isLoading }: UserEditSheetProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedCompany, setSelectedCompany] = useState(user?.companyId || "none")
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user?.profileImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Synchroniser l'état local quand user change
  useEffect(() => {
    if (user) {
      setSelectedCompany(user.companyId || "none")
      setProfileImagePreview(user.profileImage || null)
    }
  }, [user])

  if (!user) return null

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

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    company.email.toLowerCase().includes(searchValue.toLowerCase())
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-8">
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Update user information, company assignment, and profile image.
          </SheetDescription>
        </SheetHeader>

        {/* Profile Image - Positioned at top with overflow effect */}
        <div className="relative -mt-4 mb-8">
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profileImagePreview || user.profileImage || ""} alt={user.username || "User"} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-brand to-brand-hover text-white">
                {user.firstName[0]}{user.lastName[0]}
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
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {/* Metadata Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleTimeString()}</p>
            </div>
            {user.updatedAt && (
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">{new Date(user.updatedAt).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(user.updatedAt).toLocaleTimeString()}</p>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="edit-username">Username (Optional)</Label>
            <Input
              id="edit-username"
              name="username"
              defaultValue={user.username || ""}
              placeholder="john_doe"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                defaultValue={user.firstName}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                defaultValue={user.lastName}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={user.phone || ""}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>

          {/* Company Selection with Combobox */}
          <div className="space-y-2">
            <Label>Company</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between"
                >
                  {selectedCompany === "none"
                    ? "No Company (Platform Admin)"
                    : companies.find((company) => company.id === selectedCompany)?.name || "Select company..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search company..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandEmpty>No company found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        setSelectedCompany("none")
                        setSearchOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompany === "none" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      No Company (Platform Admin)
                    </CommandItem>
                    {filteredCompanies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.id}
                        onSelect={(currentValue) => {
                          setSelectedCompany(currentValue)
                          setSearchOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompany === company.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{company.name}</span>
                          <span className="text-xs text-muted-foreground">{company.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <input type="hidden" name="companyId" value={selectedCompany} />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select name="role" defaultValue={user.userRoles[0]?.role.name || "reader"}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Company</Badge>
                    Reader
                  </div>
                </SelectItem>
                <SelectItem value="writer">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Company</Badge>
                    Writer
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Platform</Badge>
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="super_admin">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Platform</Badge>
                    Super Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="edit-position">Position / Job Title</Label>
            <Input
              id="edit-position"
              name="position"
              defaultValue={user.position || ""}
              placeholder="CEO, Developer, Manager..."
            />
          </div>

          {/* Address Info */}
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              name="address"
              defaultValue={user.address || ""}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                name="city"
                defaultValue={user.city || ""}
                placeholder="Paris"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postalCode">Postal Code</Label>
              <Input
                id="edit-postalCode"
                name="postalCode"
                defaultValue={user.postalCode || ""}
                placeholder="75001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
              <Input
                id="edit-country"
                name="country"
                defaultValue={user.country || ""}
                placeholder="France"
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
