import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Github, Twitter } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-[#CD7F32]/10 flex items-center justify-center mb-2">
                <span className="text-[#CD7F32] font-bold text-xl">NS</span>
              </div>
              <h1 className="text-3xl font-bold">Create an account</h1>
            </div>
            <p className="text-balance text-muted-foreground">Enter your information to create an account</p>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
              <Button variant="outline" className="w-full">
                <Twitter className="mr-2 h-4 w-4" />X
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <form className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="John" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Smith" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="name@example.com" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" required />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <label htmlFor="terms" className="text-sm font-medium leading-none">
                  I agree to the{" "}
                  <Link href="#" className="underline underline-offset-4">
                    terms and conditions
                  </Link>
                </label>
              </div>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted md:block">
        <div className="relative h-full w-full bg-[url('/interconnected-saas.png')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="mx-auto w-full max-w-md rounded-lg bg-background/90 p-4 backdrop-blur-sm">
              <p className="text-xl font-semibold">"Join thousands of businesses already growing with OpenSaaS."</p>
              <p className="mt-2 text-sm text-muted-foreground">Start your journey today.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
