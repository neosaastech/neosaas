import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Mail, MapPin, Phone, Globe, Facebook, Twitter, Linkedin, ArrowLeft } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          We're here to help. Reach out to us for support, feedback, or inquiries.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="first-name" className="text-sm font-medium leading-none">
                    First name
                  </label>
                  <Input id="first-name" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="last-name" className="text-sm font-medium leading-none">
                    Last name
                  </label>
                  <Input id="last-name" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input id="email" type="email" />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium leading-none">
                  Subject
                </label>
                <Input id="subject" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium leading-none">
                  Message
                </label>
                <Textarea id="message" className="min-h-32" />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    123 Innovation Way,
                    <br />
                    San Francisco, CA 94107
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">support@neosaas.com</p>
                </div>
              </div>
              <div className="flex items-start">
                <Globe className="mr-3 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Website</p>
                  <p className="text-sm text-muted-foreground">www.neosaas.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Office Hours</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p>Monday - Friday</p>
                <p className="font-medium">9:00 AM - 6:00 PM (PST)</p>
              </div>
              <div className="flex justify-between items-center">
                <p>Saturday</p>
                <p className="font-medium">10:00 AM - 4:00 PM (PST)</p>
              </div>
              <div className="flex justify-between items-center">
                <p>Sunday</p>
                <p className="font-medium">Closed</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Connect With Us</h2>
            <div className="flex space-x-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="#" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="#" aria-label="Twitter">
                  <Twitter className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="#" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
