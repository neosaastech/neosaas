import { PageRenderer } from "@/components/pages/page-renderer"
import { HomeFallback } from "@/components/pages/home-fallback"

export const metadata = {
  title: "Home",
  description:
    "NeoSaaS provides all the tools you need to build, launch, and scale your SaaS business. User management, billing, analytics, and more.",
  keywords: ["SaaS", "platform", "business", "startup", "subscription", "billing"],
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <PageRenderer
      pagePath="/"
      locale={locale}
      fallback={<HomeFallback locale={locale} />}
    />
  )
}
