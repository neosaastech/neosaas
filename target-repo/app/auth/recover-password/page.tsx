'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from 'lucide-react'
import { recoverPassword } from "@/app/actions/auth"
import { useState, useTransition } from "react"
import { useToast } from "@/hooks/use-toast"

export default function RecoverPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await recoverPassword(formData)
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
      } else if (result.success && result.message) {
        setSuccessMessage(result.message)
        toast({
          title: "Email sent",
          description: result.message,
        })
      }
    })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-2">
                <span className="text-brand font-bold text-xl">NS</span>
              </div>
              <h1 className="text-3xl font-bold">Reset your password</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>
          <div className="grid gap-4">
            {successMessage ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-md text-sm text-center">
                {successMessage}
              </div>
            ) : (
              <form action={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email" 
                    placeholder="name@example.com" 
                    type="email" 
                    autoComplete="email" 
                    required 
                    disabled={isPending}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            )}
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="inline-flex items-center font-medium text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted md:flex items-center justify-center p-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
          <div className="relative rounded-2xl border bg-background/50 backdrop-blur-sm p-12">
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="h-16 w-16 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Password Recovery</h2>
                <p className="text-muted-foreground max-w-sm">
                  We'll send you a secure link to reset your password and regain access to your account.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full pt-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Email Link</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Secure</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Fast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
