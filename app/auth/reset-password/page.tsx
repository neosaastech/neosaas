'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from 'lucide-react'
import { resetPassword } from "@/app/actions/auth"
import { useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  
  const [isPending, startTransition] = useTransition()

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">Missing reset token</p>
          <Button asChild variant="outline">
            <Link href="/auth/login">Back to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function handleSubmit(formData: FormData) {
    if (!token) return

    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    startTransition(async () => {
      const result = await resetPassword(token, password)
      
      if (result.success) {
        toast.success("Password reset successfully")
        router.push("/auth/login?reset=true")
      } else {
        toast.error(result.error || "Failed to reset password")
      }
    })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-md gap-6 px-4">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-2">
                <span className="text-brand font-bold text-xl">NS</span>
              </div>
              <h1 className="text-3xl font-bold">Reset Password</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Enter your new password below
            </p>
          </div>
          
          <form action={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                disabled={isPending}
                minLength={8}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                required 
                disabled={isPending}
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </div>
      </div>
      <div className="hidden bg-muted md:flex items-center justify-center p-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
          <div className="relative rounded-2xl border bg-background/50 backdrop-blur-sm p-12">
            <div className="flex flex-col items-center space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Secure your account</h2>
                <p className="text-muted-foreground">
                  Choose a strong password to keep your account safe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
