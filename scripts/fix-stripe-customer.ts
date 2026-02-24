/**
 * scripts/fix-stripe-customer.ts
 *
 * Supprime le mapping vers un ancien client Stripe (stripeCustomerId) pour
 * une ou plusieurs entreprises, puis efface les moyens de paiement locaux
 * associés à cet ancien client.
 *
 * Cas d'usage :
 *   - Un client Stripe supprimé dans un ancien compte revient toujours (ex: cus_Mg5oAI6FjhGfmi)
 *   - On veut lier l'entreprise à un nouveau client Stripe (recréé automatiquement au prochain sync)
 *
 * Usage :
 *   npx tsx scripts/fix-stripe-customer.ts
 *   npx tsx scripts/fix-stripe-customer.ts --customer-id cus_Mg5oAI6FjhGfmi
 *   npx tsx scripts/fix-stripe-customer.ts --company-name "neomnia studio"
 *   npx tsx scripts/fix-stripe-customer.ts --dry-run
 */

import { db } from '../db'
import { companies, paymentMethods } from '../db/schema'
import { eq, or, ilike } from 'drizzle-orm'

// ─── Configuration ───────────────────────────────────────────────────────────

/** Ancien customer ID à supprimer (argument CLI ou valeur par défaut) */
const OLD_CUSTOMER_ID = process.argv.find(a => a.startsWith('--customer-id='))?.split('=')[1]
  ?? (process.argv[process.argv.indexOf('--customer-id') + 1] !== undefined
    && !process.argv[process.argv.indexOf('--customer-id') + 1].startsWith('--')
    ? process.argv[process.argv.indexOf('--customer-id') + 1]
    : 'cus_Mg5oAI6FjhGfmi')

const COMPANY_NAME_FILTER = process.argv.find(a => a.startsWith('--company-name='))?.split('=')[1]
  ?? (process.argv[process.argv.indexOf('--company-name') + 1] !== undefined
    && !process.argv[process.argv.indexOf('--company-name') + 1].startsWith('--')
    ? process.argv[process.argv.indexOf('--company-name') + 1]
    : undefined)

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log(' Fix Stripe Customer Mapping')
  if (DRY_RUN) console.log(' ⚠  DRY-RUN — aucune modification ne sera appliquée')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`\nRecherche des entreprises avec stripeCustomerId = "${OLD_CUSTOMER_ID}"${
    COMPANY_NAME_FILTER ? ` ou nom ≈ "${COMPANY_NAME_FILTER}"` : ''
  }...\n`)

  // Recherche par customer ID, avec filtre optionnel sur le nom
  const allMatches = await db.query.companies.findMany({
    where: eq(companies.stripeCustomerId, OLD_CUSTOMER_ID),
    columns: { id: true, name: true, email: true, stripeCustomerId: true, stripeDefaultPaymentMethod: true },
  })

  // Filtre supplémentaire par nom si précisé
  const targets = COMPANY_NAME_FILTER
    ? allMatches.filter(c => c.name.toLowerCase().includes(COMPANY_NAME_FILTER!.toLowerCase()))
    : allMatches

  if (targets.length === 0) {
    console.log(`Aucune entreprise trouvée avec stripeCustomerId = "${OLD_CUSTOMER_ID}".`)

    // Recherche par nom pour aider au diagnostic
    if (COMPANY_NAME_FILTER) {
      const byName = await db.query.companies.findMany({
        where: ilike(companies.name, `%${COMPANY_NAME_FILTER}%`),
        columns: { id: true, name: true, email: true, stripeCustomerId: true },
      })
      if (byName.length > 0) {
        console.log(`\n  Entreprises trouvées par nom "${COMPANY_NAME_FILTER}" :`)
        byName.forEach(c => console.log(`    • ${c.name} | email: ${c.email} | stripeCustomerId: ${c.stripeCustomerId ?? '—'}`))
        console.log('\n  → Si le customer ID affiché correspond à l\'ancien compte, relancez sans --company-name.')
      }
    }
    return
  }

  console.log(`${targets.length} entreprise(s) affectée(s) :\n`)
  targets.forEach(c => {
    console.log(`  • ${c.name}`)
    console.log(`    email              : ${c.email}`)
    console.log(`    stripeCustomerId   : ${c.stripeCustomerId}`)
    console.log(`    defaultPaymentMethod: ${c.stripeDefaultPaymentMethod ?? '—'}`)
  })

  for (const company of targets) {
    console.log(`\n─── Traitement : ${company.name} ───`)

    // Compter les moyens de paiement liés à cet ancien client
    const cards = await db.query.paymentMethods.findMany({
      where: eq(paymentMethods.companyId, company.id),
      columns: { id: true, stripePaymentMethodId: true, cardBrand: true, cardLast4: true, isActive: true },
    })
    console.log(`  Moyens de paiement locaux : ${cards.length}`)
    cards.forEach(c => console.log(`    • ${c.stripePaymentMethodId} — ${c.cardBrand} ****${c.cardLast4} (actif: ${c.isActive})`))

    if (DRY_RUN) {
      console.log('  [DRY-RUN] Aurait effacé stripeCustomerId + defaultPaymentMethod + moyens de paiement.')
      continue
    }

    // 1. Supprimer les enregistrements locaux de moyens de paiement
    if (cards.length > 0) {
      await db
        .delete(paymentMethods)
        .where(eq(paymentMethods.companyId, company.id))
      console.log(`  ✔ ${cards.length} moyen(s) de paiement local(aux) supprimé(s).`)
    }

    // 2. Effacer le mapping Stripe sur l'entreprise
    await db
      .update(companies)
      .set({
        stripeCustomerId: null,
        stripeDefaultPaymentMethod: null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id))

    console.log('  ✔ stripeCustomerId et stripeDefaultPaymentMethod réinitialisés.')
    console.log(`  → Au prochain sync, un nouveau client Stripe sera créé avec l'email : ${company.email}`)
  }

  console.log('\n═══════════════════════════════════════════════════════')
  if (DRY_RUN) {
    console.log(' DRY-RUN terminé — relancez sans --dry-run pour appliquer.')
  } else {
    console.log(' Terminé.')
    console.log(' Prochaine étape : lancez une synchronisation Stripe depuis')
    console.log(' Admin > Stripe > Sync pour créer le(s) nouveau(x) client(s).')
  }
  console.log('═══════════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n[ERREUR]', err)
  process.exit(1)
}).finally(() => process.exit(0))
