"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Save, Pencil, Trash2, Loader2, Lock, Link2, Unlink } from "lucide-react"
import { toast } from "sonner"
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

// SVG icons for OAuth providers
const GitHubIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

const GoogleIcon = () => (
  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    <path d="M1 1h22v22H1z" fill="none"/>
  </svg>
)

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

interface OAuthConnection {
  id: string
  provider: string
  email: string
  createdAt: string
}

interface OAuthConfig {
  github: boolean
  google: boolean
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
  const [oauthConnections, setOauthConnections] = useState<OAuthConnection[]>([])
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({ github: false, google: false })
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null)
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

    const fetchOAuthData = async () => {
      try {
        const [connectionsRes, configRes] = await Promise.all([
          fetch("/api/profile/oauth"),
          fetch("/api/auth/oauth/config"),
        ])
        if (connectionsRes.ok) {
          const data = await connectionsRes.json()
          setOauthConnections(data.connections || [])
        }
        if (configRes.ok) {
          const data = await configRes.json()
          setOauthConfig({ github: data.github || false, google: data.google || false })
        }
      } catch (error) {
        console.error("Error fetching OAuth data:", error)
      }
    }

    fetchUserData()
    fetchOAuthData()
  }, [])

  const getConnection = (provider: string) =>
    oauthConnections.find((c) => c.provider === provider)

  const handleDisconnect = async (provider: string) => {
    setDisconnectingProvider(provider)
    try {
      const response = await fetch("/api/profile/oauth", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      if (response.ok) {
        setOauthConnections((prev) => prev.filter((c) => c.provider !== provider))
        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected`)
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to disconnect account")
      }
    } catch {
      toast.error("An error occurred while disconnecting account")
    } finally {
      setDisconnectingProvider(null)
    }
  }

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

      {/* Connected Accounts Card */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Link your social accounts to enable quick sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <GitHubIcon />
                  <div>
                    <p className="font-medium text-sm">GitHub</p>
                    {getConnection("github") ? (
                      <p className="text-xs text-muted-foreground">{getConnection("github")!.email}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>
                {getConnection("github") ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disconnectingProvider === "github"}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {disconnectingProvider === "github" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-1" />
                        )}
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer be able to sign in with GitHub. Make sure you have a password set before disconnecting.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect("github")}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { window.location.href = "/api/auth/oauth/github" }}
                    className="border-brand text-brand hover:bg-brand/10"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
              </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <GoogleIcon />
                  <div>
                    <p className="font-medium text-sm">Google</p>
                    {getConnection("google") ? (
                      <p className="text-xs text-muted-foreground">{getConnection("google")!.email}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>
                {getConnection("google") ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disconnectingProvider === "google"}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {disconnectingProvider === "google" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Unlink className="h-4 w-4 mr-1" />
                        )}
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Google?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer be able to sign in with Google. Make sure you have a password set before disconnecting.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDisconnect("google")}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { window.location.href = "/api/auth/oauth/google" }}
                    className="border-brand text-brand hover:bg-brand/10"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
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
