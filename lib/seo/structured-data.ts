// Builders for schema.org JSON-LD — plain data, no rendering (see
// components/seo/json-ld.tsx for the <script> wrapper). Added 2026-08-13:
// the site had real Open Graph/Twitter Card metadata but nothing in
// schema.org's vocabulary at all — no rich snippets (author, date, price)
// possible in search results despite the underlying data (authors, publish
// dates, product prices) already existing throughout the site.

interface SiteIdentity {
  siteName: string
  baseUrl: string
  logo?: string | null
}

export function buildOrganizationJsonLd({ siteName, baseUrl, logo }: SiteIdentity) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: baseUrl,
    ...(logo ? { logo: absolutize(logo, baseUrl) } : {}),
  }
}

export function buildWebSiteJsonLd({ siteName, baseUrl }: SiteIdentity) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
  }
}

export function buildBlogPostingJsonLd(params: {
  url: string
  headline: string
  description?: string | null
  image?: string | null
  datePublished?: Date | string | null
  dateModified?: Date | string | null
  authorName?: string | null
  publisher: SiteIdentity
}) {
  const { url, headline, description, image, datePublished, dateModified, authorName, publisher } = params
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline,
    ...(description ? { description } : {}),
    ...(image ? { image: absolutize(image, publisher.baseUrl) } : {}),
    ...(datePublished ? { datePublished: toIso(datePublished) } : {}),
    ...(dateModified ? { dateModified: toIso(dateModified) } : {}),
    ...(authorName ? { author: { "@type": "Person", name: authorName } } : {}),
    publisher: {
      "@type": "Organization",
      name: publisher.siteName,
      ...(publisher.logo ? { logo: { "@type": "ImageObject", url: absolutize(publisher.logo, publisher.baseUrl) } } : {}),
    },
  }
}

export function buildWebPageJsonLd(params: {
  url: string
  name: string
  description?: string | null
  isArticle?: boolean
  datePublished?: Date | string | null
  dateModified?: Date | string | null
}) {
  const { url, name, description, isArticle, datePublished, dateModified } = params
  return {
    "@context": "https://schema.org",
    "@type": isArticle ? "Article" : "WebPage",
    "@id": url,
    url,
    name,
    ...(description ? { description } : {}),
    ...(isArticle && datePublished ? { headline: name, datePublished: toIso(datePublished) } : {}),
    ...(dateModified ? { dateModified: toIso(dateModified) } : {}),
  }
}

export function buildProductListJsonLd(params: {
  baseUrl: string
  products: Array<{
    title: string
    subtitle?: string | null
    description?: string | null
    price: number // cents
    currency: string
    imageUrl?: string | null
    isFree?: boolean
    paymentType?: string | null
  }>
}) {
  const { baseUrl, products } = params
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.title,
        ...(p.subtitle || p.description ? { description: p.subtitle || p.description } : {}),
        ...(p.imageUrl ? { image: absolutize(p.imageUrl, baseUrl) } : {}),
        offers: {
          "@type": "Offer",
          price: (p.price / 100).toFixed(2),
          priceCurrency: p.currency,
          availability: "https://schema.org/InStock",
          ...(p.isFree ? { price: "0.00" } : {}),
        },
      },
    })),
  }
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function absolutize(url: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`
}
