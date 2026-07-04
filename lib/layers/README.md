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

## Current block inventory (7)

| `layerType` | Purpose | Notable props | Dynamic? |
|---|---|---|---|
| `hero` | Page/section header | `eyebrow`, `title`, `subtitle`, `trustPills[]`, `ctaLabel`+`ctaHref`, `secondaryCtaLabel`+`secondaryCtaHref`, `imageUrl` | No |
| `feature-grid` | Grid of icon+text cards | `eyebrow`, `title`, `items[]` (`icon`, `title`, `description`, `bullets[]`) | No |
| `pricing-table` | Static pricing cards | `eyebrow`, `title`, `items[]` (`name`, `price`, `period`, `bullets[]`, `ctaLabel`+`ctaHref`, `highlighted`) | No |
| `testimonials` | Customer quotes | `eyebrow`, `title`, `items[]` (`body`, `authorName`, `authorRole`, `imageUrl`, `rating`, `metric`) | No |
| `cta-banner` | Full-width closing CTA | `eyebrow`, `title`, `subtitle`, `ctaLabel`+`ctaHref` | No |
| `form` | Generic lead-capture form | `eyebrow`, `title`, `subtitle`, `name` (form identity), `items[]` (`name`, `label`, `type`, `required`), `submitLabel`, `successMessage` | No (submits to `/api/forms/submit` → `form_submissions` table) |
| `blog-list` | Latest blog posts | `eyebrow`, `title`, `subtitle`, `limit`, `categorySlug` | **Yes** — queries `blog_posts` at render time |

Full shapes are the source of truth in `lib/layers/registry.ts` — this
table is a map, not a spec.

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

If the block needs its own database table (like `form_submissions` or
`blog_posts`) rather than reusing `page_layers`, also: add the table to
`db/schema.ts`, run `pnpm db:generate` to produce the migration (never
hand-write migration SQL), and know that it auto-applies on the next
Vercel build via `scripts/build-with-db.sh` — no manual migration step.
