"use client"

import Link from "next/link"
import { User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Badge } from "@/components/ui/badge"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-6 justify-end">
        <Badge variant="secondary" className="hidden md:flex">
          Example - Non Functional
        </Badge>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Profile</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="font-medium">Admin Example</p>
                  <p className="text-sm text-muted-foreground">admin@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Profile (Example)</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Settings (Example)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">Back to Home</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
