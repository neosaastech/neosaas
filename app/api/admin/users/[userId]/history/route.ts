import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/db"
import { orders, users } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireAdmin()

    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Récupérer les informations de l'utilisateur
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Récupérer l'historique des commandes
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      orderBy: [desc(orders.createdAt)],
      limit: 50
    })

    // Récupérer l'historique des paiements
    const userPayments = await db.query.payments.findMany({
      where: eq(payments.userId, userId),
      orderBy: [desc(payments.createdAt)],
      limit: 50
    })

    // Combiner et formater l'historique avec détails enrichis
    const history = [
      ...userOrders.map(order => ({
        action: "Commande créée",
        description: `Commande ${order.orderNumber} - ${order.totalAmount ? (order.totalAmount / 100).toFixed(2) : '0.00'}€`,
        status: order.status,
        details: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          currency: order.currency || 'EUR',
          itemsCount: order.items?.length || 0,
          paymentMethod: order.paymentMethod,
          shippingAddress: order.shippingAddress,
          metadata: order.metadata
        },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        type: "order",
        severity: order.status === 'failed' ? 'error' : order.status === 'completed' ? 'success' : 'info'
      })),
      ...userPayments.map(payment => ({
        action: "Paiement",
        description: `${payment.amount ? (payment.amount / 100).toFixed(2) : '0.00'}€ via ${payment.provider || 'N/A'}`,
        status: payment.status,
        details: {
          transactionId: payment.transactionId,
          provider: payment.provider,
          amount: payment.amount,
          currency: payment.currency || 'EUR',
          paymentMethod: payment.paymentMethod,
          metadata: payment.metadata
        },
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        type: "payment",
        severity: payment.status === 'failed' ? 'error' : payment.status === 'succeeded' ? 'success' : 'warning'
      })),
      {
        action: "Compte créé",
        description: `Inscription sur la plateforme - ${user.email}`,
        status: user.emailVerified ? 'verified' : 'pending',
        details: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          registrationMethod: user.provider || 'email'
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        type: "account",
        severity: 'info'
      }
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      history
    })

  } catch (error) {
    console.error("Error fetching user history:", error)
    return NextResponse.json(
      { error: "Failed to fetch user history" },
      { status: 500 }
    )
  }
}
