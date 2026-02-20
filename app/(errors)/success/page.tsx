import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from 'lucide-react'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-[#5B8FF9]/10 flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-[#5B8FF9]" />
            </div>
            <div className="absolute inset-0 rounded-full bg-[#5B8FF9]/20 animate-ping" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">SUCCESS!</h1>
          <p className="text-muted-foreground text-lg">
            Awesome! Your account has been created successfully. Our support team will get back to you as soon as possible.
          </p>
        </div>

        <Button asChild className="bg-[#5B8FF9] hover:bg-[#4A7FE8]">
          <Link href="/dashboard">
            Go to Dashboard
          </Link>
        </Button>

        <footer className="pt-8 text-sm text-muted-foreground">
          © 2025 - <span className="text-foreground">Neo</span><span className="text-brand">SaaS</span>
        </footer>
      </div>
    </div>
  )
}
