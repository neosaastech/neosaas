"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { listAuthors, getAuthorProfile, type AuthorListRow, type AuthorProfile } from "@/app/actions/authors"
import { ContentSheet } from "./content-sheet"
import { AuthorEditor } from "./author-editor"

/**
 * Same lightweight-panel norm as ModulesPanel/HeaderFooterPanel — authors
 * are a handful per tenant, not paginated content like Pages/Articles.
 * Name/email/avatar-thumbnail/active columns come from Payload via the
 * existing sync (payload-cms's syncUserAfterChange); everything editable
 * here (bio, avatar override, social links, visibility) lives only on this
 * site's own `authors` table.
 */
export function AuthorsPanel() {
  const [authors, setAuthors] = useState<AuthorListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AuthorProfile | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await listAuthors()
    if (result.success) setAuthors(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openEditor(id: string) {
    const result = await getAuthorProfile(id)
    if (result.success) {
      setEditing(result.data)
      setSheetOpen(true)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authors</CardTitle>
        <CardDescription>
          Real Payload users, synced automatically. Auto-linked to a matching site admin account by email — edit bio,
          avatar, social links, and what's shown publicly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Linked admin</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {authors.map((author) => (
              <TableRow key={author.id}>
                <TableCell className="font-medium">{author.name}</TableCell>
                <TableCell className="text-muted-foreground">{author.email}</TableCell>
                <TableCell className="text-muted-foreground">{author.siteUserName ?? "Payload only"}</TableCell>
                <TableCell>{author.isActive ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEditor(author.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && authors.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No authors yet — they appear here automatically once a Payload user is saved.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <ContentSheet open={sheetOpen} onOpenChange={setSheetOpen} title={editing?.name ?? "Author"} description="Public profile & visibility">
        {editing && (
          <AuthorEditor
            author={editing}
            onSaved={() => {
              setSheetOpen(false)
              load()
            }}
            onCancel={() => setSheetOpen(false)}
          />
        )}
      </ContentSheet>
    </Card>
  )
}
