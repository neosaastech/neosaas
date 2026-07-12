## [1.8.0](https://github.com/neosaastech/Neosaas-app/compare/v1.7.1...v1.8.0) (2026-07-12)

### Features

* add code-showcase, features-list, logo-cloud blocks ([1ab70bd](https://github.com/neosaastech/Neosaas-app/commit/1ab70bd505887c29c879d1d05603d38f066947c5))
* **articles:** insert images in the rich text editor body ([12c6d86](https://github.com/neosaastech/Neosaas-app/commit/12c6d8609da0f254d8c16f74aa97c4fa71f0aa46))
* **blocks:** source classification (library vs project-specific) ([1b52dd6](https://github.com/neosaastech/Neosaas-app/commit/1b52dd64a2b31814be534152c192443f6ce68f46))
* **content-hub:** async meta title/description autofill on ArticleEditor ([f0209ab](https://github.com/neosaastech/Neosaas-app/commit/f0209abbaac0ffe6a92003700107c70c599639d6))
* **content-hub:** author name, direct publish toggle, CSV export ([645368a](https://github.com/neosaastech/Neosaas-app/commit/645368a5ccccbdf3be3379d32cc99bcc6cb4304b))
* **content-hub:** autosave model, collapsible blocks, link clear button ([26fdac2](https://github.com/neosaastech/Neosaas-app/commit/26fdac23655f58c6cb7e16fd229eba59bdf8f741))
* **content-hub:** character-limit indicator on meta title/description ([60cc979](https://github.com/neosaastech/Neosaas-app/commit/60cc9798a28484a9d0082f43237ff41202960632))
* **content-hub:** expose Page type=Documentation + Parent field ([36a0b01](https://github.com/neosaastech/Neosaas-app/commit/36a0b014089530f30ecb37f7cdb8dfd87dc68b9e))
* **content-hub:** fold Categories into the unified Content list too ([d7a60a1](https://github.com/neosaastech/Neosaas-app/commit/d7a60a1a9e9652bc7d09b64c9889a0835ebeb109))
* **content-hub:** full nested recursive editor for Columns block ([e68620c](https://github.com/neosaastech/Neosaas-app/commit/e68620ca439a4b97aac159bab3ba8737632ceb6d))
* **content-hub:** full-screen mobile filters panel ([a9d4010](https://github.com/neosaastech/Neosaas-app/commit/a9d4010101d1639f6fe292596f0c451f439beaea))
* **content-hub:** hardcoded pages (pricing, legal) selectable in link pickers ([b2fe99c](https://github.com/neosaastech/Neosaas-app/commit/b2fe99ce94b8542c239c9a4250bc3b596bec09fb))
* **content-hub:** link fields (ctaHref, etc.) pick from existing pages instead of free-text ([8017015](https://github.com/neosaastech/Neosaas-app/commit/80170157a55193bac720e94d4d3a7b86c1edf8a3))
* **content-hub:** match Products' filter layout/typography, block picker icons, tabbed variables, English strings ([5a697eb](https://github.com/neosaastech/Neosaas-app/commit/5a697ebcc6ec66b3bea6df9d45bcc975f4e5aa47))
* **content-hub:** media picker with thumbnails + fix imageUrl/ctaHref never persisting to Payload ([87ddb25](https://github.com/neosaastech/Neosaas-app/commit/87ddb251ed3c4070997cccf248042928945abaae))
* **content-hub:** row actions match Products' icon buttons exactly, add Media tab ([6f7a24b](https://github.com/neosaastech/Neosaas-app/commit/6f7a24b8b3c99f62007f62ce8eba8c39a9682767))
* **content-hub:** search, sort, bulk actions, inline edit, column toggle ([9f2eb89](https://github.com/neosaastech/Neosaas-app/commit/9f2eb894edb4a3515b6082116ba0e194006f857b))
* **content-hub:** searchable combobox on link field's "Existing page" picker ([2e20bd6](https://github.com/neosaastech/Neosaas-app/commit/2e20bd6b8f3981c12eb7622f2c1995ae33ea1077))
* **content-hub:** searchable link picker in rich text editor, H1/H4-H6 headings ([ee911b8](https://github.com/neosaastech/Neosaas-app/commit/ee911b8f3642ea44549f0521e6c59261a7c5bf44))
* **content-hub:** status column matches Products' Eye/EyeOff icon exactly, path becomes a real link ([9093bc4](https://github.com/neosaastech/Neosaas-app/commit/9093bc41eecdb9f45ae3c521841d83ad45cb53ef))
* **content-hub:** Switch toggles for SEO booleans + Publication card ([f18f39b](https://github.com/neosaastech/Neosaas-app/commit/f18f39b3069b1b46d87a8af5c8ba7ce1c5b0b5ae))
* **content-hub:** tabs (Content/SEO/Settings) + rich subtitle editing ([6c5bee8](https://github.com/neosaastech/Neosaas-app/commit/6c5bee82c709d921f2837378df0e3ce974adf3cf))
* **content-hub:** unified media edit overlay, single icon, Content Management rename ([13eaefe](https://github.com/neosaastech/Neosaas-app/commit/13eaefe55e68ab2503e5987dfe98af5f66648029))
* **content-hub:** unify Pages/Articles into one Content list + type picker ([972d6bb](https://github.com/neosaastech/Neosaas-app/commit/972d6bb33e388342ced19fbf8a3229e61632928e))
* **content-hub:** visual block picker dialog with real thumbnails ([554ce26](https://github.com/neosaastech/Neosaas-app/commit/554ce264eafa53136023cfd4f2bdef7820ced8bb)), closes [#51](https://github.com/neosaastech/Neosaas-app/issues/51) [#50](https://github.com/neosaastech/Neosaas-app/issues/50)
* **db:** add title column to page_seo ([c22d0ca](https://github.com/neosaastech/Neosaas-app/commit/c22d0ca652888876706f47bb1f5d00c056119115))
* **docs:** filter wiki membership by pageType instead of path prefix ([92f865f](https://github.com/neosaastech/Neosaas-app/commit/92f865fb02c600adbf501d8627ebbe74fc762095))
* **docs:** navigable /documentation via Fumadocs, sourced from Payload ([7285214](https://github.com/neosaastech/Neosaas-app/commit/7285214f5920a770ced09a1fba1a60a46ca4199d))
* **feature-grid:** searchable icon picker (full Lucide catalog) + icon size selector ([072931b](https://github.com/neosaastech/Neosaas-app/commit/072931bc1205f90083217a9d6956493899f342b6))
* **media-gallery:** crop existing images in the edit overlay ([f8e64bf](https://github.com/neosaastech/Neosaas-app/commit/f8e64bfb707c08720f728649a6a1ec13a04d860b))
* **media:** date/name/size sort + CSV import/export ([b44b128](https://github.com/neosaastech/Neosaas-app/commit/b44b12821fcd47e157ac46115ccb281037252e40))
* **media:** generic upload/delete/transform actions against Payload ([a6f68d5](https://github.com/neosaastech/Neosaas-app/commit/a6f68d5e824f8abc76b60f160e56b2b85d2c9284))
* **media:** multi-select bulk actions, PDF rename/alt editing, PDF links in editor ([4b95467](https://github.com/neosaastech/Neosaas-app/commit/4b95467dfd209fc246aa4e45e916c515a631c405))
* **media:** overlay layout, bulk rotate/minify, filesize, drag&drop crop ([e683923](https://github.com/neosaastech/Neosaas-app/commit/e6839239ac749910fd635ba74e289749796c7d3c))
* **media:** real gallery UI in the Content Hub (upload, drag&drop, transform, crop) ([164253a](https://github.com/neosaastech/Neosaas-app/commit/164253ac3a216ac5cfc41c33088b1896b177d7f9))
* **media:** remove bulk alt-text button, unify save progress, add resize ([5db7b44](https://github.com/neosaastech/Neosaas-app/commit/5db7b44ed6883799e85a6ca7326d432ee421368b))
* migrate Tailwind CSS v3 to v4 ([6784836](https://github.com/neosaastech/Neosaas-app/commit/6784836d1148911abbcbcc16e945e6d8b29ced78))
* **scheduling:** scheduled publish/unpublish UI + delete confirmation ([72e7544](https://github.com/neosaastech/Neosaas-app/commit/72e75448a53d0b13f217f1b95af527617a5e79df))
* **seo:** add Index & Follow selector + recap table column ([2b1b1ec](https://github.com/neosaastech/Neosaas-app/commit/2b1b1ec34c0484112965b15bd9c966c4c0b0ada6))
* **seo:** header image for Pages, Articles, Categories ([6631507](https://github.com/neosaastech/Neosaas-app/commit/6631507097a192e05b91e91127892de211d53bc2))
* **seo:** includeSiteNameInTitle toggle bypasses root layout's title.template ([ebab355](https://github.com/neosaastech/Neosaas-app/commit/ebab35546ff20bef1ea516edb59356caccb50f46))
* **wiki:** minimal dedicated header bar + discoverable entry point ([4ba0e4d](https://github.com/neosaastech/Neosaas-app/commit/4ba0e4d88afb0aa0a7042678280eb45f7b099d44))

### Bug Fixes

* **admin:** reactivate mobile menu + fix touch-inaccessible media actions ([0e57ca1](https://github.com/neosaastech/Neosaas-app/commit/0e57ca19768d4f1dacee038daf540094c656e964))
* **content-hub:** disableContainer on convertLexicalToHTML — no more wrapper div ([a728b2a](https://github.com/neosaastech/Neosaas-app/commit/a728b2a2c6a8ed88d24ee1da8faff25dd4edea1a))
* **content-hub:** English-only admin labels + 3-way block classification ([4e89960](https://github.com/neosaastech/Neosaas-app/commit/4e89960755f25bbc0412f693d61a4499d715fa40))
* **content-hub:** feature-grid/pricing-table bullets never persisted ([f2a0d3e](https://github.com/neosaastech/Neosaas-app/commit/f2a0d3e3f7a3b3bf7f699d074ec16190e4e03262))
* **content-hub:** icon-showcase's imageUrl/videoUrl never persisted ([5bff20b](https://github.com/neosaastech/Neosaas-app/commit/5bff20b8e1f0cefe615d4ee06b634621132ccfe5))
* **content-hub:** optimistic delete for Pages/Articles instead of full reload ([b43e54b](https://github.com/neosaastech/Neosaas-app/commit/b43e54b814c6a9271644c618a7f1125963501845))
* **content-hub:** page editor loaded the stale published snapshot, not the latest draft ([5e356bd](https://github.com/neosaastech/Neosaas-app/commit/5e356bd30d0f7a8f1b5f21c8f7a778053e555650))
* **hero-split:** featured:null crashed the whole page at render time ([02ef5a3](https://github.com/neosaastech/Neosaas-app/commit/02ef5a31d5646341c4bd22fb727a55b96ef0ca67))
* **icon-picker:** show icon names, not just unlabeled glyphs ([33baf25](https://github.com/neosaastech/Neosaas-app/commit/33baf25be23b57a798d56698ea247ff9390b9487))
* **icon-picker:** two crashes found opening/searching the picker in prod ([aea1aff](https://github.com/neosaastech/Neosaas-app/commit/aea1affb22f3870e6acbbae3feeff6c219997d93))
* **layers:** one malformed block must not crash the whole page render ([25ad03a](https://github.com/neosaastech/Neosaas-app/commit/25ad03a7d2641e55e124796b2923095dacb68170))
* **layers:** welcome-banner rendered subtitle as escaped text, not HTML ([0f56c53](https://github.com/neosaastech/Neosaas-app/commit/0f56c53615e2f4405df0eeda5ce8e08d9a2515ae))
* **media:** sequencer + progress popup, no more full-grid reload/jump ([c670d5e](https://github.com/neosaastech/Neosaas-app/commit/c670d5e3c11540aad32864ad93771d9cd657b6b6))
* **pages:** cta-banner crashes public render when reference-type CTA is unset ([2d1615e](https://github.com/neosaastech/Neosaas-app/commit/2d1615e129be6074c9927c64fee6b5958cd781ab))
* **security:** gate bootstrap super_admin seeding to preview/dev only ([f5cfe5f](https://github.com/neosaastech/Neosaas-app/commit/f5cfe5f46b294ebd7492235daf851676cffbf19f))
* **security:** one-time deactivation of the exposed bootstrap admin account ([5995d8e](https://github.com/neosaastech/Neosaas-app/commit/5995d8e4e0ea71bfb45b950ed16a04bfe8607fdf))
* **security:** one-time reactivation of the bootstrap admin account ([61c0f76](https://github.com/neosaastech/Neosaas-app/commit/61c0f7694ad0752bf07c743f72e4c3647c326953))
* **seo:** meta/seo field name mismatch + clickable Index & Follow toggle ([4299225](https://github.com/neosaastech/Neosaas-app/commit/42992250a9bf9dafc0d9315ef7e195d44dd53203))
* **tailwind-v4:** remove dead custom spacing tokens colliding with max-w-* scale ([4652357](https://github.com/neosaastech/Neosaas-app/commit/46523573ecb49379506f93a50a359385027b7de6))

## [1.7.1](https://github.com/neosaastech/Neosaas-app/compare/v1.7.0...v1.7.1) (2026-07-09)

### Bug Fixes

* **blocks:** implement hero-split end-to-end, fix stale preview link mapping ([0dfe945](https://github.com/neosaastech/Neosaas-app/commit/0dfe945e4fc77fdb60b14ca093756b318c633a94))

## [1.7.0](https://github.com/neosaastech/Neosaas-app/compare/v1.6.1...v1.7.0) (2026-07-08)

### Features

* **content-hub:** editor becomes locale-aware, categories localized, SEO preview ([6f33e8e](https://github.com/neosaastech/Neosaas-app/commit/6f33e8ed6f4a2a8841332a4bd9b06e20d21dc3c5))

## [1.6.1](https://github.com/neosaastech/Neosaas-app/compare/v1.6.0...v1.6.1) (2026-07-08)

### Bug Fixes

* **seo:** remove alternates.languages — crashing every page in production ([1e68bab](https://github.com/neosaastech/Neosaas-app/commit/1e68babf194c28d90faa06db6a4fa1f72bc6ba89))
* **theme:** getThemeConfig deep-merges with defaults — root cause of the outage ([5cb8156](https://github.com/neosaastech/Neosaas-app/commit/5cb8156dfe4ff7753b491acc11473bc6ede66400))

### Reverts

* **i18n+seo:** full rollback — removing alternates alone did not fix prod 500 ([b5d79c2](https://github.com/neosaastech/Neosaas-app/commit/b5d79c24e8d4435ed64616ffd4b526ad431d3ffc))

## [1.6.0](https://github.com/neosaastech/Neosaas-app/compare/v1.5.1...v1.6.0) (2026-07-08)

### Features

* **content-hub:** visual polish to match the Products page ([a7996c7](https://github.com/neosaastech/Neosaas-app/commit/a7996c75ef4c5da42ef670fe4a07e615641d5a27))

## [1.5.1](https://github.com/neosaastech/Neosaas-app/compare/v1.5.0...v1.5.1) (2026-07-08)

### Bug Fixes

* **pages:** block publishing a page with zero blocks ([bb08510](https://github.com/neosaastech/Neosaas-app/commit/bb08510e0ac1b374dd589e72177bea046b9508d0))

## [1.5.0](https://github.com/neosaastech/Neosaas-app/compare/v1.4.0...v1.5.0) (2026-07-08)

### Features

* **i18n+seo:** fix hardcoded <html lang>, add locale switcher, per-page SEO ([96b8cbe](https://github.com/neosaastech/Neosaas-app/commit/96b8cbeb58894918c22a686e24ba2c29bb6b9a7c))

## [1.4.0](https://github.com/neosaastech/Neosaas-app/compare/v1.3.0...v1.4.0) (2026-07-08)

### Features

* **content-hub:** add delete for Pages and Articles ([15d6cb2](https://github.com/neosaastech/Neosaas-app/commit/15d6cb29d6734fbcb2280029968dad9877796f7f))

## [1.3.0](https://github.com/neosaastech/Neosaas-app/compare/v1.2.0...v1.3.0) (2026-07-08)

### Features

* **content-hub:** surface Payload sync failures instead of silent 404s ([a9e6e0f](https://github.com/neosaastech/Neosaas-app/commit/a9e6e0f0d046e3304fd1bdbfe293fc8b09db0930))

## [1.2.0](https://github.com/neosaastech/Neosaas-app/compare/v1.1.2...v1.2.0) (2026-07-08)

### Features

* **pages:** hint that an empty slug creates the home page ([b385487](https://github.com/neosaastech/Neosaas-app/commit/b385487f15707f18cbc9f9e3def5ac801fc29271))

## [1.1.2](https://github.com/neosaastech/Neosaas-app/compare/v1.1.1...v1.1.2) (2026-07-08)

### Bug Fixes

* **updates:** restore legacy env var fallback for GitHub deploy config ([7770818](https://github.com/neosaastech/Neosaas-app/commit/7770818a972e086701fcfe5b93b5448bdacbecac))

## [1.1.1](https://github.com/neosaastech/Neosaas-app/compare/v1.1.0...v1.1.1) (2026-07-08)

### Bug Fixes

* **release:** docker images never got a versioned tag on Docker Hub/GHCR ([6bb34df](https://github.com/neosaastech/Neosaas-app/commit/6bb34df1e45c5e25ea35df23f5ba111596e66f3c))

## [1.1.0](https://github.com/neosaastech/Neosaas-app/compare/v1.0.10...v1.1.0) (2026-07-08)

### Features

* **updates:** configure per-site GitHub target repo from admin/api panel ([dfe36c6](https://github.com/neosaastech/Neosaas-app/commit/dfe36c64b4912d114907d59860bfdf05d0ae760e))

## [1.0.10](https://github.com/neosaastech/Neosaas-app/compare/v1.0.9...v1.0.10) (2026-07-08)

### Bug Fixes

* **ci:** release-live.yml still had the release-please content ([1c8b8b7](https://github.com/neosaastech/Neosaas-app/commit/1c8b8b778278816b84b159068a800795f7a19dbd))

# Changelog

All notable changes to the NeoSaaS boilerplate are documented here.

## Versioning Policy

This project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`), enforced automatically by [semantic-release](https://github.com/semantic-release/semantic-release) from [Conventional Commits](https://www.conventionalcommits.org/) messages. Every push to `release-live` that contains a releasable commit publishes immediately — no manual version bump, no release PR to merge — since `release-live` is the trigger point that propagates updates to every client site (see `scripts/release-sync-boilerplate.sh`):

- **PATCH** (`x.y.Z`) — bug fixes only (`fix:` commits). No new features, no architecture changes.
- **MINOR** (`x.Y.z`) — new features or notable non-breaking changes (`feat:` commits).
- **MAJOR** (`X.y.z`) — different architecture or advanced/breaking new capabilities (`feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer).

## [Unreleased]

## [1.0.9] - 2026-07-08

_Note: originally tagged v1.0.8, renumbered to v1.0.9 to avoid colliding
with a pre-existing, unrelated `v1.0.8` tag left over from an earlier
release cycle (PR #49, 2026-07-07)._

### Fixed
- User avatar and company logo disappearing from the header within a second of loading (a `localStorage` cache was clobbering the state fetched from the API)
- Company logo missing from the companies list and the admin edit form (the `logo` field was dropped in `getCompanies()`'s mapping)
- Inconsistent image cropping across screens — shared component (`CroppedFileInput`) wired into all 5 image pickers (profile avatar, self-service + admin company logo, admin user create/edit avatar)
- Admin avatar upload (user create/edit) was purely cosmetic — never actually persisted server-side; added `/api/admin/users/[userId]/profile-image`
- "Send Test" (Mail Management) sent raw HTML/subject without substituting variables — `{{firstName}}` etc. arrived literally in the test email
- Emails actually sent (signup, password reset) used template types missing from the admin UI — `password_reset` in particular failed silently, no email was ever sent
- 4 commerce email templates (physical/digital/subscription order, payment) were entirely missing from the database
- Order/payment email subjects were always overridden by a hardcoded string, making the admin-editable subject a no-op
- Variables offered in the mail UI's picker didn't match what the send code actually substituted (now derived per template type)
- Email-change notification was never sent (malformed `sendEmail()` call)
- Dynamic variables (`{{siteName}}` etc.) weren't resolved in blog article bodies, unlike pages

## [1.0.7] - 2026-07-07

### Fixed
- Build no longer wipes the database by default (`db:migrate` is additive, `db:hard-reset` is explicit opt-in)
- Logout never actually expired the session cookie (domain + duplicate `Set-Cookie` overwriting each other)
- "Apply update" mechanism (updating client sites): reliable version selection (`releases/latest` instead of `tags`), Vercel deployment confirmed via Deploy Hook + polling instead of relying on the Git webhook alone
- Update mechanism credentials now configurable per site from `admin/api` (no more manual environment variables)

### Added
- Notification bell visible to all users in the private area (previously admin-only)
