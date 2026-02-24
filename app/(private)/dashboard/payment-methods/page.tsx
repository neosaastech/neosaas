import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PaymentMethodsManager } from '@/components/dashboard/payment-methods-manager'

export const metadata = {
  title: 'Payment Methods | NeoSaaS',
  description: 'Manage your company payment methods',
}

export default async function PaymentMethodsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.companyId) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-900">No Company Associated</h2>
          <p className="mt-2 text-sm text-yellow-700">
            You need to be associated with a company to manage payment methods.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Payment Methods</h1>
        <p className="mt-2 text-gray-600">
          Manage your company's payment methods for billing and subscriptions
        </p>
      </div>

      <PaymentMethodsManager />
    </div>
  )
}
