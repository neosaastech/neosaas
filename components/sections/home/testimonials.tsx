import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"

export function HomeTestimonials() {
  const testimonials = [
    {
      content:
        "NeoSaaS has transformed our business completely. The user management and billing features have saved us countless hours of work.",
      author: "Jane Smith",
      role: "CEO, TechCorp",
    },
    {
      content:
        "The analytics and reporting features have given us insights we never had before. We can now make data-driven decisions with confidence.",
      author: "John Doe",
      role: "CTO, Innovate Inc.",
    },
    {
      content:
        "Setting up our subscription model was a breeze with NeoSaaS. The platform is intuitive and the support team is always there when we need them.",
      author: "Sarah Johnson",
      role: "Founder, StartUp Labs",
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <Badge className="bg-[#CD7F32] text-white">Testimonials</Badge>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Trusted by Businesses Worldwide</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl">
              See what our customers have to say about NeoSaaS.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-[#CD7F32] text-[#CD7F32]" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                  <div className="flex items-center space-x-2">
                    <div className="rounded-full bg-muted-foreground/10 p-1">
                      <Avatar className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
