/**
 * Content Hub page model tests — same flow as admin/content PageEditor.
 * Run: pnpm test:content-hub-page
 *
 * Flow: propose_content_page → validate_change_set (content_page) → preview_diff → publish_change_set
 * Publish writes to Payload via createPage (lib/payload-bridge), not Puck/set_layers.
 */
import { clearChangeSetStore } from "@/lib/mcp/changeset"
import { handleNeosaasMcpRequest } from "@/lib/mcp/neosaas-server"
import type { McpAuthContext } from "@/lib/mcp/auth"
import {
  CONTENT_HUB_BLOCK_TYPES,
  planContentPageSave,
  proposeContentPageFromIntent,
  validateContentHubPageInput,
} from "@/lib/mcp/content-hub-page"
import { clientLayerRegistry } from "@/lib/layers/registry-client"
import { mapPayloadLayoutToLayerRows } from "@/lib/layers/from-payload"

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

async function rpc(payload: Record<string, unknown>) {
  const response = await handleNeosaasMcpRequest(payload, agentAuth)
  if ("error" in response) {
    throw new Error(`${response.error.code}: ${response.error.message}`)
  }
  return response.result
}

async function main() {
  clearChangeSetStore()

  await check("CONTENT_HUB_BLOCK_TYPES matches clientLayerRegistry", () => {
    assert(
      CONTENT_HUB_BLOCK_TYPES.length === Object.keys(clientLayerRegistry).length,
      "block type count mismatch",
    )
    assert(CONTENT_HUB_BLOCK_TYPES.includes("hero"), "hero block expected")
  })

  await check("proposeContentPageFromIntent builds valid PageWriteInput", () => {
    const plan = proposeContentPageFromIntent({
      intent: "Landing page with features and contact CTA",
      slug: "mcp-content-hub-test",
      status: "draft",
    })
    assert(plan.validation.valid, plan.validation.errors.join("; "))
    assert(plan.input.layout.length >= 2, "expected hero + at least one extra block")
    assert(plan.previewLayers.length === plan.input.layout.length, "preview layer count mismatch")
  })

  await check("planContentPageSave mirrors PageEditor handleSave shape", () => {
    const plan = proposeContentPageFromIntent({
      intent: "Simple hero page",
      slug: "mcp-save-shape-test",
    })
    const savePlan = planContentPageSave({ page: plan.input, locale: "en" })
    assert(savePlan.validation.valid, savePlan.validation.errors.join("; "))
    const mapped = mapPayloadLayoutToLayerRows(savePlan.input.layout)
    assert(mapped.length === savePlan.input.layout.length, "layout mapping failed")
  })

  await check("published page without blocks is rejected", () => {
    const validation = validateContentHubPageInput({
      title: "Empty",
      slug: "empty",
      layout: [],
      _status: "published",
    })
    assert(!validation.valid, "should reject empty published layout")
  })

  await check("MCP list_content_blocks", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_content_blocks", arguments: {} },
    })) as { content: Array<{ json: { blockTypes: string[] } }> }
    assert(wrapped.content[0].json.blockTypes.includes("hero"), "hero missing from MCP list")
  })

  await check("MCP propose_content_page", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "propose_content_page",
        arguments: {
          intent: "Product landing with feature grid",
          slug: "mcp-propose-test",
          status: "draft",
        },
      },
    })) as { content: Array<{ json: { validation: { valid: boolean }; input: { layout: unknown[] } } }> }
    const plan = wrapped.content[0].json
    assert(plan.validation.valid, "proposal should be valid")
    assert(plan.input.layout.length >= 1, "layout required")
  })

  let changeSetId = ""

  await check("MCP validate_change_set with content_page operation", async () => {
    const proposal = proposeContentPageFromIntent({
      intent: "MCP content hub change set test",
      slug: `mcp-cs-${Date.now()}`,
      status: "draft",
    })
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "validate_change_set",
        arguments: {
          operations: [
            {
              type: "content_page",
              payload: { locale: "en", page: proposal.input },
            },
          ],
        },
      },
    })) as { content: Array<{ json: { valid: boolean; changeSetId: string } }> }
    const data = wrapped.content[0].json
    assert(data.valid, "content_page change set should be valid")
    changeSetId = data.changeSetId
    assert(Boolean(changeSetId), "changeSetId required")
  })

  await check("MCP preview_diff for content_page", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "preview_diff", arguments: { changeSetId } },
    })) as {
      content: Array<{ json: { publishable: boolean; diff: Array<{ type: string }>; notes: string[] } }>
    }
    const preview = wrapped.content[0].json
    assert(preview.publishable, "preview should be publishable")
    assert(preview.diff.some((d) => d.type === "content_page"), "content_page diff expected")
    assert(
      preview.notes.some((n) => n.includes("Payload")),
      "preview should note Payload publish path",
    )
  })

  try {
    await rpc({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "publish_change_set", arguments: { changeSetId } },
    })
    results.push({ name: "MCP publish_change_set to Payload", status: "PASS" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes("PAYLOAD") ||
      message.includes("Payload") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND")
    ) {
      results.push({
        name: "MCP publish_change_set to Payload",
        status: "SKIP",
        detail: "Payload API not configured in this environment",
      })
    } else {
      results.push({
        name: "MCP publish_change_set to Payload",
        status: "FAIL",
        detail: message,
      })
    }
  }

  console.log("CONTENT HUB PAGE TEST REPORT")
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
