import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function RecoverPasswordPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-[#CD7F32]/10 flex items-center justify-center mb-2">
                <span className="text-[#CD7F32] font-bold text-xl">NS</span>
              </div>
              <h1 className="text-3xl font-bold">Reset your password</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>
          <div className="grid gap-4">
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="name@example.com" type="email" autoComplete="email" required />
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="inline-flex items-center font-medium text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted md:block">
        <div className="relative h-full w-full bg-[url('/tech-stack.png')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="mx-auto w-full max-w-md rounded-lg bg-background/90 p-4 backdrop-blur-sm">
              <p className="text-xl font-semibold">"Password recovery made simple and secure."</p>
              <p className="mt-2 text-sm text-muted-foreground">We prioritize your account security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
