"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin, Video, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function NewAppointmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    meetingUrl: "",
    startDate: "",
    startTime: "",
    endTime: "",
    timezone: "Europe/Paris",
    notes: "",
    syncToCalendar: true,
  })

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, startDate: dateStr }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Combine date and time
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endTime = new Date(`${formData.startDate}T${formData.endTime}`)

      if (startTime >= endTime) {
        toast.error("L'heure de fin doit être après l'heure de début")
        setLoading(false)
        return
      }

      // Client-side appointment request:
      // - type is always 'free' (admin will set payment if needed)
      // - status is 'pending' (waiting for admin confirmation)
      // - no attendee info required (admin will fill if needed)
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location || undefined,
          meetingUrl: formData.meetingUrl || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          timezone: formData.timezone,
          notes: formData.notes || undefined,
          syncToCalendar: formData.syncToCalendar,
          type: "free", // Client can only request free appointments
          status: "pending", // Always pending until admin confirms
          price: 0,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Demande de rendez-vous envoyée ! Vous serez notifié après confirmation.")
        router.push("/dashboard/appointments")
      } else {
        toast.error(data.error || "Erreur lors de l'envoi de la demande")
      }
    } catch (error) {
      console.error("Failed to create appointment:", error)
      toast.error("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/appointments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Demander un rendez-vous</h1>
          <p className="text-muted-foreground">
            Envoyez une demande de rendez-vous à notre équipe
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Send className="h-4 w-4" />
        <AlertDescription>
          Votre demande sera examinée par notre équipe. Vous recevrez une notification
          une fois le rendez-vous confirmé. Si un paiement est nécessaire, vous serez
          contacté avec les modalités.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Objet de la demande
            </CardTitle>
            <CardDescription>
              Décrivez le sujet de votre demande de rendez-vous
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la demande *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Consultation initiale, Question technique, Démonstration..."
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Décrivez le sujet de votre demande pour nous aider à mieux vous répondre..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Créneau souhaité
            </CardTitle>
            <CardDescription>
              Indiquez vos disponibilités. Notre équipe vous proposera un créneau adapté si nécessaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date souhaitée *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Heure de début *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Heure de fin *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleSelectChange("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Préférence de lieu (optionnel)
            </CardTitle>
            <CardDescription>
              Indiquez si vous avez une préférence pour le lieu du rendez-vous
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Adresse physique</Label>
              <Input
                id="location"
                name="location"
                placeholder="Ex: Vos bureaux, un lieu de rencontre..."
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Ou lien de visioconférence</Label>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="meetingUrl"
                  name="meetingUrl"
                  type="url"
                  placeholder="https://meet.google.com/... ou https://zoom.us/..."
                  value={formData.meetingUrl}
                  onChange={handleChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Si vous laissez ce champ vide, notre équipe vous enverra un lien
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ajouter à mon calendrier</Label>
                <p className="text-sm text-muted-foreground">
                  Synchroniser automatiquement avec Google Calendar ou Outlook
                </p>
              </div>
              <Switch
                checked={formData.syncToCalendar}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, syncToCalendar: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Informations complémentaires</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Ajoutez toute information utile pour préparer notre rendez-vous..."
                value={formData.notes}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" asChild>
            <Link href="/dashboard/appointments">Annuler</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Envoi en cours..." : "Envoyer la demande"}
          </Button>
        </div>
      </form>
    </div>
  )
}
