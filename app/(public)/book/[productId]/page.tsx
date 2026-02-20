'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppointmentBooking } from '@/components/checkout/appointment-booking'
import { Loader2, AlertCircle, ArrowLeft, Calendar, Star, Shield } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  description: string | null
  price: number
  hourlyRate: number | null
  type: string
  currency: string
  isPublished: boolean
}

export default function BookAppointmentPage({
  params
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = use(params)
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${productId}`)
        const data = await res.json()

        if (data.success && data.data) {
          if (data.data.type !== 'appointment') {
            setError('Ce produit ne supporte pas la réservation de rendez-vous')
          } else if (!data.data.isPublished) {
            setError('Ce service n\'est pas disponible actuellement')
          } else {
            setProduct(data.data)
          }
        } else {
          setError('Service non trouvé')
        }
      } catch (err) {
        setError('Erreur lors du chargement du service')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleBook = async (data: {
    startTime: string
    endTime: string
    timezone: string
    attendeeEmail: string
    attendeeName: string
    attendeePhone?: string
    notes?: string
  }) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointmentData: {
          productId,
          ...data
        }
      })
    })

    const result = await res.json()

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la réservation')
    }

    // Success - the component handles the success state
    return result
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Service non disponible'}
          </h1>
          <p className="text-gray-600 mb-6">
            Impossible de charger ce service de réservation.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-brand hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la boutique
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Neomia Studio Header */}
      <header className="bg-gradient-to-r from-brand to-[#B8860B] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Neomia Studio</h1>
                <p className="text-white/80 text-sm">Réservation de rendez-vous</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Paiement sécurisé</span>
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="h-4 bg-gradient-to-r from-brand/50 to-[#B8860B]/50"></div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/store"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-brand transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la boutique
        </Link>

        {/* Service Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{product.title}</h2>
              {product.description && (
                <p className="text-gray-600 text-sm">{product.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="text-2xl font-bold text-brand">
                  {(product.hourlyRate || product.price) > 0
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format((product.hourlyRate || product.price) / 100)
                    : 'Free'
                  }
                </span>
                {(product.hourlyRate || product.price) > 0 && (
                  <span className="text-gray-500 text-sm">/ séance</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <Calendar className="w-5 h-5 text-brand mx-auto mb-1" />
            <p className="text-xs text-gray-600">Confirmation immédiate</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <Shield className="w-5 h-5 text-brand mx-auto mb-1" />
            <p className="text-xs text-gray-600">Annulation gratuite</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
            <Star className="w-5 h-5 text-brand mx-auto mb-1" />
            <p className="text-xs text-gray-600">Service premium</p>
          </div>
        </div>

        {/* Booking component */}
        <AppointmentBooking
          productId={product.id}
          productTitle={product.title}
          productPrice={product.hourlyRate || product.price}
          currency={product.currency}
          onBook={handleBook}
          onCancel={() => router.push('/store')}
        />

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Neomia Studio • Propulsé par NeoSaaS
          </p>
        </footer>
      </div>
    </div>
  )
}
