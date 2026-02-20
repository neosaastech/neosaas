"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Save, Pencil, Trash2, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { getUserRoleConfig } from "@/lib/status-configs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteUser } from "@/app/actions/users"

// Mock data for initial display (simulating DB data)
const INITIAL_USER = {
  id: "",
  username: "",
  firstName: "Musharof",
  lastName: "Chowdhury",
  role: "Team Manager",
  email: "randomuser@pimjo.com",
  phone: "+09 363 398 46",
  position: "Team Manager",
  address: "123 Main St",
  city: "Phoenix",
  state: "Arizona",
  postalCode: "ERT 2489",
  country: "United States",
  taxId: "AS4568384",
  profileImage: "/placeholder.svg",
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(INITIAL_USER)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load user data from API on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setUser({
            id: data.user.id,
            username: data.user.username || "",
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            address: data.user.address || "",
            city: data.user.city || "",
            postalCode: data.user.postalCode || "",
            country: data.user.country || "",
            profileImage: data.user.profileImage || "/placeholder.svg",
            role: data.user.roles?.[0]?.roleName || "User",
            position: data.user.position || data.user.roles?.[0]?.roleName || "User",
            state: "",
            taxId: "",
          })
        } else {
          toast.error("Failed to load user data")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Optimistic update for immediate feedback
      const imageUrl = URL.createObjectURL(file)
      setUser((prev) => ({ ...prev, profileImage: imageUrl }))

      const formData = new FormData()
      formData.append("image", file)

      try {
        const response = await fetch("/api/profile/image", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          // Update with the actual URL from server
          setUser((prev) => ({ ...prev, profileImage: data.imagePath }))
          
          // Update localStorage for header sync
          const storedUser = localStorage.getItem("user")
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser)
            localStorage.setItem("user", JSON.stringify({ ...parsedUser, profileImage: data.imagePath }))
            // Dispatch storage event for immediate update in other components
            window.dispatchEvent(new Event("storage"))
          }
          
          toast.success("Image updated")
        } else {
          const errorData = await response.json()
          toast.error(errorData.error || "Failed to upload image")
        }
      } catch (error) {
        console.error("Error uploading image:", error)
        toast.error("An error occurred while uploading image")
      }
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
          country: user.country,
          position: user.position,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser((prev) => ({ ...prev, ...data.user }))
        
        // Update localStorage
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser)
            localStorage.setItem("user", JSON.stringify({ ...parsedUser, ...data.user }))
            window.dispatchEvent(new Event("storage"))
        }

        // Trigger admin alerts refresh
        window.dispatchEvent(new Event("refreshAdminAlerts"))

        setIsEditing(false)
        toast.success("Profile updated successfully")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("An error occurred while updating profile")
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long")
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Password updated successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(result.error || "Failed to update password")
      }
    } catch (error) {
      toast.error("An error occurred while updating password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user.id) {
      toast.error("User ID not found. Please log in again.")
      return
    }
    
    setIsDeleting(true)
    try {
      const result = await deleteUser(user.id)
      if (result.success) {
        toast.success("Account deleted successfully")
        // Logout and redirect
        localStorage.removeItem("user")
        localStorage.removeItem("authToken")
        await fetch("/api/auth/logout", { method: "POST" })
        router.push("/auth/login")
      } else {
        toast.error(result.error || "Failed to delete account")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred while deleting account")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
                <AvatarImage src={user.profileImage || "/placeholder.svg"} alt={user.firstName} />
                <AvatarFallback className="text-xl bg-[#5B8FF9] text-white">{user.firstName[0]}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-brand text-white rounded-full hover:bg-brand-hover transition-colors shadow-sm"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex flex-col items-center md:items-start gap-2">
                <span className="font-medium text-brand">{user.position}</span>
                <StatusBadge 
                  config={getUserRoleConfig(user.role)}
                  size="md"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? "bg-muted" : "border-brand text-brand hover:bg-brand/10"}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {isEditing ? "Cancel Edit" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">Username</Label>
            {isEditing ? (
              <Input value={user.username} onChange={(e) => setUser({ ...user, username: e.target.value })} />
            ) : (
              <div className="font-medium">{user.username || "-"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">First Name</Label>
            {isEditing ? (
              <Input value={user.firstName} onChange={(e) => setUser({ ...user, firstName: e.target.value })} />
            ) : (
              <div className="font-medium">{user.firstName}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">Last Name</Label>
            {isEditing ? (
              <Input value={user.lastName} onChange={(e) => setUser({ ...user, lastName: e.target.value })} />
            ) : (
              <div className="font-medium">{user.lastName}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">Email address</Label>
            {isEditing ? (
              <Input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
            ) : (
              <div className="font-medium">{user.email}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">Phone</Label>
            {isEditing ? (
              <Input value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
            ) : (
              <div className="font-medium">{user.phone}</div>
            )}
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label className="text-muted-foreground font-normal">Position</Label>
            {isEditing ? (
              <Input value={user.position} onChange={(e) => setUser({ ...user, position: e.target.value })} />
            ) : (
              <div className="font-medium">{user.position}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-brand hover:bg-brand-hover text-white">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="bg-brand hover:bg-brand-hover text-white"
            >
              {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Card */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all of your content. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
