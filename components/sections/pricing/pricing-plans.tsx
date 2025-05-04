import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export function PricingPlans() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for small teams just getting started",
      features: ["Up to 5 team members", "20GB storage", "Basic analytics", "24/7 email support"],
      popular: false,
    },
    {
      name: "Pro",
      price: "$79",
      description: "For growing businesses with more demands",
      features: [
        "Up to 20 team members",
        "100GB storage",
        "Advanced analytics",
        "Priority email support",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$199",
      description: "For large organizations with complex needs",
      features: [
        "Unlimited team members",
        "1TB storage",
        "Custom analytics",
        "24/7 phone & email support",
        "Advanced API access",
        "Custom integrations",
      ],
      popular: false,
    },
  ]

  return (
    <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
      {plans.map((plan, index) => (
        <Card key={index} className={`flex flex-col ${plan.popular ? "border-primary" : ""}`}>
          <CardHeader>
            {plan.popular && (
              <div className="text-center">
                <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </span>
              </div>
            )}
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <div className="mt-4 flex items-baseline text-5xl font-extrabold">
              {plan.price}
              <span className="ml-1 text-xl font-medium text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-4">{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Get Started</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
