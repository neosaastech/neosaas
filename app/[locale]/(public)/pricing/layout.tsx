import { JsonLd } from "@/components/seo/json-ld"
import { buildProductListJsonLd } from "@/lib/seo/structured-data"
import { getProducts } from "@/app/actions/ecommerce"
import { getPlatformConfig } from "@/lib/config"

export const metadata = {
  title: "Pricing",
  description: "Choose the plan that fits your needs. Download NeoSaaS for free or let our experts help you with professional services.",
  keywords: ["pricing", "plans", "subscription", "free", "download"],
}

// Server-rendered, separate from the client pricing page's own fetch (that
// one drives the interactive purchase flow) — this only needs to exist
// once, at request time, for the JSON-LD crawlers actually read. Same data
// source (getProducts), just called server-side instead of client-side.
export default async function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [{ data: products }, config] = await Promise.all([getProducts({ isPublished: true }), getPlatformConfig()])
  const seo = config.seoSettings || {}
  const baseUrl = seo.baseUrl || process.env.NEXT_PUBLIC_APP_URL || ""

  return (
    <>
      {baseUrl && products && products.length > 0 && (
        <JsonLd
          data={buildProductListJsonLd({
            baseUrl,
            // The offline-dev mock product shape (isOfflineDev()) omits a
            // few optional fields getProducts' real DB path always has —
            // harmless here since all three are optional in the builder.
            products: products.map((p) => {
              const product = p as typeof p & { imageUrl?: string; isFree?: boolean; paymentType?: string }
              return {
                title: product.title,
                subtitle: product.subtitle,
                description: product.description,
                price: product.price,
                currency: product.currency,
                imageUrl: product.imageUrl,
                isFree: product.isFree,
                paymentType: product.paymentType,
              }
            }),
          })}
        />
      )}
      {children}
    </>
  )
}
