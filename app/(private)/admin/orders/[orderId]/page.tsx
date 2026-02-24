"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Save, Loader2, Package, User, Building2, Clock, Cog, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { getOrderStatusConfig } from "@/lib/status-configs"

export default function OrderEditPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
        setStatus(data.order.status || "pending")
        setNotes(data.order.notes || "")
      } else {
        toast.error("Failed to load order")
        router.push("/admin")
      }
    } catch (error) {
      console.error("Error loading order:", error)
      toast.error("Error loading order")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes })
      })

      if (response.ok) {
        toast.success("Order updated successfully")
        router.push("/admin")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast.error("Error updating order")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Modifier la commande</h1>
          <p className="text-muted-foreground">Commande {order.orderNumber}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-brand" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.user && (
              <>
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{order.user.firstName} {order.user.lastName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{order.user.email}</p>
                </div>
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/users?edit=${order.userId}`}>
                      Edit user
                    </Link>
                  </Button>
                </div>
              </>
            )}
            {order.company && (
              <>
                <div className="pt-3 border-t">
                  <Label className="text-muted-foreground">Entreprise</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {order.company.name}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informations commande */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-brand" />
              Détails de la commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-muted-foreground">Montant total</Label>
              <p className="text-2xl font-bold text-brand">
                {formatCurrency((order.totalAmount || 0) / 100)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date de création</Label>
              <p>{new Date(order.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Dernière mise à jour</Label>
              <p>{new Date(order.updatedAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modification du statut */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion de la commande</CardTitle>
          <CardDescription>
            Modifier le statut et ajouter des notes internes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Statut de la commande</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-10 border-0 bg-transparent hover:bg-muted/30 px-0">
                <StatusBadge 
                  config={getOrderStatusConfig(status)}
                  size="lg"
                  animated={true}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-700" />
                    <span>En attente</span>
                  </div>
                </SelectItem>
                <SelectItem value="processing">
                  <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 text-blue-700" />
                    <span>En cours de traitement</span>
                  </div>
                </SelectItem>
                <SelectItem value="paid">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <span>Payée</span>
                  </div>
                </SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-700" />
                    <span>Terminée</span>
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-700" />
                    <span>Annulée</span>
                  </div>
                </SelectItem>
                <SelectItem value="refunded">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-700" />
                    <span>Remboursée</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes internes</Label>
            <Textarea
              id="notes"
              placeholder="Ajouter des notes sur cette commande..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand hover:bg-[#B26B27]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Annuler</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
