"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTable } from "@/components/admin/users-table"
import { CompaniesTable } from "@/components/admin/companies-table"
import { getUsers, getCompanies } from "@/app/actions/users"
import { getPendingInvitations } from "@/app/actions/invitations"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardDirectoryProps {
  currentUserId: string
}

export function DashboardDirectory({ currentUserId }: DashboardDirectoryProps) {
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

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="companies">Companies</TabsTrigger>
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
              currentUserId={currentUserId}
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
  )
}
