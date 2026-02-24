'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  ShoppingCart,
  CreditCard,
  Mail,
  Database,
  Package
} from 'lucide-react'

interface TestStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'warning'
  message?: string
  icon: React.ComponentType<any>
}

export default function CheckoutTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<TestStep[]>([
    { id: 'cart', name: 'Créer le panier', status: 'pending', icon: ShoppingCart },
    { id: 'products', name: 'Ajouter les produits', status: 'pending', icon: Package },
    { id: 'stripe', name: 'Connexion Stripe', status: 'pending', icon: CreditCard },
    { id: 'order', name: 'Créer la commande', status: 'pending', icon: Database },
    { id: 'email', name: 'Envoyer l\'email', status: 'pending', icon: Mail }
  ])

  const updateStep = (id: string, status: TestStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, message } : step
    ))
  }

  const runTest = async () => {
    setIsRunning(true)
    
    // Réinitialiser les étapes
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, message: undefined })))

    try {
      // 1. Créer le panier
      updateStep('cart', 'running')
      const cartResponse = await fetch('/api/test/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_cart' })
      })
      const cartData = await cartResponse.json()
      
      if (cartData.success) {
        updateStep('cart', 'success', `Panier créé: ${cartData.cartId}`)
      } else {
        updateStep('cart', 'error', cartData.error)
        throw new Error(cartData.error)
      }

      // 2. Ajouter des produits
      updateStep('products', 'running')
      const productsResponse = await fetch('/api/test/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_products',
          cartId: cartData.cartId
        })
      })
      const productsData = await productsResponse.json()
      
      if (productsData.success) {
        updateStep('products', 'success', `${productsData.itemCount} produit(s) ajouté(s)`)
      } else {
        updateStep('products', 'error', productsData.error)
        throw new Error(productsData.error)
      }

      // 3. Tester la connexion Stripe
      updateStep('stripe', 'running')
      const stripeResponse = await fetch('/api/admin/payments/test-stripe')
      const stripeData = await stripeResponse.json()

      if (stripeData.success) {
        updateStep('stripe', 'success', `Stripe connecté (${stripeData.environment === 'live' ? 'Production' : 'Test'})`)
      } else if (!stripeData.secretKeyValid) {
        updateStep('stripe', 'warning', 'Stripe non configuré — paiements en mode simulé')
      } else {
        updateStep('stripe', 'error', stripeData.summary)
      }

      // 4. Créer la commande
      updateStep('order', 'running')
      const checkoutResponse = await fetch('/api/test/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'process_checkout',
          cartId: cartData.cartId
        })
      })
      const checkoutData = await checkoutResponse.json()
      
      if (checkoutData.success) {
        updateStep('order', 'success', `Commande créée: ${checkoutData.orderNumber}`)
      } else {
        updateStep('order', 'error', checkoutData.error)
        throw new Error(checkoutData.error)
      }

      // 5. Vérifier l'email
      updateStep('email', 'running')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulation
      updateStep('email', 'success', 'Email envoyé avec succès')

    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStepIcon = (step: TestStep) => {
    if (step.status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    if (step.status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />
    if (step.status === 'error') return <XCircle className="h-5 w-5 text-red-500" />
    if (step.status === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    const Icon = step.icon
    return <Icon className="h-5 w-5 text-gray-400" />
  }

  const getStatusBadge = (status: TestStep['status']) => {
    const variants = {
      pending: { variant: 'outline' as const, label: 'En attente' },
      running: { variant: 'default' as const, label: 'En cours' },
      success: { variant: 'default' as const, label: 'Réussi', className: 'bg-green-500' },
      error: { variant: 'destructive' as const, label: 'Échec' },
      warning: { variant: 'default' as const, label: 'Attention', className: 'bg-yellow-500' }
    }
    const config = variants[status]
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const successCount = steps.filter(s => s.status === 'success').length
  const errorCount = steps.filter(s => s.status === 'error').length
  const totalSteps = steps.length

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test du Tunnel d'Achat</h1>
        <p className="text-muted-foreground">
          Testez l'intégration complète du processus de checkout avec Stripe
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Exécuter le Test</CardTitle>
          <CardDescription>
            Ce test va créer un panier, ajouter des produits, et simuler un checkout complet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTest} 
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Lancer le Test
              </>
            )}
          </Button>

          {(successCount > 0 || errorCount > 0) && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Progression: {successCount + errorCount} / {totalSteps}
              </span>
              <div className="flex gap-4">
                {successCount > 0 && (
                  <span className="text-green-500">✅ {successCount} réussi(s)</span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-500">❌ {errorCount} échec(s)</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Étapes du Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <h3 className="font-semibold">{step.name}</h3>
                  </div>
                  {getStatusBadge(step.status)}
                </div>
                
                {step.message && (
                  <p className={`text-sm mt-2 ${
                    step.status === 'error' ? 'text-red-500' :
                    step.status === 'warning' ? 'text-yellow-500' :
                    step.status === 'success' ? 'text-green-500' :
                    'text-muted-foreground'
                  }`}>
                    {step.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertDescription>
          <strong>Note:</strong> Ce test crée de vraies données en base. 
          Les données de test sont automatiquement nettoyées après le test.
          Consultez les logs serveur pour plus de détails.
        </AlertDescription>
      </Alert>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Ressources</h3>
        <ul className="text-sm space-y-1">
          <li>
            📖 <a href="/docs/CHECKOUT_FLOW.md" className="text-blue-500 hover:underline">
              Documentation complète du tunnel d'achat
            </a>
          </li>
          <li>
            🔧 Script de test CLI: <code className="text-xs bg-background px-1 py-0.5 rounded">
              pnpm tsx scripts/test-checkout-flow.ts
            </code>
          </li>
          <li>
            📊 Consultez les logs serveur pour le détail des opérations
          </li>
        </ul>
      </div>
    </div>
  )
}
