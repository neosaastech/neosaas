# NeoSaaS MCP — Agent Control Plane

NeoSaaS exposes a **Model Context Protocol (MCP)–compatible** JSON-RPC endpoint so AI agents (Cursor, internal agents, automation) can discover platform capabilities and orchestrate controlled builds (admin pages, dashboard modules, pilot actions).

**Endpoint:** `POST /api/mcp`  
**Protocol:** JSON-RPC 2.0  
**Server version:** `0.3.1` (`neosaas-mcp`)

---

## Why MCP in NeoSaaS?

| Goal | How MCP helps |
|------|----------------|
| Agent understands the SaaS | Typed tools over `featureRegistry`, Content Hub models, and build flows |
| Safe writes | Auth, dry-run by default, change sets, vertical rules |
| Repeatable builds | `validate_change_set` → `preview_diff` → `publish_change_set` |
| Auditability | Pilot actions logged via shared executor (`pilot_actions_log`) |

---

## Architecture

```
Agent (Cursor / internal)
        │
        ▼
POST /api/mcp  ── auth (session or NEOSAAS_MCP_TOKEN)
        │
        ▼
lib/mcp/neosaas-server.ts
        │
        ├── read tools ──► featureRegistry, Content Hub block registry
        │
        └── write tools ──► lib/mcp/changeset.ts
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
    lib/mcp/content-hub-executor.ts   lib/mcp/pilot-executor.ts
    (Payload createPage/createBlogPost) (legacy pilot bypass)
              │                                │
              ▼                                ▼
         Payload CMS                    DB (page_permissions, page_layers)
              │
              └── sync hooks → page_layers (on page publish)
```

### Key files

| Path | Role |
|------|------|
| `app/api/mcp/route.ts` | HTTP entrypoint |
| `lib/mcp/neosaas-server.ts` | JSON-RPC handler + tool registry |
| `lib/mcp/auth.ts` | Bearer token or admin session |
| `lib/mcp/changeset.ts` | Change set validation, preview, in-memory store |
| `lib/mcp/content-hub-page.ts` | Content Hub page model (`PageWriteInput`, block validation) |
| `lib/mcp/content-hub-article.ts` | Content Hub article model (`BlogPostWriteInput`) |
| `lib/mcp/content-hub-executor.ts` | Publish pages/articles to Payload |
| `lib/mcp/pilot-executor.ts` | Legacy pilot apply logic (Puck builder bypass) |
| `lib/mcp/propose-feature.ts` | Intent → proposed `FeatureConfig` |
| `components/admin/content/page-editor.tsx` | Canonical UI for page authoring |
| `components/admin/content/article-editor.tsx` | Canonical UI for article authoring |
| `app/actions/pages.ts` | `saveContentPage` / `saveContentArticle` server actions |
| `lib/payload-bridge.ts` | Payload read/write bridge |
| `lib/layers/registry-client.ts` | Content Hub block types + Zod schemas |
| `config/vertical-rules/*.json` | Vertical compliance rules |
| `scripts/test-mcp.ts` | MCP test suite (`pnpm test:mcp`) |
| `scripts/test-content-hub-page.ts` | Content Hub page flow tests |
| `scripts/test-content-hub-article.ts` | Content Hub article flow tests |

---

## Authentication

### Public (no auth)

- `initialize`
- `tools/list`

### Protected (auth required)

All `tools/call` invocations for operational tools require **one of**:

1. **Admin session** — `auth-token` cookie (same as admin UI)
2. **Agent token** — `Authorization: Bearer <NEOSAAS_MCP_TOKEN>`

```bash
# Generate a token
openssl rand -hex 32
```

```env
NEOSAAS_MCP_TOKEN=your-secret-token
```

> MCP does **not** auto-authenticate in offline dev without an explicit cookie or Bearer token.

### Error codes

| Code | Meaning |
|------|---------|
| `-32700` | Invalid JSON body |
| `-32600` | Invalid JSON-RPC request |
| `-32601` | Unknown method |
| `-32602` | Invalid params |
| `-32001` | Unauthorized |
| `-32000` | Tool execution error |

---

## JSON-RPC methods

### `initialize`

```bash
curl -s -X POST "$BASE_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

### `tools/list`

Returns all tool names and JSON Schema input definitions.

### `tools/call`

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_features",
    "arguments": {}
  }
}
```

---

## Tools reference

| Tool | Auth | Description |
|------|------|-------------|
| `list_features` | Yes | List metadata-driven dashboard modules |
| `get_feature` | Yes | Read one `FeatureConfig` by slug |
| `list_content_blocks` | Yes | List Content Hub block types (`PageEditor` model) |
| `propose_content_page` | Yes | Propose a `PageWriteInput` + layout from intent |
| `validate_content_page` | Yes | Validate a `PageWriteInput` (same rules as `PageEditor`) |
| `propose_content_article` | Yes | Propose a `BlogPostWriteInput` from intent |
| `validate_content_article` | Yes | Validate a `BlogPostWriteInput` (same rules as `ArticleEditor`) |
| `propose_feature_module` | Yes | Generate module proposal from natural-language intent |
| `validate_change_set` | Yes | Validate and store a build change set |
| `preview_diff` | Yes | Preview diff for a stored change set |
| `publish_change_set` | Yes | Publish `content_page` / `content_article` to Payload, or legacy `pilot_actions` |
| `apply_pilot_actions` | Yes | Dry-run or apply pilot actions directly (legacy bypass) |

---

## Content Hub page flow (canonical)

**Agents must follow the same model as `admin/content`**, not Puck/`set_layers` bypass.

```
PageEditor (UI)
  → saveContentPage (app/actions/pages.ts)
    → createPage / updatePage (lib/payload-bridge.ts)
      → Payload CMS
        → sync hooks → page_layers (on publish)
```

### MCP equivalent

```
propose_content_page
  → validate_content_page (optional)
    → validate_change_set { type: "content_page", payload: { locale, page } }
      → preview_diff
        → publish_change_set  → Payload createPage
```

### Discover blocks

```json
{ "name": "list_content_blocks", "arguments": {} }
```

### Propose page

```json
{
  "name": "propose_content_page",
  "arguments": {
    "intent": "Product landing with feature grid and contact CTA",
    "slug": "product-landing",
    "locale": "en",
    "status": "draft"
  }
}
```

> **Do not** use `pilot_actions` + `set_layers` for marketing/content pages. That path is reserved for the Puck builder (`/admin/pilotage/builder`) home-page bypass.

---

## Content Hub article flow (canonical)

Same procedure as pages, via `ArticleEditor`:

```
ArticleEditor (UI)
  → saveContentArticle (app/actions/pages.ts)
    → createBlogPost / updateBlogPost (lib/payload-bridge.ts)
      → Payload CMS (blog-posts collection)
```

### MCP equivalent

```
propose_content_article
  → validate_content_article (optional)
    → validate_change_set { type: "content_article", payload: { locale, article } }
      → preview_diff
        → publish_change_set  → Payload createBlogPost
```

### Propose article

```json
{
  "name": "propose_content_article",
  "arguments": {
    "intent": "Weekly product update with onboarding tips",
    "slug": "weekly-update",
    "locale": "en",
    "status": "draft"
  }
}
```

Returns `BlogPostWriteInput` with Lexical `body` JSON (same shape as `RichTextEditor`).

### Validate change set

```json
{
  "name": "validate_change_set",
  "arguments": {
    "operations": [
      {
        "type": "content_article",
        "payload": {
          "locale": "en",
          "article": {
            "title": "Weekly Update",
            "slug": "weekly-update",
            "excerpt": "What's new this week",
            "body": { "root": { "type": "root", "children": [] } },
            "_status": "draft"
          }
        }
      }
    ]
  }
}
```

---

## Level-3 build flow (dashboard modules + legacy pilot)

Use this sequence for **dashboard modules** or legacy pilot operations. For **content pages and articles**, use the Content Hub flows above.

### Validate change set (pilot example)

```json
{
  "name": "validate_change_set",
  "arguments": {
    "vertical": "default",
    "operations": [
      {
        "type": "pilot_actions",
        "payload": {
          "dryRun": true,
          "actions": [
            {
              "action": "create_page",
              "payload": {
                "path": "/dashboard/quotes",
                "name": "Quotes",
                "access": "admin",
                "group": "admin"
              }
            }
          ]
        }
      }
    ]
  }
}
```

Then `preview_diff` → `publish_change_set`.

Requires `DATABASE_URL` for pilot actions; Payload env vars for `content_page` / `content_article` publish.

---

## Pilot actions supported

Defined in `lib/pilot/actions.ts`:

| Action | Effect |
|--------|--------|
| `create_page` | Upsert `page_permissions` (route access) |
| `set_layers` | Replace `page_layers` for a page path |
| `set_platform_config` | Upsert `platform_config` key/value |

Use `apply_pilot_actions` with `"dryRun": true` (default) for quick validation without a change set.

---

## Vertical rules

Rules live in `config/vertical-rules/<vertical>.json`.

`validate_change_set` checks `feature_module` operations against these rules when `vertical` is set.

---

## Cursor / agent integration

### HTTP MCP (current)

```
https://<your-app>/api/mcp
```

Headers:

```
Authorization: Bearer <NEOSAAS_MCP_TOKEN>
Content-Type: application/json
```

### Suggested agent playbook

1. Always call `tools/list` first.
2. For pages/articles: `propose_content_*` → `validate_change_set` → `preview_diff` → `publish_change_set`.
3. Default to `dryRun: true` on `apply_pilot_actions`.
4. Log the `changeSetId` in agent traces for audit.

---

## Testing

```bash
pnpm test:mcp
pnpm test:content-hub-page
pnpm test:content-hub-article
```

HTTP integration (optional):

```bash
export NEOSAAS_MCP_TOKEN=neosaas-mcp-test-token
export MCP_BASE_URL=http://localhost:3000
pnpm test:mcp
```

Publish tests may **SKIP** when Payload or database is not configured.

---

## Deployment checklist

- [ ] Set `NEOSAAS_MCP_TOKEN` in production (Vercel env vars)
- [ ] Restrict token distribution to trusted agents only
- [ ] Ensure Payload env vars (`PAYLOAD_API_URL`, `PAYLOAD_SERVICE_API_KEY`, `PAYLOAD_TENANT_ID`) for Content Hub publish
- [ ] Ensure `DATABASE_URL` is configured before using legacy `pilot_actions` publish
- [ ] Run `pnpm test:mcp` in CI (recommended)

---

## Roadmap (not yet in MCP)

- Persist change sets in DB (currently in-memory per process)
- `feature_module` publish → write to `lib/dashboard/feature-registry.ts` or dynamic registry API
- Per-tenant MCP scopes and quotas
- Approval workflow (`draft` → `review` → `publish`)

---

## Related docs

- [PROJECT.md](./PROJECT.md) — full developer reference
- [ENVIRONMENT.md](./setup/ENVIRONMENT.md) — env vars including `NEOSAAS_MCP_TOKEN`
- `lib/pilot/actions.ts` — pilot action schemas
- `lib/dashboard/feature-registry.ts` — metadata-driven dashboard modules
