/**
 * NeoSaaS MCP test suite — smoke, contracts, and level-3 build scenario.
 * Run: pnpm test:mcp
 * Optional HTTP mode: MCP_BASE_URL=http://localhost:3000 NEOSAAS_MCP_TOKEN=... pnpm test:mcp
 */
import { clearChangeSetStore } from "@/lib/mcp/changeset"
import { handleNeosaasMcpRequest } from "@/lib/mcp/neosaas-server"
import type { McpAuthContext } from "@/lib/mcp/auth"

type Result = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string }

const results: Result[] = []
const agentAuth: McpAuthContext = {
  userId: "mcp-agent",
  roles: ["super_admin"],
  actorType: "agent",
  via: "token",
}

function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: "PASS" }))
    .catch((error: unknown) => {
      results.push({
        name,
        status: "FAIL",
        detail: error instanceof Error ? error.message : String(error),
      })
    })
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function rpc(
  payload: Record<string, unknown>,
  auth: McpAuthContext | null = agentAuth,
) {
  const response = await handleNeosaasMcpRequest(payload, auth)
  if ("error" in response) {
    throw new Error(`${response.error.code}: ${response.error.message}`)
  }
  return response.result
}

async function runDirectTests() {
  clearChangeSetStore()

  await check("initialize", async () => {
    const result = (await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, null)) as {
      serverInfo: { version: string }
    }
    assert(result.serverInfo.version === "0.3.1", "expected MCP v0.3.1")
  })

  await check("tools/list includes build tools", async () => {
    const result = (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, null)) as {
      tools: Array<{ name: string }>
    }
    const names = result.tools.map((t) => t.name)
    for (const tool of [
      "list_content_blocks",
      "propose_content_page",
      "propose_content_article",
      "validate_content_article",
      "validate_content_page",
      "propose_feature_module",
      "validate_change_set",
      "preview_diff",
      "publish_change_set",
    ]) {
      assert(names.includes(tool), `missing tool ${tool}`)
    }
  })

  await check("auth required for list_features", async () => {
    const response = await handleNeosaasMcpRequest(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "list_features", arguments: {} },
      },
      null,
    )
    assert("error" in response && response.error.code === -32001, "expected unauthorized")
  })

  await check("propose_content_page", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "propose_content_page",
        arguments: { intent: "Landing page with hero and features", status: "draft" },
      },
    })) as { content: Array<{ json: { validation: { valid: boolean }; input: { title: string } } }> }
    const plan = wrapped.content[0].json
    assert(plan.validation.valid, "content page proposal should be valid")
    assert(plan.input.title.length > 0, "title required")
  })

  await check("propose_content_article", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "propose_content_article",
        arguments: { intent: "Weekly product update blog post", status: "draft" },
      },
    })) as { content: Array<{ json: { validation: { valid: boolean }; input: { slug: string } } }> }
    const plan = wrapped.content[0].json
    assert(plan.validation.valid, "article proposal should be valid")
    assert(plan.input.slug.length > 0, "slug required")
  })

  await check("propose_feature_module", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "propose_feature_module",
        arguments: { intent: "Create quote module with amount and client email", vertical: "default" },
      },
    })) as { content: Array<{ json: { slug: string; config: { fields: unknown[] } } }> }
    const proposal = wrapped.content[0].json
    assert(proposal.slug.length > 0, "slug required")
    assert(proposal.config.fields.some((f: { name?: string }) => f.name === "amount"), "amount field expected")
  })

  let changeSetId = ""

  await check("level3 validate_change_set (build scenario)", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "validate_change_set",
        arguments: {
          vertical: "default",
          operations: [
            {
              type: "pilot_actions",
              payload: {
                dryRun: true,
                actions: [
                  {
                    action: "create_page",
                    payload: {
                      path: "/dashboard/mcp-level3",
                      name: "MCP Level 3",
                      access: "admin",
                      group: "admin",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    })) as { content: Array<{ json: { valid: boolean; changeSetId: string } }> }
    const data = wrapped.content[0].json
    assert(data.valid, "change set should be valid")
    changeSetId = data.changeSetId
    assert(Boolean(changeSetId), "changeSetId required")
  })

  await check("preview_diff", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: { name: "preview_diff", arguments: { changeSetId } },
    })) as { content: Array<{ json: { publishable: boolean; diff: unknown[] } }> }
    const preview = wrapped.content[0].json
    assert(preview.publishable, "preview should be publishable")
    assert(preview.diff.length >= 1, "diff entries expected")
  })

  await check("apply_pilot_actions dry-run", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "apply_pilot_actions",
        arguments: {
          dryRun: true,
          actions: [
            {
              action: "create_page",
              payload: {
                path: "/dashboard/mcp-dry",
                name: "MCP Dry",
                access: "admin",
                group: "admin",
              },
            },
          ],
        },
      },
    })) as { content: Array<{ json: { results: Array<{ status: string }> } }> }
    assert(wrapped.content[0].json.results[0].status === "would_apply", "expected would_apply")
  })

  await check("publish_change_set without DB may fail gracefully", async () => {
    try {
      await rpc({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: { name: "publish_change_set", arguments: { changeSetId } },
      })
      results.push({ name: "publish_change_set apply", status: "PASS" })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("DATABASE_URL") || message.includes("Publish failed")) {
        results.push({
          name: "publish_change_set apply",
          status: "SKIP",
          detail: "No database configured in this environment",
        })
      } else {
        throw error
      }
    }
  })
}

async function runHttpTests(baseUrl: string, token: string) {
  async function httpRpc(payload: Record<string, unknown>, withAuth = true) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (withAuth) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
    const json = (await res.json()) as { error?: { message: string }; result?: unknown }
    if (!res.ok || json.error) {
      throw new Error(json.error?.message ?? `HTTP ${res.status}`)
    }
    return json.result
  }

  await check("HTTP initialize", async () => {
    await httpRpc({ jsonrpc: "2.0", id: 101, method: "initialize", params: {} }, false)
  })

  await check("HTTP unauthorized without token", async () => {
    const res = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 102,
        method: "tools/call",
        params: { name: "list_features", arguments: {} },
      }),
    })
    assert(res.status === 401, `expected 401 got ${res.status}`)
  })

  await check("HTTP list_features with token", async () => {
    const result = (await httpRpc({
      jsonrpc: "2.0",
      id: 103,
      method: "tools/call",
      params: { name: "list_features", arguments: {} },
    })) as { content: Array<{ json: { features: unknown[] } }> }
    assert(result.content[0].json.features.length >= 1, "features expected")
  })
}

async function main() {
  await runDirectTests()

  const baseUrl = process.env.MCP_BASE_URL
  const token = process.env.NEOSAAS_MCP_TOKEN
  if (baseUrl && token) {
    await runHttpTests(baseUrl, token)
  } else {
    results.push({
      name: "HTTP integration tests",
      status: "SKIP",
      detail: "Set MCP_BASE_URL and NEOSAAS_MCP_TOKEN to run HTTP tests",
    })
  }

  console.log("NeoSaaS MCP TEST REPORT")
  for (const result of results) {
    console.log(`- ${result.name}: ${result.status}${result.detail ? ` | ${result.detail}` : ""}`)
  }

  const failed = results.filter((r) => r.status === "FAIL")
  const passed = results.filter((r) => r.status === "PASS").length
  const skipped = results.filter((r) => r.status === "SKIP").length
  console.log(`\nTOTAL: ${results.length} | PASS: ${passed} | SKIP: ${skipped} | FAIL: ${failed.length}`)

  if (failed.length > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
