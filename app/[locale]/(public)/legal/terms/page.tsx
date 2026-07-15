import { getLatestTos } from "@/app/actions/legal"
import { getPlatformConfig } from "@/lib/config"
import { termsPageDictionary, resolveLegalLocale } from "@/lib/i18n/legal-dictionary"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = termsPageDictionary[resolveLegalLocale(locale)]
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: ["terms", "service", "legal", "conditions", "agreement"],
  }
}

export default async function TermsOfServicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const resolved = resolveLegalLocale(locale)
  const t = termsPageDictionary[resolved]
  const tosResult = await getLatestTos()
  const config = await getPlatformConfig()

  if (!tosResult.success || !tosResult.data) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <h1>{t.heading}</h1>
        <p>{t.notPublished}</p>
        <p className="text-sm text-muted-foreground">{t.notPublishedAdminHint}</p>
      </div>
    )
  }

  const tos = tosResult.data

  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>{t.heading}</h1>
      <p className="lead">
        {t.version(
          tos.version,
          // Real schema (db/schema.ts's termsOfService) has no
          // `effectiveDate` column — only offline mock data does. Pre-existing
          // bug (tsc already flagged `tos.effectiveDate` before this file was
          // touched for locale support); `publishedAt` is the closest real
          // column, `createdAt` covers the case where it's active but was
          // never explicitly published.
          new Date(("effectiveDate" in tos ? tos.effectiveDate : tos.publishedAt ?? tos.createdAt)).toLocaleDateString(
            resolved === "fr" ? "fr-FR" : "en-US",
          ),
        )}
      </p>

      {/* tos.content is admin-authored HTML with no locale dimension in its
          own schema (a single "active" version at a time) — out of scope
          here per Charles (2026-07-15): routing/language of the surrounding
          page matters more right now than splitting the CGU body itself
          into per-locale content. */}
      <div dangerouslySetInnerHTML={{ __html: tos.content }} />

      <hr className="my-8" />

      <h3>{t.contactTitle}</h3>
      <p>{t.contactBody(config.defaultSenderEmail ?? "")}</p>
    </div>
  )
}
