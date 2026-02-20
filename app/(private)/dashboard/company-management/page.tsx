"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Users, Mail, Phone, MapPin, FileText, UserPlus, Pencil, Check, X, Search, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useUser } from "@/lib/contexts/user-context"
import { cancelInvitation, removeUserFromCompany } from "@/app/actions/company-users"

interface Company {
  id: string
  name: string
  email: string
  city?: string
  address?: string
  zipCode?: string
  siret?: string
  vatNumber?: string
  phone?: string
}

interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  isOwner: boolean
  isActive: boolean
  roles: string[]
  status: string // Added status field
  createdAt: string
  expiresAt?: string // Added for pending invitations
}

export default function CompanyManagementPage() {
  const { hasRole, isLoading } = useUser()
  const canEdit = hasRole(["writer", "admin", "super_admin"])

  const [company, setCompany] = useState<Company | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  const [companyForm, setCompanyForm] = useState({
    name: "",
    email: "",
    city: "",
    address: "",
    zipCode: "",
    siret: "",
    vatNumber: "",
    phone: "",
  })

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "reader" as "reader" | "writer",
  })

  // Load company and team data
  useEffect(() => {
    loadCompanyData()
    loadTeamMembers()
  }, [])

  const loadCompanyData = async () => {
    try {
      const response = await fetch("/api/company")
      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        
        if (data.company) {
          setCompanyForm({
            name: data.company.name || "",
            email: data.company.email || "",
            city: data.company.city || "",
            address: data.company.address || "",
            zipCode: data.company.zipCode || "",
            siret: data.company.siret || "",
            vatNumber: data.company.vatNumber || "",
            phone: data.company.phone || "",
          })
        }
      }
    } catch (error) {
      console.error("Error loading company:", error)
      toast.error("Failed to load company information")
    }
  }

  const loadTeamMembers = async () => {
    try {
      const response = await fetch("/api/users/team")
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.users)
      }
    } catch (error) {
      console.error("Error loading team:", error)
      toast.error("Failed to load team members")
    }
  }

  const handleUpdateCompany = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm),
      })

      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        setIsEditingCompany(false)
        
        // Trigger admin alerts refresh
        window.dispatchEvent(new Event("refreshAdminAlerts"))
        
        toast.success("Company information updated successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update company")
      }
    } catch (error) {
      toast.error("An error occurred while updating company")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsInviting(true)
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      })

      if (response.ok) {
        toast.success("Invitation sent successfully. The user will appear as pending until they accept.")
        setInviteForm({ email: "", role: "reader" })
        loadTeamMembers() // Refresh team list
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to send invitation")
      }
    } catch (error) {
      toast.error("An error occurred while sending invitation")
    } finally {
      setIsInviting(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        toast.success(`User ${!isActive ? "activated" : "deactivated"} successfully`)
        loadTeamMembers()
      } else {
        toast.error("Failed to update user status")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return
    
    const result = await cancelInvitation(invitationId)
    if (result.success) {
      toast.success(result.message)
      loadTeamMembers()
    } else {
      toast.error(result.error)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the company?")) return

    const result = await removeUserFromCompany(userId)
    if (result.success) {
      toast.success(result.message)
      loadTeamMembers()
    } else {
      toast.error(result.error)
    }
  }

  const [teamSearchQuery, setTeamSearchQuery] = useState("")
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    if (teamSearchQuery) {
      const filtered = teamMembers.filter(
        (member) =>
          member.firstName.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
          member.lastName.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
          member.roles.some((role) => role.toLowerCase().includes(teamSearchQuery.toLowerCase())),
      )
      setFilteredTeamMembers(filtered)
    } else {
      setFilteredTeamMembers(teamMembers)
    }
  }, [teamSearchQuery, teamMembers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground mt-2">Manage your organization and team</p>
        </div>
        <Badge variant="secondary" className="bg-brand text-white hover:bg-brand-hover">
          Enterprise Plan
        </Badge>
      </div>

      {/* Company Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-brand" />
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Manage your organization settings</CardDescription>
              </div>
            </div>
            {!isEditingCompany && canEdit && (
              <Button variant="outline" onClick={() => setIsEditingCompany(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingCompany ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Company Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={companyForm.zipCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })}
                    placeholder="75000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={companyForm.siret}
                    onChange={(e) => setCompanyForm({ ...companyForm, siret: e.target.value })}
                    placeholder="123 456 789 00012"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="123 Rue de la Paix, 75000 Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={companyForm.vatNumber}
                  onChange={(e) => setCompanyForm({ ...companyForm, vatNumber: e.target.value })}
                  placeholder="FR12345678901"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateCompany}
                  disabled={isSaving}
                  className="bg-brand hover:bg-brand-hover text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingCompany(false)
                    if (company) {
                      setCompanyForm({
                        name: company.name || "",
                        email: company.email || "",
                        city: company.city || "",
                        address: company.address || "",
                        zipCode: company.zipCode || "",
                        siret: company.siret || "",
                        vatNumber: company.vatNumber || "",
                        phone: company.phone || "",
                      })
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{company?.name || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{company?.email || "Not set"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{company?.address || "Not set"}</p>
                    <p className="text-sm text-muted-foreground">
                      {company?.city || "City not set"} {company?.zipCode ? `(${company.zipCode})` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{company?.phone || "Not set"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">VAT Number</p>
                    <p className="font-medium">{company?.vatNumber || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">SIRET</p>
                    <p className="font-medium">{company?.siret || "Not set"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-brand" />
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team and send invitations</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              {teamMembers.length} {teamMembers.length === 1 ? "Member" : "Members"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Form - Only visible to users with write permissions */}
          {canEdit && (
            <form onSubmit={handleInviteUser} className="rounded-lg border bg-muted/50 p-4 space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" />
                Invite New Member
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value: "reader" | "writer") =>
                      setInviteForm({ ...inviteForm, role: value })
                    }
                  >
                    <SelectTrigger id="inviteRole">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="writer">Writer - Read & Write access</SelectItem>
                      <SelectItem value="reader">Reader - Read only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isInviting} className="bg-brand hover:bg-brand-hover text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search team members by name, email, or role..."
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Team Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {teamSearchQuery
                        ? "No team members found matching your search."
                        : "No team members yet. Invite your first member above."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                        {member.isOwner && (
                          <Badge variant="secondary" className="ml-2 bg-brand text-white hover:bg-brand-hover">
                            Owner
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {member.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.status === "pending" ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            Pending Invitation
                          </Badge>
                        ) : (
                          <Badge
                            variant={member.isActive ? "secondary" : "outline"}
                            className={member.isActive ? "bg-brand/10 text-brand" : ""}
                          >
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit ? (
                          member.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // TODO: Implement resend
                                    toast.info("Resend invitation coming soon")
                                }}
                                >
                                Resend
                                </Button>
                                <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleCancelInvitation(member.id)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          ) : !member.isOwner ? (
                            <div className="flex justify-end gap-2">
                                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(member.id, member.isActive)}
                                >
                                {member.isActive ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRemoveUser(member.id)}
                                >
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          ) : null
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
