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
