import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { syncCompanyPaymentMethods, syncAllCompanies, getSyncStatistics } from '@/lib/stripe-sync'

/**
 * POST /api/stripe/sync
 * Manually trigger a sync for the user's company or all companies (admin)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { syncAll } = body

    if (syncAll) {
      // TODO: Check if user has admin role
      // For now, allow any authenticated user

      console.log('[API Stripe Sync] Syncing all companies')
      const results = await syncAllCompanies()

      return NextResponse.json({
        success: true,
        data: results,
        message: `Synced ${results.length} companies`,
      })
    } else {
      // Sync only the user's company
      if (!user.companyId) {
        return NextResponse.json(
          { error: 'User is not associated with a company' },
          { status: 400 }
        )
      }

      console.log(`[API Stripe Sync] Syncing company ${user.companyId}`)
      const result = await syncCompanyPaymentMethods(user.companyId)

      return NextResponse.json({
        success: true,
        data: result,
        message: `Synced ${result.cardsAdded + result.cardsUpdated} payment methods`,
      })
    }
  } catch (error) {
    console.error('[API Stripe Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/sync
 * Get sync statistics
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await getSyncStatistics()

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('[API Stripe Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
