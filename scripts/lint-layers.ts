/**
 * Enforces the Pilier G naming convention on lib/layers/registry.ts:
 * - layerType (registry key) is kebab-case `{domaine}-{élément}`
 * - propsSchema never uses a forbidden synonym of an already-named concept
 * - ctaLabel / ctaHref are always declared together, never alone
 *
 * Run via `pnpm lint:layers`. Wired into CI on any PR touching lib/layers/ or
 * components/layers/ (see .github/workflows/lint-layers.yml).
 */
import { layerRegistry } from "../lib/layers/registry"
import { FORBIDDEN_PROP_SYNONYMS, REQUIRED_PROP_PAIRS } from "../lib/layers/prop-vocabulary"

const KEBAB_DOMAIN_ELEMENT = /^[a-z0-9]+(-[a-z0-9]+)+$|^[a-z0-9]+$/

let errors = 0

function fail(message: string) {
  console.error(`  ❌ ${message}`)
  errors++
}

console.log("🔍 lint:layers — vérification de lib/layers/registry.ts")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

const entries = Object.entries(layerRegistry)

if (entries.length === 0) {
  console.log("  ℹ️  Registre vide — rien à vérifier")
} else {
  for (const [layerType, layer] of entries) {
    if (!KEBAB_DOMAIN_ELEMENT.test(layerType)) {
      fail(`"${layerType}" : layerType doit être en kebab-case (ex: "pricing-table")`)
    }

    const propNames = Object.keys(layer.propsSchema.shape)

    for (const propName of propNames) {
      const canonical = FORBIDDEN_PROP_SYNONYMS[propName]
      if (canonical) {
        fail(`"${layerType}".${propName} : nom interdit, utiliser "${canonical}" à la place`)
      }
    }

    for (const [a, b] of REQUIRED_PROP_PAIRS) {
      const hasA = propNames.includes(a)
      const hasB = propNames.includes(b)
      if (hasA !== hasB) {
        fail(`"${layerType}" : "${hasA ? a : b}" déclaré sans son binôme requis "${hasA ? b : a}"`)
      }
    }
  }

  if (errors === 0) {
    console.log(`  ✓ ${entries.length} calque(s) conformes à la convention`)
  }
}

console.log("")
if (errors > 0) {
  console.error(`❌ lint:layers — ${errors} violation(s) de la norme de nommage`)
  process.exit(1)
}
console.log("✅ lint:layers OK")
