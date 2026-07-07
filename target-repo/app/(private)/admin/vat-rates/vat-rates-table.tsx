"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { MoreHorizontal, Trash, Pencil, Star, MapPin } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import Link from "next/link"

interface VatRate {
  id: string
  name: string
  country: string
  rate: number
  description: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface VatRatesTableProps {
  rates: VatRate[]
}

export function VatRatesTable({ rates }: VatRatesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/vat-rates/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("VAT rate deleted")
        router.refresh()
      } else {
        toast.error("Failed to delete VAT rate")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const toggleDefault = async (id: string, country: string) => {
    try {
      const response = await fetch(`/api/admin/vat-rates/${id}/set-default`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      })

      if (response.ok) {
        toast.success("Default rate updated")
        router.refresh()
      } else {
        toast.error("Failed to update default rate")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/vat-rates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        toast.success(`VAT rate ${!currentStatus ? "activated" : "deactivated"}`)
        router.refresh()
      } else {
        toast.error("Failed to update VAT rate")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Country</TableHead>
              <TableHead className="w-[100px]">Rate</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Default</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{rate.country}</Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {(rate.rate / 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rate.description || "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDefault(rate.id, rate.country)}
                    className="h-8 px-2"
                  >
                    {rate.isDefault ? (
                      <Star className="h-4 w-4 fill-brand text-brand" />
                    ) : (
                      <Star className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(rate.id, rate.isActive)}
                    className="h-8 px-2"
                  >
                    <Badge variant={rate.isActive ? "default" : "secondary"}>
                      {rate.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/admin/vat-rates/${rate.id}`}>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setDeleteId(rate.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No VAT rates found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {rates.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No VAT rates found. Create one to get started.
          </Card>
        ) : (
          rates.map((rate) => (
            <Card key={rate.id} className="p-4">
              <div className="space-y-3">
                {/* Header avec nom et pays */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">{rate.country}</Badge>
                    </div>
                    <h3 className="font-medium text-base">{rate.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/admin/vat-rates/${rate.id}`}>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => setDeleteId(rate.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Taux et description */}
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-brand">
                    {(rate.rate / 100).toFixed(2)}%
                  </div>
                  {rate.description && (
                    <p className="text-sm text-muted-foreground">{rate.description}</p>
                  )}
                </div>

                {/* Actions et statuts */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDefault(rate.id, rate.country)}
                      className="h-8 px-2"
                      title={rate.isDefault ? "Default rate" : "Set as default"}
                    >
                      {rate.isDefault ? (
                        <Star className="h-4 w-4 fill-brand text-brand" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(rate.id, rate.isActive)}
                      className="h-8"
                    >
                      <Badge variant={rate.isActive ? "default" : "secondary"}>
                        {rate.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the VAT rate.
              Products using this rate will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
