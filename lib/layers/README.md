# Page-builder layers — reference for humans and agents

This is the system Payload's page builder is built on top of. If you're an
AI agent (Camille, Leon, a future Payload-integration agent, Claude Code in
a fresh session) trying to compose or extend a page, read this first —
it's written so you don't need to reverse-engineer the code to get it right.

## How a page gets built

```
Payload (payload-cms repo)              neosaas-app (this repo)
─────────────────────────              ───────────────────────
Editor adds blocks to a Page      →     afterChange hook fires on publish
(src/blocks/*.ts, src/collections/      (src/sync/dispatch.ts)
Pages.ts)                                     │
                                               ▼
                                         Looks up the Tenant's
                                         boilerplateType + databaseUrl
                                               │
                                               ▼
                                         Sync target function
                                         (src/sync/targets/neosaas-app.ts)
                                         writes into THIS site's own
                                         page_layers table
                                               │
                                               ▼
                                         A page route (e.g.
                                         app/[locale]/(public)/features/
                                         page.tsx) queries page_layers by
                                         path+locale, looks up each row's
                                         layerType in lib/layers/registry.ts,
                                         validates props against that
                                         layer's Zod schema, renders
                                         <Component {...props} />
```

Each site (tenant) has its **own** Postgres database — the sync target only
writes rows, it never queries Payload at runtime. This is deliberate: a
site must stay sellable/handoff-able on its own, with zero runtime
dependency on the CMS that authored its content.

**One exception**: `blog-list` is a dynamic block — it queries
`db/schema.ts`'s `blogPosts` table directly at render time instead of only
using props, because a list of "latest posts" must always be current, not
a snapshot frozen when the block was added to a page. Every other block is
purely presentational (props in, JSX out, no DB access).

## The two-repo mirror contract

**Every block exists twice**, and the two copies must describe the exact
same shape:

| | payload-cms | neosaas-app (this repo) |
|---|---|---|
| Defines | `src/blocks/<Name>.ts` (Payload `Block` config — what an editor sees/fills in) | `lib/layers/registry.ts` (Zod `propsSchema` — what gets validated and rendered) |
| Renders | nothing (authoring only) | `components/layers/<name>-layer.tsx` |
| Maps between them | `src/sync/targets/neosaas-app.ts`'s `mapBlockToProps()` | — |

When you add or change a field, touch **all three**: the Payload block
schema, the registry's Zod schema (+ the React component's props
interface), and `mapBlockToProps()`'s case for that block type. Skipping
one means content saves fine in Payload but silently fails Zod validation
(or loses a field) on the site.

## Current block inventory (8)

| `layerType` | Purpose | Notable props | Dynamic? |
|---|---|---|---|
| `hero` | Page/section header | `eyebrow`, `title`, `subtitle`, `trustPills[]`, `ctaLabel`+`ctaHref`, `secondaryCtaLabel`+`secondaryCtaHref`, `imageUrl` | No |
| `feature-grid` | Grid of icon+text cards | `eyebrow`, `title`, `items[]` (`icon`, `title`, `description`, `bullets[]`) | No |
| `pricing-table` | Static pricing cards | `eyebrow`, `title`, `items[]` (`name`, `price`, `period`, `bullets[]`, `ctaLabel`+`ctaHref`, `highlighted`) | No |
| `testimonials` | Customer quotes | `eyebrow`, `title`, `items[]` (`body`, `authorName`, `authorRole`, `imageUrl`, `rating`, `metric`) | No |
| `cta-banner` | Full-width closing CTA | `eyebrow`, `title`, `subtitle`, `ctaLabel`+`ctaHref` | No |
| `form` | Generic lead-capture form | `eyebrow`, `title`, `subtitle`, `name` (form identity), `items[]` (`name`, `label`, `type`, `required`), `submitLabel`, `successMessage` | No (submits to `/api/forms/submit` → `form_submissions` table) |
| `blog-list` | Latest blog posts | `eyebrow`, `title`, `subtitle`, `limit`, `categorySlug` | **Yes** — queries `blog_posts` at render time |
| `content` | Freeform rich text | `bodyHtml` | No — synced from Payload's Lexical editor via `convertLexicalToHTML`, same as a blog post body |

Full shapes are the source of truth in `lib/layers/registry.ts` — this
table is a map, not a spec.

## Block styling: `blockSettings` / `<BlockWrapper />` / `<BlockRenderer />`

Every block (not just content) also carries a `blockSettings` group,
independent of its own content fields — `backgroundColor` (white/gray/
dark/brand), `padding` (none/normal/large), `textAlign` (left/center/
right), `hasBorder` (checkbox). An editor sets these from Payload's admin
(or the Content Hub's block editor) without touching code.

This is deliberately **not** part of any layer's own `propsSchema` — a
layer component (`HeroLayer`, `ContentLayer`, ...) only ever describes its
actual content, never styling mechanics. The split:

- `lib/layers/block-settings.ts` — the Zod schema (mirrors payload-cms's
  `src/blocks/shared/blockSettings.ts` group field) and
  `resolveBlockSettingsClassName()`, which turns the four settings into
  Tailwind utility classes (e.g. `dark` → `bg-slate-900 text-white`).
- `components/layers/block-wrapper.tsx` — `<BlockWrapper settings={...}>`
  applies those classes around a layer's rendered JSX.
- `components/layers/block-renderer.tsx` — `<BlockRenderer layers={...} />`,
  the one shared rendering loop (layerRegistry lookup → strip
  `blockSettings` out of the raw props → `propsSchema.parse()` the rest →
  wrap in `<BlockWrapper>`). Both page routes (`features/page.tsx`,
  `[...slug]/page.tsx`) use this instead of duplicating the loop.

No entry needed in `mapBlockToProps()`'s per-block cases for this — the
Payload sync (`syncPageToNeosaasApp`) merges `blockSettings` into every
block's synced props once, generically, so a new block type gets it for
free.

## Media & multi-tenancy

Payload's `media` collection stays publicly readable (`access.read: () =>
true`) on purpose — a published page's `imageUrl` is a real URL the
browser fetches with no Payload session, so locking that down would break
every live image. The actual tenant boundary that matters is in the
**admin authoring UI**: every `upload`-type field inside a block (Hero's
`image`, Testimonials' `items.image`, plus BlogPosts' `coverImage`) has
`filterOptions: tenantFilterOptions` (payload-cms's
`src/hooks/tenantFilterOptions.ts`), so an editor of one tenant can never
browse or attach another tenant's media in the relationship picker — same
rule already applied to `Pages.parent`/`Pages.category`/`Categories.parent`.

## Live Preview

Payload's editor gets a real "see it before you publish" panel (Charles,
2026-07-05: the stock block form has zero visual feedback) — the site's
own rendering, live, in an iframe, updating as the editor types.

```
Payload admin edits a Page      →   admin.livePreview.url (payload.config.ts)
                                     opens an iframe at:
                                     https://<site>/api/preview?secret=...&path=...
                                            │
                                            ▼
                                     app/api/preview/route.ts validates
                                     PREVIEW_SECRET, enables Next.js Draft
                                     Mode, redirects to the real page route
                                            │
                                            ▼
                                     [...slug]/page.tsx sees draftMode()
                                     enabled → fetches the draft straight
                                     from Payload (getPageForPreview(),
                                     draft=true) instead of querying this
                                     site's own page_layers table (which
                                     only ever has *published* content)
                                            │
                                            ▼
                                     lib/layers/from-payload.ts maps
                                     Payload's raw block shape into the same
                                     rows <BlockRenderer/> already consumes
                                            │
                                            ▼
                                     <RefreshPreview/> (wraps Payload's
                                     official RefreshRouteOnSave) calls
                                     router.refresh() on every keystroke —
                                     re-fetches the draft, re-renders
```

**Why a separate fetch path just for this**: every other read in this repo
deliberately never talks to Payload at runtime (see "How a page gets built"
above) — a draft is the one exception, since it doesn't exist in
`page_layers` at all until published. `lib/layers/from-payload.ts` mirrors
payload-cms's `mapBlockToProps()` field-for-field; touch both when adding a
block type, same mirror discipline as the rest of this doc.

**Env vars**: `PREVIEW_SECRET` (shared between payload-cms and this site —
gates `/api/preview`), `NEXT_PUBLIC_PAYLOAD_URL` (Payload's own origin, so
`RefreshRouteOnSave` only trusts postMessages from it). payload-cms side
needs `PREVIEW_SECRET` + `NEOSAAS_APP_PREVIEW_URL` (fallback base URL,
overridden by a Tenant's own `domain` field when set).

## Naming convention ("Pilier G")

`lib/layers/prop-vocabulary.ts` is the canonical prop-name dictionary.
**Reuse an existing name for an existing concept — never invent a
synonym.** `ctaLabel`/`ctaHref` always mean "a link styled as a button";
`items` always means "the array this block iterates over"; `eyebrow`
always means "small bracketed label above a title"; etc.

One subtlety: `ctaLabel` implies `ctaHref` (enforced by
`REQUIRED_PROP_PAIRS` — a lint error fires if one appears without the
other), because a CTA is a hyperlink. A **submit button has no href**, so
the `form` block's submit button uses `submitLabel` instead — a
deliberately different name for a deliberately different concept, not an
oversight.

Run `pnpm lint:layers` after touching `registry.ts` or
`prop-vocabulary.ts` — it checks kebab-case `layerType`s, forbidden
synonyms, and the required-pair rule. CI runs it on any PR touching
`lib/layers/` or `components/layers/`.

## Automation hooks: `data-slot` / `data-variant` / `data-size` / `data-shadow`

`components/ui/button.tsx`, `badge.tsx`, and `card.tsx` each expose their
resolved variant as a `data-*` attribute (e.g.
`<button data-slot="button" data-variant="outline" data-size="lg">`),
always populated even when the prop was omitted (resolved against the
component's `cva` `defaultVariants`). **Target these attributes, not
Tailwind's generated utility-class strings**, if you need to select or
verify a specific button/badge/card variant programmatically (tests,
scripts, another agent inspecting the rendered DOM). This is the
established pattern going forward for any new variant-based UI primitive.

## Adding a new block — checklist

1. **neosaas-v2**: `components/layers/<name>-layer.tsx` (the React
   component + its Props interface).
2. **neosaas-v2**: register it in `lib/layers/registry.ts` (Zod schema,
   `satisfies z.ZodType<YourProps>` for compile-time drift protection).
3. **neosaas-v2**: any genuinely new prop concept goes in
   `lib/layers/prop-vocabulary.ts` (`ALLOWED_PROP_NAMES` + likely-tempting
   synonyms in `FORBIDDEN_PROP_SYNONYMS`).
4. **payload-cms**: `src/blocks/<Name>.ts` (Payload `Block` config, exact
   same field names as step 2).
5. **payload-cms**: register it in `src/collections/Pages.ts`'s `blocks:
   [...]` array.
6. **payload-cms**: add a `case '<layer-type>':` to `mapBlockToProps()` in
   `src/sync/targets/neosaas-app.ts`.
7. Run `pnpm lint:layers` and `tsc --noEmit` in both repos before shipping.

Styling (`blockSettings`) needs no extra step — every block gets it
automatically by including `blockSettingsField` in its Payload `fields`
array (step 4) and rendering through `<BlockRenderer />` (already true for
every page route). Only add `filterOptions: tenantFilterOptions` yourself
if the new block has its own `upload`-type field.

If the block needs its own database table (like `form_submissions` or
`blog_posts`) rather than reusing `page_layers`, also: add the table to
`db/schema.ts`, run `pnpm db:generate` to produce the migration (never
hand-write migration SQL), and know that it auto-applies on the next
Vercel build via `scripts/build-with-db.sh` — no manual migration step.
