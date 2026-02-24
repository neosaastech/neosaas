"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTable } from "@/components/admin/users-table"
import { CompaniesTable } from "@/components/admin/companies-table"
import { getUsers, getCompanies } from "@/app/actions/users"
import { getPendingInvitations } from "@/app/actions/invitations"
import { Loader2, Users, Building2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useRequireAdmin } from "@/lib/hooks/use-require-admin"

export default function OrganizationPage() {
  const { isChecking, isAdmin, user } = useRequireAdmin()
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersResult, companiesResult, invitationsResult] = await Promise.all([
          getUsers(),
          getCompanies(),
          getPendingInvitations()
        ])

        if (usersResult.success && usersResult.data) {
          setUsers(usersResult.data)
        }

        if (companiesResult.success && companiesResult.data) {
          setCompanies(companiesResult.data.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            city: c.city,
            zipCode: c.zipCode,
            siret: c.siret,
            vatNumber: c.vatNumber,
            isActive: c.isActive,
            users: c.users,
            createdAt: c.createdAt,
          })))
        }

        if (invitationsResult.success && invitationsResult.data) {
          setInvitations(invitationsResult.data)
        }
      } catch (error) {
        console.error("Failed to load directory data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  if (isChecking || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Organization</h1>
          <p className="text-muted-foreground mt-1">Manage users and companies.</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="companies" className="data-[state=active]:bg-brand data-[state=active]:text-white">
            <Building2 className="mr-2 h-4 w-4" />
            Companies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users & Invitations</CardTitle>
              <CardDescription>
                Manage users and pending invitations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable 
                initialUsers={users} 
                initialInvitations={invitations}
                companies={companies} 
                currentUserId={user?.id}
                isSuperAdmin={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>
                Manage registered companies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompaniesTable initialCompanies={companies} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
