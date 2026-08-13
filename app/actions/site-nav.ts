"use server"

import { db } from "@/db"
import { platformConfig, headerOverrides, footerOverrides, moduleOverrides, pageSeo, blogPosts } from "@/db/schema"
import { eq, and, type SQL } from "drizzle-orm"
import type { HeaderConfig, FooterConfig, ModuleConfig } from "@/types/site-nav"

/**
 * Resolves which categoryPath/pageType (if any) a given public pagePath
 * belongs to — the two "middle tiers" between a Page-specific override and
 * the tenant-wide Default. Pages live in `page_seo` (keyed by pagePath);
 * blog posts live in `blog_posts` (keyed by slug, not pagePath, and carry
 * no pageType — a blog post is always the "article" type conceptually but
 * that tier is skipped for blog paths since there's no column to match).
 */
async function resolvePathClassification(
  pagePath: string,
): Promise<{ categoryPath?: string; pageType?: string }> {
  if (pagePath.startsWith("/blog/")) {
    const slug = pagePath.slice("/blog/".length)
    const result = await db
      .select({ categoryPath: blogPosts.categoryPath })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)
    // Every blog post is implicitly pageType "article" — Pages has a real
    // pageType column (landing/article/documentation, see ScopePicker's
    // PAGE_TYPE_OPTIONS), BlogPosts never did, so a Module scoped to
    // page_type=article could never match here. Hardcoded, not a lookup:
    // there's no other pageType a blog post could ever be.
    return { categoryPath: result[0]?.categoryPath ?? undefined, pageType: "article" }
  }

  const result = await db
    .select({ categoryPath: pageSeo.categoryPath, pageType: pageSeo.pageType })
    .from(pageSeo)
    .where(eq(pageSeo.pagePath, pagePath))
    .limit(1)
  return {
    categoryPath: result[0]?.categoryPath ?? undefined,
    pageType: result[0]?.pageType ?? undefined,
  }
}

/**
 * Precedence: specific Page > Category > Page Type > tenant-wide Default.
 * `table` is header_overrides or footer_overrides (identical shape, scoped
 * by (scope_type, scope_value)); `defaultKey` is the existing platform_config
 * row that already meant "the site's one Header/Footer" before scoping
 * existed — same read as before, now just the last fallback tier.
 */
/**
 * Charles (2026-07-15): "comment pourrais-je avoir un footer en anglais
 * alors qu'on est dans une page fr ?" — header_overrides/footer_overrides/
 * module_overrides/platform_config n'avaient aucune dimension langue avant
 * ce soir. `locale` tenté en premier, puis repli sur 'fr' (la langue par
 * défaut de toutes les lignes existantes, colonne ajoutée avec
 * `default('fr')`) si rien n'a encore été traduit dans la langue demandée —
 * jamais de trou visuel (header/footer vide) juste parce qu'un éditeur n'a
 * pas encore traduit, jusqu'à ce qu'il le fasse.
 */
async function matchScopedRow<T>(
  table: typeof headerOverrides | typeof footerOverrides | typeof moduleOverrides,
  scopeCondition: SQL,
  locale: string,
): Promise<T | null> {
  const localized = await db
    .select({ config: table.config })
    .from(table)
    .where(and(scopeCondition, eq(table.locale, locale)))
    .limit(1)
  if (localized.length > 0) return localized[0].config as T

  if (locale !== "fr") {
    const fallback = await db
      .select({ config: table.config })
      .from(table)
      .where(and(scopeCondition, eq(table.locale, "fr")))
      .limit(1)
    if (fallback.length > 0) return fallback[0].config as T
  }

  return null
}

async function resolveScopedConfig<T>(
  table: typeof headerOverrides | typeof footerOverrides,
  defaultKey: "header_config" | "footer_config",
  pagePath: string,
  locale: string,
): Promise<T | null> {
  const pageMatch = await matchScopedRow<T>(table, and(eq(table.scopeType, "page"), eq(table.scopeValue, pagePath))!, locale)
  if (pageMatch) return pageMatch

  const { categoryPath, pageType } = await resolvePathClassification(pagePath)

  if (categoryPath) {
    const categoryMatch = await matchScopedRow<T>(
      table,
      and(eq(table.scopeType, "category"), eq(table.scopeValue, categoryPath))!,
      locale,
    )
    if (categoryMatch) return categoryMatch
  }

  if (pageType) {
    const pageTypeMatch = await matchScopedRow<T>(
      table,
      and(eq(table.scopeType, "page_type"), eq(table.scopeValue, pageType))!,
      locale,
    )
    if (pageTypeMatch) return pageTypeMatch
  }

  const localizedKey = `${defaultKey}_${locale}`
  const localizedDefault = await db.select().from(platformConfig).where(eq(platformConfig.key, localizedKey)).limit(1)
  if (localizedDefault.length > 0 && localizedDefault[0].value) return JSON.parse(localizedDefault[0].value) as T

  // Repli 1 : la clé localisée 'fr' (rien encore traduit dans la langue demandée).
  if (locale !== "fr") {
    const frDefault = await db.select().from(platformConfig).where(eq(platformConfig.key, `${defaultKey}_fr`)).limit(1)
    if (frDefault.length > 0 && frDefault[0].value) return JSON.parse(frDefault[0].value) as T
  }

  // Repli 2 : l'ancienne clé sans suffixe (site jamais republié depuis la localisation).
  const legacyDefault = await db.select().from(platformConfig).where(eq(platformConfig.key, defaultKey)).limit(1)
  if (legacyDefault.length === 0 || !legacyDefault[0].value) return null
  return JSON.parse(legacyDefault[0].value) as T
}

/**
 * Returns null when unset (not an empty config) so callers can tell "no
 * Payload Header doc synced yet" apart from "an editor explicitly saved an
 * empty nav" — the former should fall back to the site's hardcoded nav,
 * the latter should render nothing. `pagePath` (the current route, without
 * locale prefix — see app/[locale]/(public)/layout.tsx) drives the
 * Page/Category/PageType precedence resolution above.
 */
export async function getHeaderConfig(pagePath: string, locale: string = "fr"): Promise<HeaderConfig | null> {
  try {
    return await resolveScopedConfig<HeaderConfig>(headerOverrides, "header_config", pagePath, locale)
  } catch (error) {
    console.error("Failed to get header config:", error)
    return null
  }
}

export async function getFooterConfig(pagePath: string, locale: string = "fr"): Promise<FooterConfig | null> {
  try {
    return await resolveScopedConfig<FooterConfig>(footerOverrides, "footer_config", pagePath, locale)
  } catch (error) {
    console.error("Failed to get footer config:", error)
    return null
  }
}

/**
 * Same Page > Category > PageType > Default precedence as
 * resolveScopedConfig, plus an `anchorKey` filter at every tier — a scope
 * can hold several Modules, so unlike Header/Footer there's no single
 * "default" row to fall back to at a fixed platform_config key. `default`
 * lives in module_overrides too, with scopeValue='' as its sentinel
 * (payload-cms side, sync/targets/neosaas-app.ts) — matched here the same
 * way. Returns null when no Module targets this anchor on this page at all
 * (the `module-anchor` block simply renders nothing, same "no Payload doc
 * synced yet" contract as getHeaderConfig/getFooterConfig).
 */
/**
 * Charles (2026-07-15): "un lien de la page avec sa traduction" à la
 * Joomla (Multilingual Associations — see guide.joomla.org). Now that
 * Payload's Pages.slug/path are localized (real per-language URLs, e.g.
 * /tarifs vs /pricing), nothing connects a page's fr row to its en row once
 * their pagePath values diverge — except payload_page_id, synced verbatim
 * from Payload's own doc.id (the same across every locale of one page,
 * since only certain fields are localized, not the document itself).
 *
 * Returns null when this page has no known association yet — either it was
 * synced before payload_page_id existed, or by a payload-cms build that
 * doesn't send it yet. Callers (locale-switcher.tsx, page-metadata.ts) fall
 * back to their pre-existing behavior in that case, same "no association"
 * fallback Joomla's own language switcher module uses.
 */
export async function getAlternatePagePaths(pagePath: string, locale: string): Promise<Record<string, string> | null> {
  try {
    const current = await db
      .select({ payloadPageId: pageSeo.payloadPageId })
      .from(pageSeo)
      .where(and(eq(pageSeo.pagePath, pagePath), eq(pageSeo.locale, locale)))
      .limit(1)

    const payloadPageId = current[0]?.payloadPageId
    if (!payloadPageId) return null

    const rows = await db
      .select({ pagePath: pageSeo.pagePath, locale: pageSeo.locale })
      .from(pageSeo)
      .where(eq(pageSeo.payloadPageId, payloadPageId))

    if (rows.length === 0) return null

    const map: Record<string, string> = {}
    for (const row of rows) map[row.locale] = row.pagePath
    return map
  } catch (error) {
    console.error("Failed to get alternate page paths:", error)
    return null
  }
}

export async function getModuleForAnchor(anchorKey: string, pagePath: string, locale: string = "fr"): Promise<ModuleConfig | null> {
  try {
    const pageMatch = await matchScopedRow<ModuleConfig>(
      moduleOverrides,
      and(eq(moduleOverrides.scopeType, "page"), eq(moduleOverrides.scopeValue, pagePath), eq(moduleOverrides.anchorKey, anchorKey))!,
      locale,
    )
    if (pageMatch) return pageMatch

    const { categoryPath, pageType } = await resolvePathClassification(pagePath)

    if (categoryPath) {
      const categoryMatch = await matchScopedRow<ModuleConfig>(
        moduleOverrides,
        and(eq(moduleOverrides.scopeType, "category"), eq(moduleOverrides.scopeValue, categoryPath), eq(moduleOverrides.anchorKey, anchorKey))!,
        locale,
      )
      if (categoryMatch) return categoryMatch
    }

    if (pageType) {
      const pageTypeMatch = await matchScopedRow<ModuleConfig>(
        moduleOverrides,
        and(eq(moduleOverrides.scopeType, "page_type"), eq(moduleOverrides.scopeValue, pageType), eq(moduleOverrides.anchorKey, anchorKey))!,
        locale,
      )
      if (pageTypeMatch) return pageTypeMatch
    }

    const defaultMatch = await matchScopedRow<ModuleConfig>(
      moduleOverrides,
      and(eq(moduleOverrides.scopeType, "default"), eq(moduleOverrides.scopeValue, ""), eq(moduleOverrides.anchorKey, anchorKey))!,
      locale,
    )
    if (defaultMatch) return defaultMatch

    return null
  } catch (error) {
    console.error("Failed to get module for anchor:", anchorKey, error)
    return null
  }
}
