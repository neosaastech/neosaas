## [1.18.0](https://github.com/neosaastech/Neosaas-app/compare/v1.17.0...v1.18.0) (2026-08-13)

### Features

* searchable category picker for the categorySlug field ([a783a21](https://github.com/neosaastech/Neosaas-app/commit/a783a216b708feba91536955fe35e9dd3b194e4a))

## [1.17.0](https://github.com/neosaastech/Neosaas-app/compare/v1.16.1...v1.17.0) (2026-08-13)

### Features

* fixed module-anchor at the bottom of every article ([37cc1e2](https://github.com/neosaastech/Neosaas-app/commit/37cc1e20848cf1a96da6c668dbdbe3a30235d0c6))

## [1.16.1](https://github.com/neosaastech/Neosaas-app/compare/v1.16.0...v1.16.1) (2026-08-13)

### Bug Fixes

* pass locale to BlockRenderer on blog article extra blocks ([dfed0a9](https://github.com/neosaastech/Neosaas-app/commit/dfed0a9cbe30c6fa022864c080e76e51e8e15a1e)), closes [#87](https://github.com/neosaastech/Neosaas-app/issues/87)

## [1.16.0](https://github.com/neosaastech/Neosaas-app/compare/v1.15.0...v1.16.0) (2026-08-13)

### Features

* make "related articles" a pilotable block, not a fixed section ([b5b439d](https://github.com/neosaastech/Neosaas-app/commit/b5b439de14b474038458fb8c9b5c0ab23fd23ae9))

## [1.15.0](https://github.com/neosaastech/Neosaas-app/compare/v1.14.1...v1.15.0) (2026-08-13)

### Features

* real author card, related articles, and article layout fixes ([357a731](https://github.com/neosaastech/Neosaas-app/commit/357a731022c3e49a32a8a9cd69b80b5412b9fd99))

## [1.14.1](https://github.com/neosaastech/Neosaas-app/compare/v1.14.0...v1.14.1) (2026-08-13)

### Bug Fixes

* decode HTML entities in table-of-contents heading text ([2ce789f](https://github.com/neosaastech/Neosaas-app/commit/2ce789fba3f2415feb860ffceb5b1c6e840f0193)), closes [#39](https://github.com/neosaastech/Neosaas-app/issues/39)

## [1.14.0](https://github.com/neosaastech/Neosaas-app/compare/v1.13.6...v1.14.0) (2026-08-13)

### Features

* add table of contents and share buttons to blog articles ([ab18b86](https://github.com/neosaastech/Neosaas-app/commit/ab18b868bb80febc7a081e4354d969c7e741fd69))

### Bug Fixes

* localize hardcoded "Par" author byline label on blog posts ([6efd8f1](https://github.com/neosaastech/Neosaas-app/commit/6efd8f1082d298f85f4dbd078872342c643e181a))

## [1.13.6](https://github.com/neosaastech/Neosaas-app/compare/v1.13.5...v1.13.6) (2026-08-13)

### Bug Fixes

* unwrap populated reference.value in PayloadLinkEditor ([23d898b](https://github.com/neosaastech/Neosaas-app/commit/23d898ba36f9110fc0568abbc1a7f3e6c9350746))

## [1.13.5](https://github.com/neosaastech/Neosaas-app/compare/v1.13.4...v1.13.5) (2026-08-10)

### Bug Fixes

* **db:** add payload_post_id/payload_category_id for stable sync upsert ([89d8388](https://github.com/neosaastech/Neosaas-app/commit/89d83884434ee0026f75d4a56530a95c7f1074d0))

## [1.13.4](https://github.com/neosaastech/Neosaas-app/compare/v1.13.3...v1.13.4) (2026-08-10)

### Bug Fixes

* **notifications:** route Header/Footer/Category sync failures to Payload admin ([46e058c](https://github.com/neosaastech/Neosaas-app/commit/46e058c2a99adc293d160142b4ce628955df24a1))

## [1.13.3](https://github.com/neosaastech/Neosaas-app/compare/v1.13.2...v1.13.3) (2026-08-09)

### Bug Fixes

* **docs:** footer rendered at the top instead of the bottom ([7b06543](https://github.com/neosaastech/Neosaas-app/commit/7b065438d930f2c446f071e0c016024f274759a0))

## [1.13.2](https://github.com/neosaastech/Neosaas-app/compare/v1.13.1...v1.13.2) (2026-08-09)

### Bug Fixes

* **docs:** use the real site-wide Footer instead of a half-built stub ([31a938f](https://github.com/neosaastech/Neosaas-app/commit/31a938fa6f633b1008d2121df19371ea43d03958))

## [1.13.1](https://github.com/neosaastech/Neosaas-app/compare/v1.13.0...v1.13.1) (2026-08-09)

### Bug Fixes

* **updates:** honest deploy feedback, prevent double-clicking Apply update ([6ef7c09](https://github.com/neosaastech/Neosaas-app/commit/6ef7c09a6457ac82d8536d7a43c30daf9d3d128c))

## [1.13.0](https://github.com/neosaastech/Neosaas-app/compare/v1.12.9...v1.13.0) (2026-08-09)

### Features

* **notifications:** surface content sync failures in the admin bell ([980fdaf](https://github.com/neosaastech/Neosaas-app/commit/980fdafbac99e4a7f5e7f46d051daf8630e702d1))

## [1.12.9](https://github.com/neosaastech/Neosaas-app/compare/v1.12.8...v1.12.9) (2026-08-09)

### Bug Fixes

* **payload-bridge:** surface field validation errors instead of raw JSON ([5d0ffab](https://github.com/neosaastech/Neosaas-app/commit/5d0ffab099c6e7fa945909b455c281a3d50cf08b))

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
