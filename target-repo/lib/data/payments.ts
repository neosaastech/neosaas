import { db } from "@/db"
import { orders, companies, users } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

export async function getAllPayments() {
  const payments = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      companyName: companies.name,
      userName: users.username,
      userEmail: users.email,
      amount: orders.totalAmount,
      status: orders.paymentStatus,
      method: orders.paymentMethod,
      date: orders.paidAt,
      createdAt: orders.createdAt,
      // Assuming product type/name is stored in metadata or we need to join orderItems
      // For now, we'll just fetch the order details. 
      // If product type is needed, we should join orderItems.
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.paymentStatus, 'paid'))
    .orderBy(desc(orders.paidAt))

  return payments
}
