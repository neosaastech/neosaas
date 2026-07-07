# Language Policy — English

**Status:** Active · **Applies to:** NeoSaaS product UI, API user messages, and developer-facing strings

NeoSaaS is an **English-first** codebase. All user-visible product text must be written in English unless a dedicated i18n layer is explicitly introduced.

---

## Scope (must be English)

| Area | Examples |
|------|----------|
| **Navigation** | Sidebar labels, menu groups, collapsible section titles |
| **Page titles** | `<h1>` headings and browser tab titles (`usePageTitle`) |
| **Forms** | Labels, placeholders, helper text, validation messages |
| **Actions** | Buttons, links, dialogs, toasts, empty states |
| **Admin UI** | Tables, filters, guards, loading states |
| **Search catalog** | `lib/search-catalog.ts` names, categories, keywords |
| **API responses** | User-facing `error` / `message` fields returned to the client |
| **Email templates** | Default seeded templates (unless locale-specific templates exist) |

---

## Conventions

### Page titles

Client dashboard pages use the shared hook:

```tsx
import { usePageTitle } from "@/hooks/use-page-title"

export default function ExamplePage() {
  usePageTitle("Payments")
  return <h1 className="text-3xl font-bold">Payments</h1>
}
```

The **visible `<h1>`** and **`usePageTitle` argument** must match the sidebar label.

### Client dashboard menu (reference)

| Route | Title |
|-------|-------|
| `/dashboard` | Catalog |
| `/dashboard/company-management` | Company Management |
| `/dashboard/payments` | Payments |
| `/dashboard/profile` | Profile |
| `/dashboard/chat` | Chat |
| `/dashboard/support` | Support |

Account section collapsible: **Account** → **Profile** (Company Management, Payments) · **Support** (Chat, Support).

### Dates & numbers

Use **`en-US`** locale for user-visible formatting (`date-fns/locale`, `Intl`, `toLocaleString`).

### Code

- **Comments** in application code: English.
- **Variable / function names**: English.
- **Commits & PR descriptions**: English preferred.

---

## Out of scope (may stay non-English)

- Internal runbooks, team notes, or Charles-specific docs not shipped with the product
- Console logs in dev scripts (English preferred but not blocking)
- Database column comments (internal only)
- Future `[locale]` public marketing pages when i18n is implemented deliberately

Do **not** add French UI strings “temporarily” — use English placeholders instead.

---

## Review checklist

Before merging UI work:

- [ ] No French (or mixed) labels in components under `app/(private)/`, `components/`, `app/(public)/`
- [ ] Page `<h1>` matches sidebar entry
- [ ] `usePageTitle` set on new client pages
- [ ] Toasts and dialog titles in English
- [ ] Search catalog updated if new routes are added

---

## Related

- Cursor rule: `.cursor/rules/english-ui.mdc`
- Historical translation audit: `docs/LANGUAGE_STANDARDIZATION.md` (SharePoint mirror / legacy log)
