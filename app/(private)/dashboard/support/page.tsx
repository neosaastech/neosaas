"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Send,
  ChevronDown,
  ChevronRight,
  Book,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { toast } from "sonner"

const faqItems = [
  {
    question: "How to book an appointment?",
    answer: "Go to the 'Appointments' section in your dashboard, then click on 'New Appointment'. You can choose the type of consultation, date and desired time.",
  },
  {
    question: "How to cancel or modify an appointment?",
    answer: "Access your appointment list, click on the appointment, then use the 'Edit' or 'Cancel' options. Cancellations must be made at least 24 hours in advance for paid appointments.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "We accept credit card payments (Visa, Mastercard, American Express), PayPal, and bank transfers for amounts over $500.",
  },
  {
    question: "How to access my invoices?",
    answer: "Your invoices are available in the 'Payments' section of your dashboard. You can download them in PDF format at any time.",
  },
  {
    question: "How to update my profile information?",
    answer: "Click on 'Profile' in the navigation menu. You can modify your personal information, email address and password.",
  },
  {
    question: "How to connect my external calendar?",
    answer: "Access calendar settings via 'Calendar' > 'Settings'. You can connect Google Calendar or Microsoft Outlook to automatically sync your appointments.",
  },
  {
    question: "What if I forgot my password?",
    answer: "On the login page, click 'Forgot password'. Enter your email address and you will receive a reset link.",
  },
  {
    question: "How to manage my team members?",
    answer: "In 'Company Management', you can invite new members, modify their roles or revoke their access. Invitations are sent by email.",
  },
]

export default function SupportPage() {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to your questions or chat with our support team
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Book className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Complete guides and tutorials
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <Link href="/docs">
                    View documentation <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-2 border-primary"
          onClick={() => router.push('/dashboard/chat')}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Live Chat</h3>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Chat with our support team
                </p>
                <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                  Start a conversation <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <p className="text-sm text-muted-foreground">
                  Response within 24h
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="mailto:support@neosaas.com">
                    support@neosaas.com <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quickly find answers to the most common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact via Chat CTA */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Need Help?
            </CardTitle>
            <CardDescription>
              Our support team is here to assist you via live chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Didn't find your answer?</AlertTitle>
                <AlertDescription>
                  Start a conversation with our support team for personalized assistance.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Fast responses</p>
                    <p className="text-xs text-muted-foreground">
                      Get answers in real-time from our support team
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Conversation history</p>
                    <p className="text-xs text-muted-foreground">
                      All your conversations are saved and accessible
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Dedicated support</p>
                    <p className="text-xs text-muted-foreground">
                      Our team is available to help you
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push('/dashboard/chat')}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Start a Chat Conversation
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You can also continue existing conversations from the{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs"
                  onClick={() => router.push('/dashboard/chat')}
                >
                  Chat page
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Helpful Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Check the documentation</p>
                <p className="text-xs text-muted-foreground">
                  Most answers can be found there
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded">
                <AlertCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Be specific</p>
                <p className="text-xs text-muted-foreground">
                  More details = faster response
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded">
                <MessageCircle className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Urgent?</p>
                <p className="text-xs text-muted-foreground">
                  Use live chat for immediate assistance
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
