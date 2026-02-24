/**
 * Script de test du tunnel d'achat (Checkout Flow)
 * 
 * Ce script teste l'ensemble du processus de commande :
 * 1. Création d'un panier
 * 2. Ajout de produits
 * 3. Intégration Lago (customer, add-ons, invoice)
 * 4. Finalisation de la commande
 * 
 * Usage: 
 *   pnpm tsx scripts/test-checkout-flow.ts
 *   pnpm tsx scripts/test-checkout-flow.ts --mode=test  (pour mode test Lago)
 *   pnpm tsx scripts/test-checkout-flow.ts --skip-lago  (sans Lago)
 */

import { db } from "@/db"
import { users, products, carts, cartItems, orders, orderItems } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { getLagoClient } from "@/lib/lago"

// Configuration du test
const TEST_CONFIG = {
  testUserId: process.env.TEST_USER_ID || '',
  testProductIds: process.env.TEST_PRODUCT_IDS?.split(',') || [],
  skipLago: process.argv.includes('--skip-lago'),
  lagoMode: process.argv.includes('--mode=test') ? 'test' : 'production',
  cleanupAfterTest: !process.argv.includes('--no-cleanup')
}

interface TestResult {
  step: string
  status: 'success' | 'error' | 'warning' | 'skipped'
  message: string
  data?: any
  error?: any
  timestamp: Date
}

const testResults: TestResult[] = []

function logResult(result: Omit<TestResult, 'timestamp'>) {
  const fullResult: TestResult = {
    ...result,
    timestamp: new Date()
  }
  testResults.push(fullResult)
  
  const emoji = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    skipped: '⏭️'
  }[result.status]
  
  console.log(`\n${emoji} ${result.step}`)
  console.log(`   ${result.message}`)
  if (result.data) {
    console.log('   Data:', JSON.stringify(result.data, null, 2))
  }
  if (result.error) {
    console.error('   Error:', result.error)
  }
}

async function findOrCreateTestUser() {
  console.log('\n🔍 Étape 1: Recherche/Création utilisateur de test')
  
  try {
    // Chercher un utilisateur existant
    let testUser = await db.query.users.findFirst({
      where: eq(users.email, 'test-checkout@neosaas.com')
    })

    if (!testUser) {
      console.log('   Création d\'un nouvel utilisateur de test...')
      const [newUser] = await db.insert(users).values({
        email: 'test-checkout@neosaas.com',
        password: 'hashed_password_for_test', // Normalement hashé
        firstName: 'Test',
        lastName: 'Checkout',
        username: 'test_checkout_user',
        isActive: true
      }).returning()
      
      testUser = newUser
      logResult({
        step: 'Création utilisateur test',
        status: 'success',
        message: 'Nouvel utilisateur créé',
        data: { userId: testUser.id, email: testUser.email }
      })
    } else {
      logResult({
        step: 'Recherche utilisateur test',
        status: 'success',
        message: 'Utilisateur existant trouvé',
        data: { userId: testUser.id, email: testUser.email }
      })
    }

    TEST_CONFIG.testUserId = testUser.id
    return testUser
  } catch (error) {
    logResult({
      step: 'Recherche/Création utilisateur',
      status: 'error',
      message: 'Échec de la création/recherche utilisateur',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function getTestProducts() {
  console.log('\n🛍️ Étape 2: Récupération des produits de test')
  
  try {
    // Récupérer les premiers produits publiés
    const testProducts = await db.query.products.findMany({
      where: eq(products.isPublished, true),
      limit: 2
    })

    if (testProducts.length === 0) {
      logResult({
        step: 'Récupération produits',
        status: 'warning',
        message: 'Aucun produit publié trouvé - création de produits de test'
      })

      // Créer des produits de test
      const [product1, product2] = await db.insert(products).values([
        {
          title: 'Test Product 1 - Digital Module',
          description: 'Produit de test pour validation checkout',
          price: 9900, // 99.00 EUR
          type: 'digital',
          currency: 'EUR',
          isPublished: true
        },
        {
          title: 'Test Product 2 - Service',
          description: 'Service de test pour validation checkout',
          price: 19900, // 199.00 EUR
          type: 'service',
          currency: 'EUR',
          isPublished: true
        }
      ]).returning()

      return [product1, product2]
    }

    logResult({
      step: 'Récupération produits',
      status: 'success',
      message: `${testProducts.length} produit(s) trouvé(s)`,
      data: testProducts.map(p => ({ id: p.id, title: p.title, price: p.price }))
    })

    return testProducts
  } catch (error) {
    logResult({
      step: 'Récupération produits',
      status: 'error',
      message: 'Échec récupération produits',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function createTestCart(userId: string, testProducts: any[]) {
  console.log('\n🛒 Étape 3: Création du panier de test')
  
  try {
    // Nettoyer les anciens paniers actifs
    await db.update(carts)
      .set({ status: 'abandoned' })
      .where(and(
        eq(carts.userId, userId),
        eq(carts.status, 'active')
      ))

    // Créer un nouveau panier
    const [cart] = await db.insert(carts).values({
      userId,
      status: 'active'
    }).returning()

    logResult({
      step: 'Création panier',
      status: 'success',
      message: 'Panier créé',
      data: { cartId: cart.id }
    })

    // Ajouter les produits au panier
    for (const product of testProducts) {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: product.id,
        quantity: 1
      })
    }

    logResult({
      step: 'Ajout produits au panier',
      status: 'success',
      message: `${testProducts.length} produit(s) ajouté(s)`,
      data: testProducts.map(p => ({ id: p.id, title: p.title }))
    })

    // Récupérer le panier complet
    const fullCart = await db.query.carts.findFirst({
      where: eq(carts.id, cart.id),
      with: {
        items: {
          with: {
            product: true
          }
        }
      }
    })

    return fullCart
  } catch (error) {
    logResult({
      step: 'Création panier',
      status: 'error',
      message: 'Échec création panier',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function testLagoIntegration(userId: string, userEmail: string, cart: any) {
  console.log('\n💳 Étape 4: Test intégration Lago')
  
  if (TEST_CONFIG.skipLago) {
    logResult({
      step: 'Intégration Lago',
      status: 'skipped',
      message: 'Intégration Lago ignorée (--skip-lago)'
    })
    return null
  }

  try {
    const lago = await getLagoClient()
    
    logResult({
      step: 'Connexion Lago',
      status: 'success',
      message: `Client Lago initialisé (mode: ${TEST_CONFIG.lagoMode})`
    })

    // 1. Créer/Vérifier le customer
    console.log('   📝 Création/Vérification customer Lago...')
    let customer
    try {
      const existingCustomer = await lago.customers.getCustomer(userId)
      customer = existingCustomer.data.customer
      
      logResult({
        step: 'Vérification customer Lago',
        status: 'success',
        message: 'Customer existant trouvé',
        data: { lago_id: customer.lago_id, external_id: customer.external_id }
      })
    } catch (e: any) {
      if (e.response?.status === 404) {
        const newCustomer = await lago.customers.create({
          customer: {
            external_id: userId,
            name: 'Test Checkout User',
            email: userEmail,
            currency: 'EUR'
          }
        })
        customer = newCustomer.data.customer
        
        logResult({
          step: 'Création customer Lago',
          status: 'success',
          message: 'Nouveau customer créé',
          data: { lago_id: customer.lago_id, external_id: customer.external_id }
        })
      } else {
        throw e
      }
    }

    // 2. Créer les add-ons pour chaque produit
    console.log('   📦 Création add-ons Lago...')
    const addOnsCreated = []
    for (const item of cart.items) {
      try {
        await lago.addOns.create({
          add_on: {
            name: item.product.title,
            code: item.product.id,
            amount_cents: item.product.price,
            amount_currency: item.product.currency || 'EUR',
            description: item.product.description || undefined
          }
        })
        addOnsCreated.push(item.product.id)
      } catch (e: any) {
        // Add-on existe déjà, c'est OK
        if (e.response?.status === 422) {
          addOnsCreated.push(`${item.product.id} (existant)`)
        } else {
          throw e
        }
      }
    }

    logResult({
      step: 'Création add-ons Lago',
      status: 'success',
      message: `${addOnsCreated.length} add-on(s) créé(s)/vérifiés`,
      data: addOnsCreated
    })

    // 3. Créer l'invoice
    console.log('   🧾 Création invoice Lago...')
    const fees = cart.items.map((item: any) => ({
      add_on_code: item.product.id,
      units: item.quantity.toString()
    }))

    let invoice
    try {
      const invoiceResult = await lago.invoices.create({
        invoice: {
          customer: { external_id: userId },
          currency: 'EUR',
          fees: fees
        }
      })
      invoice = invoiceResult.data.lago_invoice

      logResult({
        step: 'Création invoice Lago',
        status: 'success',
        message: 'Invoice créée avec succès',
        data: {
          lago_id: invoice.lago_id,
          number: invoice.number,
          total_amount_cents: invoice.total_amount_cents,
          status: invoice.status
        }
      })

      return invoice
    } catch (e: any) {
      if (e.response?.data?.error === 'customer_has_no_valid_payment_method' || 
          e.message?.includes('payment method') ||
          e.response?.status === 422) {
        
        logResult({
          step: 'Création invoice Lago',
          status: 'warning',
          message: 'Méthode de paiement manquante - redirection vers portal nécessaire',
          data: { error: e.response?.data?.error || e.message }
        })

        // Générer l'URL du portal
        try {
          const portalResult = await lago.customers.getPortalUrl(userId)
          logResult({
            step: 'Génération portal URL',
            status: 'success',
            message: 'URL portal générée',
            data: { portal_url: portalResult.data.customer.portal_url }
          })
        } catch (portalError) {
          logResult({
            step: 'Génération portal URL',
            status: 'error',
            message: 'Échec génération portal URL',
            error: portalError instanceof Error ? portalError.message : String(portalError)
          })
        }

        return null // Retourner null pour indiquer que l'invoice n'a pas pu être créée
      }
      throw e
    }

  } catch (error) {
    logResult({
      step: 'Intégration Lago',
      status: 'error',
      message: 'Échec intégration Lago',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function createOrder(userId: string, cart: any, lagoInvoice: any | null) {
  console.log('\n📝 Étape 5: Création de la commande')
  
  try {
    const totalAmount = cart.items.reduce(
      (sum: number, item: any) => sum + (item.product.price * item.quantity), 
      0
    )
    const orderNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const [order] = await db.insert(orders).values({
      userId,
      orderNumber,
      totalAmount,
      status: 'completed',
      paymentStatus: lagoInvoice ? 'pending' : 'manual_verification',
      currency: 'EUR',
      metadata: lagoInvoice ? {
        lago_invoice_id: lagoInvoice.lago_id,
        lago_invoice_number: lagoInvoice.number,
        test_mode: true
      } : {
        note: 'Test order - Processed without Lago',
        test_mode: true
      }
    }).returning()

    logResult({
      step: 'Création commande',
      status: 'success',
      message: 'Commande créée',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: (order.totalAmount / 100).toFixed(2) + ' EUR',
        paymentStatus: order.paymentStatus
      }
    })

    // Créer les order items
    for (const item of cart.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        itemType: 'product',
        itemId: item.product.id,
        itemName: item.product.title,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity
      })
    }

    logResult({
      step: 'Création order items',
      status: 'success',
      message: `${cart.items.length} item(s) ajouté(s) à la commande`
    })

    // Marquer le panier comme converti
    await db.update(carts)
      .set({ status: 'converted' })
      .where(eq(carts.id, cart.id))

    logResult({
      step: 'Conversion panier',
      status: 'success',
      message: 'Panier marqué comme converti'
    })

    return order
  } catch (error) {
    logResult({
      step: 'Création commande',
      status: 'error',
      message: 'Échec création commande',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function cleanupTestData(userId: string) {
  if (!TEST_CONFIG.cleanupAfterTest) {
    logResult({
      step: 'Nettoyage',
      status: 'skipped',
      message: 'Nettoyage ignoré (--no-cleanup)'
    })
    return
  }

  console.log('\n🧹 Étape 6: Nettoyage des données de test')
  
  try {
    // Supprimer les commandes de test
    const deletedOrders = await db.delete(orders)
      .where(eq(orders.userId, userId))
      .returning({ id: orders.id })

    // Supprimer les paniers de test
    const deletedCarts = await db.delete(carts)
      .where(eq(carts.userId, userId))
      .returning({ id: carts.id })

    // Note: On ne supprime PAS l'utilisateur ni les produits pour réutilisation

    logResult({
      step: 'Nettoyage',
      status: 'success',
      message: 'Données de test nettoyées',
      data: {
        ordersDeleted: deletedOrders.length,
        cartsDeleted: deletedCarts.length
      }
    })
  } catch (error) {
    logResult({
      step: 'Nettoyage',
      status: 'warning',
      message: 'Échec partiel du nettoyage',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 RÉSUMÉ DU TEST DU TUNNEL D\'ACHAT')
  console.log('='.repeat(80))
  
  const successCount = testResults.filter(r => r.status === 'success').length
  const errorCount = testResults.filter(r => r.status === 'error').length
  const warningCount = testResults.filter(r => r.status === 'warning').length
  const skippedCount = testResults.filter(r => r.status === 'skipped').length

  console.log(`\n✅ Succès: ${successCount}`)
  console.log(`❌ Erreurs: ${errorCount}`)
  console.log(`⚠️  Warnings: ${warningCount}`)
  console.log(`⏭️  Ignorés: ${skippedCount}`)
  console.log(`\nTotal: ${testResults.length} étapes`)

  if (errorCount > 0) {
    console.log('\n❌ ÉCHECS:')
    testResults
      .filter(r => r.status === 'error')
      .forEach(r => {
        console.log(`   - ${r.step}: ${r.message}`)
        if (r.error) console.log(`     ${r.error}`)
      })
  }

  if (warningCount > 0) {
    console.log('\n⚠️  WARNINGS:')
    testResults
      .filter(r => r.status === 'warning')
      .forEach(r => {
        console.log(`   - ${r.step}: ${r.message}`)
      })
  }

  console.log('\n' + '='.repeat(80))
  console.log(errorCount === 0 ? '✅ TEST RÉUSSI' : '❌ TEST ÉCHOUÉ')
  console.log('='.repeat(80) + '\n')
}

async function main() {
  const errorCount = testResults.filter(r => r.status === 'error').length
  
  console.log('🚀 DÉMARRAGE DU TEST DU TUNNEL D\'ACHAT')
  console.log('='.repeat(80))
  console.log('Configuration:')
  console.log(`  - Mode Lago: ${TEST_CONFIG.skipLago ? 'DÉSACTIVÉ' : TEST_CONFIG.lagoMode}`)
  console.log(`  - Nettoyage: ${TEST_CONFIG.cleanupAfterTest ? 'OUI' : 'NON'}`)
  console.log('='.repeat(80))

  try {
    // 1. Trouver/Créer utilisateur de test
    const testUser = await findOrCreateTestUser()

    // 2. Récupérer produits de test
    const testProducts = await getTestProducts()

    // 3. Créer panier de test
    const testCart = await createTestCart(testUser.id, testProducts)

    if (!testCart) {
      throw new Error('Échec création panier')
    }

    // 4. Tester Lago (optionnel)
    let lagoInvoice = null
    if (!TEST_CONFIG.skipLago) {
      lagoInvoice = await testLagoIntegration(testUser.id, testUser.email, testCart)
    }

    // 5. Créer la commande
    const order = await createOrder(testUser.id, testCart, lagoInvoice)

    // 6. Nettoyage (optionnel)
    await cleanupTestData(testUser.id)

    // Afficher le résumé
    printSummary()

    const finalErrorCount = testResults.filter(r => r.status === 'error').length
    process.exit(finalErrorCount > 0 ? 1 : 0)

  } catch (error) {
    console.error('\n💥 ERREUR FATALE:', error)
    printSummary()
    process.exit(1)
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled Rejection:', error)
  printSummary()
  process.exit(1)
})

// Exécuter le test
main()
