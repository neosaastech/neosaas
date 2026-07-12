/**
 * Content Hub article model tests — same flow as admin/content ArticleEditor.
 * Run: pnpm test:content-hub-article
 */
import { clearChangeSetStore } from "@/lib/mcp/changeset"
import { handleNeosaasMcpRequest } from "@/lib/mcp/neosaas-server"
import type { McpAuthContext } from "@/lib/mcp/auth"
import {
  lexicalParagraphBody,
  planContentArticleSave,
  proposeContentArticleFromIntent,
  validateContentHubArticleInput,
} from "@/lib/mcp/content-hub-article"

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

  await check("lexicalParagraphBody produces Lexical root", () => {
    const body = lexicalParagraphBody("Hello world") as { root?: { type?: string } }
    assert(body.root?.type === "root", "expected Lexical root node")
  })

  await check("proposeContentArticleFromIntent builds valid BlogPostWriteInput", () => {
    const plan = proposeContentArticleFromIntent({
      intent: "How to onboard new SaaS customers",
      slug: "mcp-article-test",
      status: "draft",
    })
    assert(plan.validation.valid, plan.validation.errors.join("; "))
    assert(plan.input.body !== undefined, "body required for proposal")
    assert(plan.input.slug === "mcp-article-test", "slug mismatch")
  })

  await check("planContentArticleSave mirrors ArticleEditor handleSave shape", () => {
    const plan = proposeContentArticleFromIntent({ intent: "Release notes", slug: "release-notes" })
    const savePlan = planContentArticleSave({ article: plan.input, locale: "en" })
    assert(savePlan.validation.valid, savePlan.validation.errors.join("; "))
  })

  await check("invalid article input is rejected", () => {
    const validation = validateContentHubArticleInput({
      title: "",
      slug: "",
      _status: "draft",
    })
    assert(!validation.valid, "should reject empty title/slug")
  })

  await check("MCP propose_content_article", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "propose_content_article",
        arguments: { intent: "Product update announcement", slug: "mcp-propose-article" },
      },
    })) as { content: Array<{ json: { validation: { valid: boolean }; input: { title: string } } }> }
    const plan = wrapped.content[0].json
    assert(plan.validation.valid, "proposal should be valid")
    assert(plan.input.title.length > 0, "title required")
  })

  let changeSetId = ""

  await check("MCP validate_change_set with content_article operation", async () => {
    const proposal = proposeContentArticleFromIntent({
      intent: "MCP content article change set test",
      slug: `mcp-article-cs-${Date.now()}`,
    })
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "validate_change_set",
        arguments: {
          operations: [
            {
              type: "content_article",
              payload: { locale: "en", article: proposal.input },
            },
          ],
        },
      },
    })) as { content: Array<{ json: { valid: boolean; changeSetId: string } }> }
    const data = wrapped.content[0].json
    assert(data.valid, "content_article change set should be valid")
    changeSetId = data.changeSetId
  })

  await check("MCP preview_diff for content_article", async () => {
    const wrapped = (await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "preview_diff", arguments: { changeSetId } },
    })) as {
      content: Array<{ json: { publishable: boolean; diff: Array<{ type: string }>; notes: string[] } }>
    }
    const preview = wrapped.content[0].json
    assert(preview.publishable, "preview should be publishable")
    assert(preview.diff.some((d) => d.type === "content_article"), "content_article diff expected")
  })

  try {
    await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "publish_change_set", arguments: { changeSetId } },
    })
    results.push({ name: "MCP publish_change_set article to Payload", status: "PASS" })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes("PAYLOAD") ||
      message.includes("Payload") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND")
    ) {
      results.push({
        name: "MCP publish_change_set article to Payload",
        status: "SKIP",
        detail: "Payload API not configured in this environment",
      })
    } else {
      results.push({
        name: "MCP publish_change_set article to Payload",
        status: "FAIL",
        detail: message,
      })
    }
  }

  console.log("CONTENT HUB ARTICLE TEST REPORT")
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
