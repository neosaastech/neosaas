"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Facebook, Linkedin, Instagram, Twitter, Pencil } from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/images/design-mode/32.jpg" alt="Musharof Chowdhury" />
                <AvatarFallback>MC</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold">Musharof Chowdhury</h2>
                <p className="text-muted-foreground">Team Manager | Arizona, United States</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full bg-transparent">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">First Name</Label>
              <p className="font-medium">Musharof</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Last Name</Label>
              <p className="font-medium">Chowdhury</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email address</Label>
              <p className="font-medium">randomuser@pimjo.com</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">+09 363 398 46</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Bio</Label>
              <p className="font-medium">Team Manager</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Address</CardTitle>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Country</Label>
              <p className="font-medium">United States</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">City/State</Label>
              <p className="font-medium">Phoenix, Arizona, United States.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Postal Code</Label>
              <p className="font-medium">ERT 2489</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">TAX ID</Label>
              <p className="font-medium">AS4568384</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
