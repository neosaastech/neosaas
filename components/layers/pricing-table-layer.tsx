/**
 * "pricing-table" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Marketing-only display block for the page builder — not wired to Stripe/checkout,
 * unlike app/[locale]/(public)/pricing/pricing-grid.tsx (a different, heavier component
 * tied to real Product rows). This one just renders plans an editor typed in Payload.
 */
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface PricingTablePlan {
  name: string
  price: string
  period?: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
  highlighted?: boolean
}

export interface PricingTableLayerProps {
  title?: string
  items: PricingTablePlan[]
}

export function PricingTableLayer({ title, items }: PricingTableLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-5xl">
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      <div className={cn("mt-10 grid gap-8", items.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {items.map((plan) => (
          <Card key={plan.name} className={cn("relative", plan.highlighted && "border-brand shadow-lg")}>
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white">Populaire</Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">/{plan.period}</span>}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <ul className="space-y-2 text-sm">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                  plan.highlighted
                    ? "bg-brand text-white hover:bg-brand-hover"
                    : "border border-input hover:bg-accent",
                )}
              >
                {plan.ctaLabel}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
