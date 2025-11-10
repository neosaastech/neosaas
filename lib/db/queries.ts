import { db, users, sessions, subscriptions, payments } from "./index"
import { eq, desc, gte } from "drizzle-orm"

// User queries
export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return user
}

export async function createUser(data: {
  email: string
  name?: string
  password?: string
  image?: string
}) {
  const [user] = await db.insert(users).values(data).returning()
  return user
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string
    email: string
    password: string
    image: string
    emailVerified: boolean
  }>,
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user
}

// Session queries
export async function createSession(data: {
  userId: string
  token: string
  expiresAt: Date
}) {
  const [session] = await db.insert(sessions).values(data).returning()
  return session
}

export async function getSessionByToken(token: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token))
  return session
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token))
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(gte(new Date(), sessions.expiresAt))
}

// Subscription queries
export async function getUserSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
  return subscription
}

export async function createSubscription(data: {
  userId: string
  plan: string
  status: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
}) {
  const [subscription] = await db.insert(subscriptions).values(data).returning()
  return subscription
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    plan: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  }>,
) {
  const [subscription] = await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.id, id))
    .returning()
  return subscription
}

// Payment queries
export async function createPayment(data: {
  userId: string
  subscriptionId?: string
  amount: string
  currency?: string
  status: string
  stripePaymentIntentId?: string
}) {
  const [payment] = await db.insert(payments).values(data).returning()
  return payment
}

export async function getUserPayments(userId: string) {
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt))
}
