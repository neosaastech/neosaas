import { db } from "@/db"
import { companies, orders, users } from "@/db/schema"
import { desc, eq, sql } from "drizzle-orm"

export async function getAllInvoices() {
  const invoices = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      companyName: companies.name,
      companyEmail: companies.email,
      userName: users.username,
      userEmail: users.email,
      userId: orders.userId,
      amount: orders.totalAmount,
      status: orders.paymentStatus,
      date: orders.paidAt,
      createdAt: orders.createdAt,
      stripeInvoiceId: orders.stripeInvoiceId,
      paymentIntentId: orders.paymentIntentId,
      invoicePdf: orders.invoicePdf,
      hostedInvoiceUrl: orders.hostedInvoiceUrl,
      taxAmount: orders.taxAmount,
      // Récupère le paymentType du premier article de la commande (subscription | one_time | hourly)
      billingType: sql<string | null>`(
        SELECT p.payment_type
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ${orders.id}
        LIMIT 1
      )`.as('billing_type'),
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))

  return invoices
}
