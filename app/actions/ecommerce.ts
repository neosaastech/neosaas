'use server'

import { db } from "@/db"
import { products, carts, cartItems, orders, orderItems, appointments, outlookIntegrations, users, subscriptions } from "@/db/schema"
import { eq, and, desc, asc, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"
import { emailRouter } from "@/lib/email"
import { cookies } from "next/headers"
import { syncProductToStripe } from "@/lib/stripe-products"

// --- Cart Migration ---

/**
 * Migrate a guest cart to a logged-in user
 * This should be called after login to transfer cart ownership
 */
export async function migrateGuestCart(): Promise<{ success: boolean; migrated: boolean; cartId?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: true, migrated: false }
    }

    const cookieStore = await cookies()
    const guestCartId = cookieStore.get("cart_id")?.value

    if (!guestCartId) {
      console.log('[migrateGuestCart] No guest cart cookie found')
      return { success: true, migrated: false }
    }

    // Find the guest cart (cart with this ID that has no userId)
    const guestCart = await db.query.carts.findFirst({
      where: and(
        eq(carts.id, guestCartId),
        isNull(carts.userId),
        eq(carts.status, "active")
      )
    })

    if (!guestCart) {
      console.log('[migrateGuestCart] Guest cart not found or already has userId', { guestCartId })
      return { success: true, migrated: false }
    }

    // Check if user already has an active cart
    const userCart = await db.query.carts.findFirst({
      where: and(
        eq(carts.userId, user.userId),
        eq(carts.status, "active")
      ),
      with: { items: true }
    })

    if (userCart && userCart.items.length > 0) {
      // User already has items in their cart - merge guest cart items
      console.log('[migrateGuestCart] Merging guest cart into existing user cart', {
        guestCartId,
        userCartId: userCart.id
      })

      const guestItems = await db.query.cartItems.findMany({
        where: eq(cartItems.cartId, guestCartId)
      })

      for (const item of guestItems) {
        // Check if item already in user cart
        const existingItem = userCart.items.find(i => i.productId === item.productId)
        if (existingItem) {
          // Update quantity
          await db.update(cartItems)
            .set({ quantity: existingItem.quantity + item.quantity })
            .where(eq(cartItems.id, existingItem.id))
        } else {
          // Move item to user cart
          await db.update(cartItems)
            .set({ cartId: userCart.id })
            .where(eq(cartItems.id, item.id))
        }
      }

      // Delete the empty guest cart
      await db.delete(carts).where(eq(carts.id, guestCartId))

      // Clear the cookie
      cookieStore.delete("cart_id")

      console.log('[migrateGuestCart] ✅ Guest cart merged into user cart')
      return { success: true, migrated: true, cartId: userCart.id }
    } else {
      // User has no active cart or empty cart - just assign the guest cart to user
      console.log('[migrateGuestCart] Assigning guest cart to user', {
        guestCartId,
        userId: user.userId
      })

      await db.update(carts)
        .set({ userId: user.userId })
        .where(eq(carts.id, guestCartId))

      // Clear the cookie (cart is now linked by userId)
      cookieStore.delete("cart_id")

      console.log('[migrateGuestCart] ✅ Guest cart assigned to user')
      return { success: true, migrated: true, cartId: guestCartId }
    }
  } catch (error) {
    console.error('[migrateGuestCart] Error:', error)
    return { success: false, migrated: false }
  }
}

// --- Products ---

export async function getProducts(filter: { isPublished?: boolean } = {}) {
  try {
    const conditions = []
    if (filter.isPublished !== undefined) {
      conditions.push(eq(products.isPublished, filter.isPublished))
    }

    const allProducts = await db.query.products.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(products.isFeatured), asc(products.price)],
    })
    return { success: true, data: allProducts }
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return { success: false, error: "Failed to fetch products" }
  }
}

export async function getProductById(id: string) {
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id)
    })

    if (!product) {
      return { success: false, error: "Product not found" }
    }

    // DEBUG: Log digital product data when loading
    if (product.type === 'digital') {
      console.log('[getProductById] 🔍 DEBUG Loaded digital product:', {
        id: product.id,
        title: product.title,
        digitalDeliveryType: product.digitalDeliveryType,
        fileUrl: product.fileUrl,
        licenseKey: product.licenseKey,
        licenseInstructions: product.licenseInstructions
      })
    }

    return { success: true, data: product }
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return { success: false, error: "Failed to fetch product" }
  }
}

export async function upsertProduct(data: any) {
  try {
    const user = await getCurrentUser()
    // TODO: Check for admin role properly
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // DEBUG: Log incoming data for digital products
    if (data.type === 'digital') {
      console.log('[upsertProduct] 🔍 DEBUG Digital product data received:', {
        id: data.id,
        type: data.type,
        digitalDeliveryType: data.digitalDeliveryType,
        fileUrl: data.fileUrl,
        licenseKey: data.licenseKey,
        licenseInstructions: data.licenseInstructions
      })
    }

    // Basic validation (can be improved with Zod)
    if (data.id) {
      // Update - seulement les champs fournis
      const updateData: any = {
        updatedAt: new Date(),
      }

      // Basic fields
      if (data.title !== undefined) updateData.title = data.title
      if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
      if (data.description !== undefined) updateData.description = data.description
      if (data.features !== undefined) updateData.features = data.features
      if (data.price !== undefined) updateData.price = data.price
      if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate
      if (data.type !== undefined) updateData.type = data.type
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.currency !== undefined) updateData.currency = data.currency
      if (data.isPublished !== undefined) updateData.isPublished = data.isPublished
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
      if (data.upsellProductId !== undefined) updateData.upsellProductId = data.upsellProductId
      if (data.vatRateId !== undefined) updateData.vatRateId = data.vatRateId
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl

      // v3.0 - Free option
      if (data.isFree !== undefined) updateData.isFree = data.isFree

      // v3.0 - Digital product fields
      if (data.digitalDeliveryType !== undefined) updateData.digitalDeliveryType = data.digitalDeliveryType
      if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl
      if (data.licenseKey !== undefined) updateData.licenseKey = data.licenseKey
      if (data.licenseInstructions !== undefined) updateData.licenseInstructions = data.licenseInstructions

      // v3.0 - Physical product fields
      if (data.requiresShipping !== undefined) updateData.requiresShipping = data.requiresShipping
      if (data.weight !== undefined) updateData.weight = data.weight
      if (data.dimensions !== undefined) updateData.dimensions = data.dimensions
      if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity
      if (data.shippingNotes !== undefined) updateData.shippingNotes = data.shippingNotes

      // v3.0 - Appointment product fields
      if (data.appointmentMode !== undefined) updateData.appointmentMode = data.appointmentMode
      if (data.appointmentDuration !== undefined) updateData.appointmentDuration = data.appointmentDuration
      if (data.outlookEventTypeId !== undefined) updateData.outlookEventTypeId = data.outlookEventTypeId

      // v5.0 - Payment type fields
      if (data.paymentType !== undefined) updateData.paymentType = data.paymentType
      if (data.subscriptionPriceWeekly !== undefined) updateData.subscriptionPriceWeekly = data.subscriptionPriceWeekly
      if (data.subscriptionPriceMonthly !== undefined) updateData.subscriptionPriceMonthly = data.subscriptionPriceMonthly
      if (data.subscriptionPriceYearly !== undefined) updateData.subscriptionPriceYearly = data.subscriptionPriceYearly

      // DEBUG: Log what we're updating for digital products
      if (data.type === 'digital') {
        console.log('[upsertProduct] 🔍 DEBUG Updating digital product with:', {
          id: data.id,
          digitalDeliveryType: updateData.digitalDeliveryType,
          fileUrl: updateData.fileUrl,
          licenseKey: updateData.licenseKey,
          allUpdateFields: Object.keys(updateData)
        })
      }

      await db.update(products)
        .set(updateData)
        .where(eq(products.id, data.id))

      revalidatePath("/store")
      revalidatePath("/admin/products")
      revalidatePath("/dashboard")

      // Auto-sync to Stripe (non-blocking — never fails the save)
      syncProductToStripe(data.id).catch((err) =>
        console.error('[upsertProduct] Stripe sync error (update):', err?.message)
      )

      return { success: true, data: { id: data.id } }
    } else {
      // Create - validation des champs requis
      if (!data.title) {
        return { success: false, error: "Missing required field: title" }
      }

      const result = await db.insert(products).values({
        // Basic fields
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        features: data.features,
        price: data.price || 0,
        hourlyRate: data.hourlyRate,
        type: data.type || 'physical',
        icon: data.icon,
        currency: data.currency || 'EUR',
        isPublished: data.isPublished || false,
        isFeatured: data.isFeatured || false,
        upsellProductId: data.upsellProductId,
        vatRateId: data.vatRateId,
        // v3.0 - Free option
        isFree: data.isFree || false,
        // v3.0 - Digital product fields
        digitalDeliveryType: data.digitalDeliveryType || 'license',
        fileUrl: data.fileUrl,
        licenseKey: data.licenseKey,
        licenseInstructions: data.licenseInstructions,
        // v3.0 - Physical product fields
        requiresShipping: data.requiresShipping || false,
        weight: data.weight,
        dimensions: data.dimensions,
        stockQuantity: data.stockQuantity,
        shippingNotes: data.shippingNotes,
        // v3.0 - Appointment product fields
        appointmentMode: data.appointmentMode,
        appointmentDuration: data.appointmentDuration,
        outlookEventTypeId: data.outlookEventTypeId,
        // v5.0 - Payment type fields
        paymentType: data.paymentType || 'one_time',
        subscriptionPriceWeekly: data.subscriptionPriceWeekly,
        subscriptionPriceMonthly: data.subscriptionPriceMonthly,
        subscriptionPriceYearly: data.subscriptionPriceYearly,
      }).returning({ id: products.id })

      const productId = result[0].id

      revalidatePath("/store")
      revalidatePath("/admin/products")
      revalidatePath("/dashboard")

      // Auto-sync to Stripe (non-blocking — never fails the save)
      syncProductToStripe(productId).catch((err) =>
        console.error('[upsertProduct] Stripe sync error (create):', err?.message)
      )

      return { success: true, data: { id: productId } }
    }
  } catch (error) {
    console.error("Failed to upsert product:", error)
    return { success: false, error: "Failed to save product" }
  }
}

export async function deleteProduct(id: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Unauthorized" }
    }

    // Archive on Stripe before deleting in DB (non-blocking)
    const product = await db.query.products.findFirst({ where: eq(products.id, id) })
    if (product?.stripeProductId) {
      const { archiveStripeProduct } = await import('@/lib/stripe-products')
      archiveStripeProduct(product.stripeProductId).catch((err) =>
        console.error('[deleteProduct] Stripe archive error:', err?.message)
      )
    }

    await db.delete(products).where(eq(products.id, id))
    
    revalidatePath("/store")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete product:", error)
    return { success: false, error: "Failed to delete product" }
  }
}

// --- Cart ---

export async function getCart() {
  console.log('[getCart] 🛒 Fetching cart...')

  try {
    const user = await getCurrentUser()
    console.log('[getCart] 👤 User check', {
      hasUser: !!user,
      userId: user?.userId,
      email: user?.email
    })

    let cart

    if (user) {
      // First, try to migrate any guest cart to this user
      console.log('[getCart] 🔄 Checking for guest cart migration...')
      const migrationResult = await migrateGuestCart()
      if (migrationResult.migrated) {
        console.log('[getCart] ✅ Guest cart migrated', { cartId: migrationResult.cartId })
      }

      console.log('[getCart] 🔍 Looking for user cart...', { userId: user.userId })
      cart = await db.query.carts.findFirst({
        where: and(
          eq(carts.userId, user.userId),
          eq(carts.status, "active")
        ),
        with: {
          items: {
            with: {
              product: {
                with: {
                  upsellProduct: true,
                  vatRate: true
                }
              }
            }
          }
        }
      })
      console.log('[getCart] 📦 User cart result', {
        found: !!cart,
        cartId: cart?.id,
        itemCount: cart?.items?.length || 0
      })
    } else {
      console.log('[getCart] 👻 Guest user - checking cookie')
      const cookieStore = await cookies()
      const cartId = cookieStore.get("cart_id")?.value
      console.log('[getCart] 🍪 Cookie cart_id', { cartId })

      if (cartId) {
        cart = await db.query.carts.findFirst({
          where: and(
            eq(carts.id, cartId),
            eq(carts.status, "active")
          ),
          with: {
            items: {
              with: {
                product: {
                  with: {
                    upsellProduct: true,
                    vatRate: true
                  }
                }
              }
            }
          }
        })
        console.log('[getCart] 📦 Cookie cart result', {
          found: !!cart,
          itemCount: cart?.items?.length || 0
        })
      }
    }

    // Filter out items with missing products (in case product was deleted)
    if (cart && cart.items) {
      const validItems = cart.items.filter((item: any) => item.product !== null && item.product !== undefined)
      const invalidItemsCount = cart.items.length - validItems.length

      if (invalidItemsCount > 0) {
        console.warn('[getCart] ⚠️ Filtered out items with missing products', {
          totalItems: cart.items.length,
          validItems: validItems.length,
          invalidItems: invalidItemsCount
        })

        // Clean up invalid cart items from database (orphaned items)
        const invalidItems = cart.items.filter((item: any) => !item.product)
        for (const item of invalidItems) {
          try {
            await db.delete(cartItems).where(eq(cartItems.id, item.id))
            console.log('[getCart] 🧹 Cleaned up orphaned cart item', { itemId: item.id })
          } catch (cleanupError) {
            console.error('[getCart] ❌ Failed to clean up orphaned cart item:', cleanupError)
          }
        }
      }

      // Return cart with only valid items
      cart = { ...cart, items: validItems }
    }

    return { success: true, data: cart }
  } catch (error) {
    console.error('[getCart] ❌ Failed to get cart:', error)
    return { success: false, error: "Failed to get cart" }
  }
}

export async function addToCart(productId: string, quantity: number = 1) {
  console.log('[addToCart] 🛒 Starting...', { productId, quantity })

  try {
    // 1. Verify product exists first
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId)
    })

    if (!product) {
      console.error('[addToCart] ❌ Product not found', { productId })
      return { success: false, error: "Product not found" }
    }
    console.log('[addToCart] ✅ Product found', { id: product.id, title: product.title })

    // 2. Get current user
    const user = await getCurrentUser()
    console.log('[addToCart] 👤 User check', {
      hasUser: !!user,
      userId: user?.userId,
      email: user?.email
    })

    let cart

    if (user) {
      // Get or create active cart for authenticated user
      console.log('[addToCart] 🔍 Looking for existing cart...', { userId: user.userId })
      cart = await db.query.carts.findFirst({
        where: and(
          eq(carts.userId, user.userId),
          eq(carts.status, "active")
        )
      })
      console.log('[addToCart] 📦 Existing cart search result', { found: !!cart, cartId: cart?.id })

      if (!cart) {
        console.log('[addToCart] 🆕 Creating new cart for user', { userId: user.userId })
        const [newCart] = await db.insert(carts).values({
          userId: user.userId,
          status: "active"
        }).returning()
        cart = newCart
        console.log('[addToCart] ✅ New cart created', { cartId: cart.id })
      }
    } else {
      // Guest user - use cookie-based cart
      console.log('[addToCart] 👻 Guest user - using cookie cart')
      const cookieStore = await cookies()
      const cartId = cookieStore.get("cart_id")?.value
      console.log('[addToCart] 🍪 Cookie cart_id', { cartId })

      if (cartId) {
        cart = await db.query.carts.findFirst({
          where: and(
            eq(carts.id, cartId),
            eq(carts.status, "active")
          )
        })
        console.log('[addToCart] 📦 Cookie cart found', { found: !!cart })
      }

      if (!cart) {
        console.log('[addToCart] 🆕 Creating new guest cart')
        const [newCart] = await db.insert(carts).values({
          status: "active"
        }).returning()
        cart = newCart

        cookieStore.set("cart_id", cart.id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
        })
        console.log('[addToCart] ✅ Guest cart created and cookie set', { cartId: cart.id })
      }
    }

    // 3. Check if item already exists in cart
    console.log('[addToCart] 🔍 Checking for existing item in cart', { cartId: cart.id, productId })
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, productId)
      )
    })

    if (existingItem) {
      console.log('[addToCart] 📝 Updating existing item quantity', {
        existingQty: existingItem.quantity,
        newQty: existingItem.quantity + quantity
      })
      await db.update(cartItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(cartItems.id, existingItem.id))
    } else {
      console.log('[addToCart] ➕ Adding new item to cart')
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId,
        quantity
      })
    }

    console.log('[addToCart] ✅ Item added to cart successfully', { cartId: cart.id, productId })

    revalidatePath("/cart")
    revalidatePath("/dashboard/cart")
    revalidatePath("/dashboard/checkout")

    return { success: true, cartId: cart.id }
  } catch (error) {
    console.error('[addToCart] ❌ Failed to add to cart:', error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to add to cart" }
  }
}

export async function removeFromCart(productId: string) {
  try {
    const user = await getCurrentUser()
    let cartId: string | null = null

    if (user) {
      const cart = await db.query.carts.findFirst({
        where: and(
          eq(carts.userId, user.userId),
          eq(carts.status, "active")
        )
      })
      cartId = cart?.id || null
    } else {
      const cookieStore = await cookies()
      cartId = cookieStore.get("cart_id")?.value || null
    }

    if (!cartId) {
      return { success: false, error: "Cart not found" }
    }

    // Supprimer l'item du panier
    await db.delete(cartItems)
      .where(and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId)
      ))

    revalidatePath("/cart")
    revalidatePath("/dashboard/cart")
    return { success: true }
  } catch (error) {
    console.error("Failed to remove from cart:", error)
    return { success: false, error: "Failed to remove from cart" }
  }
}

export async function updateCartItemQuantity(productId: string, quantity: number) {
  try {
    if (quantity < 1) {
      return await removeFromCart(productId)
    }

    const user = await getCurrentUser()
    let cartId: string | null = null

    if (user) {
      const cart = await db.query.carts.findFirst({
        where: and(
          eq(carts.userId, user.userId),
          eq(carts.status, "active")
        )
      })
      cartId = cart?.id || null
    } else {
      const cookieStore = await cookies()
      cartId = cookieStore.get("cart_id")?.value || null
    }

    if (!cartId) {
      return { success: false, error: "Cart not found" }
    }

    // Mettre à jour la quantité
    const item = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId)
      )
    })

    if (item) {
      await db.update(cartItems)
        .set({ quantity })
        .where(eq(cartItems.id, item.id))
    }

    revalidatePath("/cart")
    revalidatePath("/dashboard/cart")
    return { success: true }
  } catch (error) {
    console.error("Failed to update cart item:", error)
    return { success: false, error: "Failed to update cart item" }
  }
}

// --- Checkout ---
/**
 * Process checkout for a cart
 * @param cartId - ID of the cart to process
 * @param appointmentsData - Optional map of productId -> appointment data for appointment products
 */
export async function processCheckout(
  cartId: string,
  appointmentsData?: Record<string, {
    startTime: string
    endTime: string
    timezone: string
    attendeeEmail: string
    attendeeName: string
    attendeePhone?: string
    notes?: string
  }>,
  couponCode?: string
) {
  console.log('[processCheckout] 🛒 Starting checkout process', {
    cartId,
    hasAppointments: !!appointmentsData,
    appointmentCount: appointmentsData ? Object.keys(appointmentsData).length : 0,
    hasCoupon: !!couponCode
  })

  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error('[processCheckout] ❌ User not authenticated')
      return { success: false, error: "Not authenticated" }
    }

    console.log('[processCheckout] ✅ User authenticated', {
      userId: user.userId,
      email: user.email
    })

    // 0. Try to migrate guest cart if needed
    console.log('[processCheckout] 🔄 Checking for guest cart migration')
    const migrationResult = await migrateGuestCart()
    if (migrationResult.migrated) {
      console.log('[processCheckout] ✅ Guest cart migrated', { newCartId: migrationResult.cartId })
      // Use the migrated cart ID if different
      if (migrationResult.cartId && migrationResult.cartId !== cartId) {
        console.log('[processCheckout] 📦 Using migrated cart ID', {
          originalCartId: cartId,
          migratedCartId: migrationResult.cartId
        })
        cartId = migrationResult.cartId
      }
    }

    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      with: {
        company: true,
      },
    })

    if (!userRecord) {
      console.warn('[processCheckout] ⚠️ User record not found in DB, continuing with JWT payload')
    }

    // 1. Get Cart - first try by userId
    console.log('[processCheckout] 📦 Fetching cart data')
    let cart = await db.query.carts.findFirst({
      where: and(
        eq(carts.id, cartId),
        eq(carts.userId, user.userId),
        eq(carts.status, "active")
      ),
      with: {
        items: {
          with: {
            product: {
              with: {
                vatRate: true,
              }
            }
          }
        }
      }
    })

    // If not found, try to find by cartId only and assign userId
    if (!cart) {
      console.log('[processCheckout] ⚠️ Cart not found with userId, trying without userId filter', { cartId })
      const guestCart = await db.query.carts.findFirst({
        where: and(
          eq(carts.id, cartId),
          eq(carts.status, "active")
        ),
        with: {
          items: {
            with: {
              product: {
                with: {
                  vatRate: true,
                }
              }
            }
          }
        }
      })

      if (guestCart) {
        // Assign cart to user
        console.log('[processCheckout] 🔄 Assigning orphan cart to user', {
          cartId: guestCart.id,
          currentUserId: guestCart.userId,
          newUserId: user.userId
        })
        await db.update(carts)
          .set({ userId: user.userId })
          .where(eq(carts.id, cartId))

        cart = { ...guestCart, userId: user.userId }
      }
    }

    if (!cart) {
      console.error('[processCheckout] ❌ Cart not found', { cartId })
      return { success: false, error: "Cart not found" }
    }

    // Filter out items with missing products (defensive programming)
    const validItems = cart.items.filter((item: any) => item.product !== null && item.product !== undefined)
    if (validItems.length !== cart.items.length) {
      console.warn('[processCheckout] ⚠️ Filtered out items with missing products', {
        totalItems: cart.items.length,
        validItems: validItems.length
      })
      // Update cart reference with valid items only
      cart = { ...cart, items: validItems }
    }

    if (cart.items.length === 0) {
      console.error('[processCheckout] ❌ Cart is empty', { cartId })
      return { success: false, error: "Cart is empty" }
    }

    console.log('[processCheckout] ✅ Cart loaded', {
      cartId: cart.id,
      itemCount: cart.items.length,
      items: cart.items.map((i: any) => ({ id: i.product.id, title: i.product.title, price: i.product.price, qty: i.quantity }))
    })

    const vatRatesApplied = cart.items
      .map((item: any) => item.product?.vatRate)
      .filter(Boolean)
    const vatTaxCodes = Array.from(new Set(vatRatesApplied.map((rate: any) => rate.name).filter(Boolean)))
    const hasVatIntegration = vatRatesApplied.length > 0

    console.log('[processCheckout] 🧾 VAT integration check', {
      hasVatIntegration,
      vatRateCount: vatRatesApplied.length,
      vatTaxCodes
    })

    // DEBUG: Log full product data for digital products
    cart.items.forEach((item: any) => {
      if (item.product.type === 'digital') {
        console.log('[processCheckout] 🔍 CART DEBUG - Full digital product from DB:', {
          id: item.product.id,
          title: item.product.title,
          type: item.product.type,
          digitalDeliveryType: item.product.digitalDeliveryType,
          fileUrl: item.product.fileUrl,
          downloadUrl: item.product.downloadUrl,
          licenseKey: item.product.licenseKey ? '***SET***' : null,
          licenseInstructions: item.product.licenseInstructions ? '***SET***' : null,
          allFields: Object.keys(item.product)
        })
      }
    })

    // 1b. Validate and apply coupon if provided
    let couponDiscount = 0
    let appliedCoupon: any = null
    if (couponCode) {
      console.log('[processCheckout] 🎟️ Validating coupon:', couponCode)
      const { validateCoupon } = await import('@/app/actions/coupons')
      const productIds = cart.items.map((item: any) => item.product.id)
      const cartTotalForCoupon = cart.items.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0)

      const couponResult = await validateCoupon(couponCode, user.userId, cartTotalForCoupon, productIds)

      if (couponResult.success && couponResult.data) {
        couponDiscount = couponResult.data.discountAmount
        appliedCoupon = couponResult.data.coupon
        console.log('[processCheckout] ✅ Coupon applied:', {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: appliedCoupon.discountValue,
          discountAmount: couponDiscount,
          discountFormatted: (couponDiscount / 100).toFixed(2) + ' EUR'
        })
      } else {
        console.warn('[processCheckout] ⚠️ Coupon validation failed:', couponResult.error)
        return { success: false, error: couponResult.error || 'Invalid coupon code' }
      }
    }

    // 2. Create Order in DB — invoicing handled directly by Stripe
    console.log('[processCheckout] ℹ️ Payment processing handled by Stripe — creating order')
    console.log('[processCheckout] 📝 Creating order in database')
    const subtotalAmount = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    const totalAmount = Math.max(0, subtotalAmount - couponDiscount)
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    console.log('[processCheckout] 💰 Order details', {
      orderNumber,
      subtotalAmount,
      couponDiscount,
      totalAmount,
      totalFormatted: (totalAmount / 100).toFixed(2) + ' EUR',
      itemCount: cart.items.length,
      hasCoupon: !!appliedCoupon
    })

    const orderMetadata: Record<string, any> = {
      payment_provider: 'stripe',
    }

    if (appliedCoupon) {
      orderMetadata.coupon = {
        id: appliedCoupon.id,
        code: appliedCoupon.code,
        discountType: appliedCoupon.discountType,
        discountValue: appliedCoupon.discountValue,
        discountAmount: couponDiscount
      }
    }

    const [order] = await db.insert(orders).values({
      userId: user.userId,
      companyId: user.companyId,
      orderNumber,
      totalAmount,
      status: "completed",
      paymentStatus: "pending",
      metadata: orderMetadata
    }).returning()

    console.log('[processCheckout] ✅ Order created in database', { orderId: order.id, orderNumber: order.orderNumber })

    // 7. Create Order Items with License Keys for Digital Products
    console.log('[processCheckout] 📦 Creating order items')
    const { generateProductLicenseKey } = await import('@/lib/license-key-generator')
    
    for (const item of cart.items) {
      // Generate license key for digital products
      let itemMetadata: any = {}

      if (item.product.type === 'digital') {
        // DEBUG: Log all product fields for digital products
        console.log('[processCheckout] 🔍 DEBUG Digital product full data:', {
          productId: item.product.id,
          title: item.product.title,
          type: item.product.type,
          digitalDeliveryType: item.product.digitalDeliveryType,
          fileUrl: item.product.fileUrl,
          downloadUrl: item.product.downloadUrl,
          licenseKey: item.product.licenseKey,
          licenseInstructions: item.product.licenseInstructions,
          allProductFields: Object.keys(item.product)
        })

        // Get the delivery type - infer from existing data if not explicitly set
        const deliveryType = item.product.digitalDeliveryType || (
          // If both fileUrl and licenseKey/instructions exist, use 'both'
          (item.product.fileUrl && (item.product.licenseKey || item.product.licenseInstructions)) ? 'both' :
          // If only fileUrl exists, use 'url'
          item.product.fileUrl ? 'url' :
          // Otherwise default to 'license'
          'license'
        )
        const includesLicense = deliveryType === 'license' || deliveryType === 'both'
        const includesUrl = deliveryType === 'url' || deliveryType === 'both'

        console.log('[processCheckout] 📦 Digital delivery type resolved:', {
          explicitType: item.product.digitalDeliveryType,
          inferredType: deliveryType,
          includesLicense,
          includesUrl
        })

        // Only generate license key if delivery type includes license
        let generatedLicenseKey: string | null = null
        if (includesLicense) {
          generatedLicenseKey = generateProductLicenseKey(
            item.product.title,
            item.product.licenseKey
          )
          console.log('[processCheckout] 🔑 Generated license key for digital product', {
            productTitle: item.product.title,
            licenseKey: generatedLicenseKey
          })
        }

        // Build metadata based on delivery type
        itemMetadata = {
          productType: 'digital',
          digitalDeliveryType: deliveryType,
          // Only include download URL if delivery type includes URL
          downloadUrl: includesUrl ? (item.product.fileUrl || item.product.downloadUrl) : null,
          // Only include license key if delivery type includes license
          generatedLicenseKey: includesLicense ? generatedLicenseKey : null,
          licenseInstructions: includesLicense ? item.product.licenseInstructions : null
        }

        console.log('[processCheckout] 📦 Digital product metadata', {
          productTitle: item.product.title,
          deliveryType,
          hasUrl: !!itemMetadata.downloadUrl,
          hasLicenseKey: !!itemMetadata.generatedLicenseKey
        })
      } else if (item.product.type === 'physical') {
        itemMetadata = {
          productType: 'physical',
          requiresShipping: true
        }
      } else if (item.product.type === 'appointment') {
        itemMetadata = {
          productType: 'appointment'
        }
      }
      
      await db.insert(orderItems).values({
        orderId: order.id,
        itemType: item.product.type || "product", // Use actual product type (digital, physical, appointment, consulting)
        itemId: item.product.id,
        productId: item.product.id, // Also store as productId for consistency
        itemName: item.product.title,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        metadata: itemMetadata
      })
      console.log('[processCheckout] ✅ Order item created', {
        itemName: item.product.title,
        quantity: item.quantity,
        type: item.product.type,
        unitPrice: (item.product.price / 100).toFixed(2),
        totalPrice: ((item.product.price * item.quantity) / 100).toFixed(2)
      })
    }

    // 6b. Process Stripe Payment
    console.log('[processCheckout] 💳 Processing payment via Stripe')
    let paymentResult: {
      paymentIntentId?: string
      subscriptionId?: string
      clientSecret?: string
      status: string
    } = { status: 'skipped' }

    const isFreeOrder = totalAmount <= 0 || cart.items.every((i: any) => i.product.isFree)
    const hasSubscriptionItems = cart.items.some((i: any) => i.product.paymentType === 'subscription')
    const hasHourlyItems = cart.items.some((i: any) => i.product.paymentType === 'hourly')
    const isHourlyOnly = hasHourlyItems && !hasSubscriptionItems && cart.items.every((i: any) => i.product.paymentType === 'hourly' || i.product.isFree)

    if (isFreeOrder) {
      // Free order — no payment needed
      console.log('[processCheckout] 🆓 Free order — skipping payment')
      await db.update(orders)
        .set({ paymentStatus: 'paid', paymentMethod: 'free', paidAt: new Date() })
        .where(eq(orders.id, order.id))
      paymentResult = { status: 'paid' }

    } else if (isHourlyOnly) {
      // Hourly/consulting — billed later after service delivery
      console.log('[processCheckout] ⏱️ Hourly products — payment deferred')
      await db.update(orders)
        .set({ paymentMethod: 'stripe_deferred' })
        .where(eq(orders.id, order.id))
      paymentResult = { status: 'deferred' }

    } else if (hasSubscriptionItems) {
      // Subscription — create Stripe subscription with incomplete first invoice
      console.log('[processCheckout] 🔄 Creating Stripe subscription')
      const subItem = cart.items.find((i: any) => i.product.paymentType === 'subscription') as any
      const product = subItem?.product

      // Determine the right Stripe Price ID based on available prices
      const stripePriceId = product?.stripePriceMonthly || product?.stripePriceYearly || product?.stripePriceWeekly

      if (!stripePriceId) {
        console.error('[processCheckout] ❌ No Stripe Price ID found for subscription product:', product?.title)
        await db.update(orders)
          .set({ paymentStatus: 'failed' })
          .where(eq(orders.id, order.id))
        return { success: false, error: 'Subscription product is not configured for billing. Please contact support.' }
      }

      const { createStripeSubscription } = await import('@/app/actions/payments')
      const subResult = await createStripeSubscription({ stripePriceId })

      if (!subResult.success) {
        console.error('[processCheckout] ❌ Stripe subscription creation failed:', subResult.error)
        await db.update(orders)
          .set({ paymentStatus: 'failed' })
          .where(eq(orders.id, order.id))
        return { success: false, error: subResult.error || 'Subscription payment failed' }
      }

      await db.update(orders)
        .set({
          paymentMethod: 'stripe_subscription',
          paymentIntentId: subResult.subscriptionId || null,
          paymentStatus: subResult.clientSecret ? 'pending' : 'paid',
          ...(subResult.clientSecret ? {} : { paidAt: new Date() }),
          metadata: { ...orderMetadata, stripeSubscriptionId: subResult.subscriptionId }
        })
        .where(eq(orders.id, order.id))

      // Persist subscription to our DB table (companies.id → subscriptions.customerId)
      if (subResult.subscriptionId && user.companyId) {
        try {
          const subItem2 = cart.items.find((i: any) => i.product.paymentType === 'subscription') as any
          const subPriceId = subItem2?.product?.stripePriceMonthly
            || subItem2?.product?.stripePriceYearly
            || subItem2?.product?.stripePriceWeekly
            || ''
          await db.insert(subscriptions).values({
            stripeSubscriptionId: subResult.subscriptionId,
            customerId: user.companyId,
            stripePriceId: subPriceId,
            status: subResult.status || 'incomplete',
            currentPeriodEnd: subResult.currentPeriodEnd
              ? new Date(subResult.currentPeriodEnd * 1000)
              : null,
          }).onConflictDoNothing()
        } catch (dbErr) {
          console.warn('[processCheckout] ⚠️ Failed to save subscription to DB (non-fatal):', dbErr)
        }
      }

      paymentResult = {
        subscriptionId: subResult.subscriptionId,
        clientSecret: subResult.clientSecret,
        status: subResult.clientSecret ? 'requires_action' : 'active'
      }

      console.log('[processCheckout] ✅ Stripe subscription created', {
        subscriptionId: subResult.subscriptionId,
        requiresAction: !!subResult.clientSecret
      })

    } else {
      // One-time payment — charge immediately via company's default card
      console.log('[processCheckout] 💳 Processing one-time payment via Stripe', {
        amount: totalAmount,
        amountFormatted: (totalAmount / 100).toFixed(2) + ' EUR'
      })

      // Build invoice line items from cart
      const invoiceLineItems = cart.items.map((item: any) => ({
        description: item.product.title,
        amount: item.product.price * item.quantity, // total in cents
        currency: (item.product.currency || 'EUR').toLowerCase(),
        quantity: item.quantity,
      }))

      const { createStripeInvoicePayment } = await import('@/app/actions/payments')
      const payResult = await createStripeInvoicePayment({
        items: invoiceLineItems,
        orderId: order.id,
        orderNumber,
        description: `Commande ${orderNumber}`,
      })

      if (!payResult.success) {
        console.error('[processCheckout] ❌ Stripe invoice payment failed:', payResult.error)
        // If an invoice was created but payment failed, store it so it can be paid manually
        if (payResult.invoiceId) {
          await db.update(orders)
            .set({
              paymentStatus: 'pending',
              paymentMethod: 'stripe_invoice',
              paymentIntentId: payResult.invoiceId,
            })
            .where(eq(orders.id, order.id))
          // Return a partial success so the user can retry payment from the dashboard
          paymentResult = { status: 'pending', paymentIntentId: payResult.invoiceId }
          console.warn('[processCheckout] ⚠️ Invoice created but payment failed — requires manual payment:', payResult.invoiceId)
        } else {
          await db.update(orders)
            .set({ paymentStatus: 'failed' })
            .where(eq(orders.id, order.id))
          const errorCode = payResult.error?.includes('No payment method') || payResult.error?.includes('default') ? 'PAYMENT_METHOD_MISSING' : 'PAYMENT_FAILED'
          return {
            success: false,
            error: payResult.error || 'Payment processing failed',
            errorCode,
            orderId: order.id
          }
        }
      } else {
        const isPaid = payResult.status === 'paid'

        await db.update(orders)
          .set({
            paymentMethod: 'stripe_invoice',
            paymentIntentId: payResult.invoiceId || payResult.paymentIntentId || null,
            paymentStatus: isPaid ? 'paid' : 'pending',
            ...(isPaid ? { paidAt: new Date() } : {})
          })
          .where(eq(orders.id, order.id))

        paymentResult = {
          paymentIntentId: payResult.paymentIntentId,
          status: isPaid ? 'paid' : (payResult.status || 'pending')
        }

        console.log('[processCheckout] ✅ Stripe invoice payment processed', {
          invoiceId: payResult.invoiceId,
          status: payResult.status,
          isPaid
        })
      }
    }

    // 7a. Send Admin Notification for New Order
    console.log('[processCheckout] 📢 Sending admin notification for new order')
    try {
      const { 
        notifyAdminNewOrder, 
        notifyAdminPhysicalProductsToShip,
        notifyClientDigitalProductAccess,
        notifyAdminDigitalProductSale
      } = await import('@/lib/notifications')
      
      // Check if order has physical products requiring shipment
      const physicalProducts = cart.items
        .filter(item => item.product.type === 'physical' || item.product.requiresShipping)
        .map(item => ({
          title: item.product.title,
          quantity: item.quantity,
          requiresShipping: item.product.requiresShipping || false,
          shippingNotes: item.product.shippingNotes || undefined
        }))

      const hasPhysicalProducts = physicalProducts.length > 0
      
      // Check if order has digital products - with inferred delivery type
      const digitalProducts = cart.items
        .filter(item => item.product.type === 'digital')
        .map(item => {
          // Infer delivery type from existing data if not explicitly set
          const inferredDeliveryType = item.product.digitalDeliveryType || (
            (item.product.fileUrl && (item.product.licenseKey || item.product.licenseInstructions)) ? 'both' :
            item.product.fileUrl ? 'url' :
            'license'
          )
          console.log('[processCheckout] 🔍 Digital product for notification:', {
            title: item.product.title,
            explicitType: item.product.digitalDeliveryType,
            fileUrl: item.product.fileUrl,
            inferredType: inferredDeliveryType
          })
          return {
            title: item.product.title,
            quantity: item.quantity,
            deliveryType: inferredDeliveryType
          }
        })
      
      const hasDigitalProducts = digitalProducts.length > 0

      // Get user details for shipping and notifications
      const userDetails = await db.query.users.findFirst({
        where: eq(users.id, user.userId)
      })

      // Use email from database (always up-to-date) instead of JWT token
      const customerEmail = userDetails?.email || user.email
      const customerName = userDetails?.firstName && userDetails?.lastName
        ? `${userDetails.firstName} ${userDetails.lastName}`
        : customerEmail

      console.log('[processCheckout] 👤 Customer info for notifications:', {
        customerEmail,
        customerName,
        fromDB: !!userDetails?.email,
        fromJWT: user.email
      })

      // Send general order notification
      await notifyAdminNewOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.userId,
        userEmail: customerEmail,
        userName: customerName,
        totalAmount,
        currency: 'EUR',
        hasAppointment: appointmentsData ? Object.keys(appointmentsData).length > 0 : false,
        appointmentDetails: appointmentsData ? Object.values(appointmentsData)[0] : undefined
      })

      // If there are physical products, send additional shipment notification
      if (hasPhysicalProducts) {
        console.log('[processCheckout] 📦 Sending shipment notification for physical products')
        await notifyAdminPhysicalProductsToShip({
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: user.userId,
          userEmail: customerEmail,
          userName: customerName,
          physicalProducts,
          shippingAddress: userDetails ? {
            address: userDetails.address || undefined,
            city: userDetails.city || undefined,
            postalCode: userDetails.postalCode || undefined,
            country: userDetails.country || undefined
          } : undefined
        })
      }
      
      // If there are digital products, send access notifications
      if (hasDigitalProducts) {
        console.log('[processCheckout] 💻 Processing digital products')
        
        // Get order items with metadata to retrieve license keys
        const createdOrderItems = await db.query.orderItems.findMany({
          where: eq(orderItems.orderId, order.id)
        })
        
        // Build digital products list with access credentials
        const digitalProductsWithAccess = createdOrderItems
          .filter(item => item.metadata && (item.metadata as any).productType === 'digital')
          .map(item => {
            const metadata = item.metadata as any
            console.log('[processCheckout] 🔍 Order item metadata for client notification:', {
              itemName: item.itemName,
              metadata: {
                productType: metadata.productType,
                digitalDeliveryType: metadata.digitalDeliveryType,
                downloadUrl: metadata.downloadUrl,
                hasLicenseKey: !!metadata.generatedLicenseKey,
                hasInstructions: !!metadata.licenseInstructions
              }
            })
            return {
              title: item.itemName,
              downloadUrl: metadata.downloadUrl || null,
              licenseKey: metadata.generatedLicenseKey || null,
              licenseInstructions: metadata.licenseInstructions || null
            }
          })
        
        if (digitalProductsWithAccess.length > 0) {
          // Send client notification with download URLs and license keys
          console.log('[processCheckout] 📧 Sending digital product access to client')
          await notifyClientDigitalProductAccess({
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: user.userId,
            userEmail: customerEmail,
            userName: customerName,
            digitalProducts: digitalProductsWithAccess
          })

          // Send admin notification about digital product sale
          console.log('[processCheckout] 📧 Notifying admin about digital product sale')
          await notifyAdminDigitalProductSale({
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: user.userId,
            userEmail: customerEmail,
            userName: customerName,
            digitalProducts,
            totalAmount,
            currency: 'EUR'
          })
        }
      }

      console.log('[processCheckout] ✅ Admin notifications sent successfully')
    } catch (notifError) {
      console.warn('[processCheckout] ⚠️ Failed to send admin notification (non-critical):', notifError instanceof Error ? notifError.message : notifError)
      // Non-blocking - continuer le checkout même si la notification échoue
    }

    // 7b. Create Appointments for appointment-type products
    if (appointmentsData && Object.keys(appointmentsData).length > 0) {
      console.log('[processCheckout] 📅 Creating appointments for appointment products')
      
      // 🔒 VALIDATION SERVEUR : Valider les données des appointments AVANT création
      console.log('[processCheckout] 🔍 Validating appointment data server-side')
      for (const item of cart.items) {
        if (item.product.type === 'appointment') {
          const appointmentData = appointmentsData[item.product.id]
          
          // Vérifier que les données existent
          if (!appointmentData) {
            throw new Error(`Missing appointment data for product: ${item.product.title}`)
          }
          
          // Vérifier que les créneaux horaires sont présents
          if (!appointmentData.startTime || !appointmentData.endTime) {
            throw new Error(`Missing time slots for appointment: ${item.product.title}`)
          }
          
          // Convertir et valider les dates
          const start = new Date(appointmentData.startTime)
          const end = new Date(appointmentData.endTime)
          
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error(`Invalid appointment dates for: ${item.product.title}`)
          }
          
          if (start >= end) {
            throw new Error(`Start time must be before end time for: ${item.product.title}`)
          }
          
          if (start < new Date()) {
            throw new Error(`Appointment cannot be in the past for: ${item.product.title}`)
          }
          
          // Vérifier les données attendee
          if (!appointmentData.attendeeEmail || !appointmentData.attendeeName) {
            throw new Error(`Missing attendee information for: ${item.product.title}`)
          }
        }
      }
      console.log('[processCheckout] ✅ All appointment data validated')
      
      // Créer les appointments après validation
      for (const item of cart.items) {
        if (item.product.type === 'appointment' && appointmentsData[item.product.id]) {
          const appointmentData = appointmentsData[item.product.id]
          const price = item.product.price || item.product.hourlyRate || 0
          const isPaid = price > 0

          console.log('[processCheckout] 📅 Creating appointment for:', {
            productId: item.product.id,
            productTitle: item.product.title,
            startTime: appointmentData.startTime,
            endTime: appointmentData.endTime,
            isPaid,
            price: (price / 100).toFixed(2)
          })

          const [appointment] = await db.insert(appointments).values({
            userId: user.userId,
            productId: item.product.id,
            title: item.product.title,
            description: item.product.description || `Booking: ${item.product.title}`,
            startTime: new Date(appointmentData.startTime),
            endTime: new Date(appointmentData.endTime),
            timezone: appointmentData.timezone,
            attendeeEmail: appointmentData.attendeeEmail,
            attendeeName: appointmentData.attendeeName,
            attendeePhone: appointmentData.attendeePhone || null,
            notes: appointmentData.notes || null,
            status: 'pending',
            type: isPaid ? 'paid' : 'free',
            price: price,
            currency: item.product.currency || 'EUR',
            isPaid: !isPaid, // Si gratuit, considéré comme "payé"
            paymentStatus: isPaid ? 'pending' : 'paid',
            ...(paymentResult.paymentIntentId && isPaid ? { stripePaymentIntentId: paymentResult.paymentIntentId } : {}),
            metadata: {
              orderId: order.id,
              orderNumber,
            }
          }).returning()

          console.log('[processCheckout] ✅ Appointment created:', {
            appointmentId: appointment.id,
            status: appointment.status,
            paymentStatus: appointment.paymentStatus
          })

          // Sync statut paiement : si Stripe a déjà encaissé, marquer l'appointment comme payé et confirmé
          if (isPaid && paymentResult.status === 'paid') {
            await db.update(appointments)
              .set({
                isPaid: true,
                paymentStatus: 'paid',
                status: 'confirmed',
                paidAt: new Date(),
                ...(paymentResult.paymentIntentId ? { stripePaymentIntentId: paymentResult.paymentIntentId } : {}),
              })
              .where(eq(appointments.id, appointment.id))
            console.log('[processCheckout] ✅ Appointment marqué payé et confirmé:', appointment.id)
          }

          // Envoyer les notifications email pour le rendez-vous (non-bloquant)
          console.log('[processCheckout] 📧 Attempting to send appointment notifications (DEV mode - non-blocking)')
          try {
            const { sendAllAppointmentNotifications } = await import('@/lib/notifications/appointment-notifications')
            console.log('[processCheckout] 📧 Module loaded, sending appointment notifications')
            
            // Ensure dates are valid Date objects
            const startDate = appointmentData.startTime instanceof Date 
              ? appointmentData.startTime 
              : new Date(appointmentData.startTime)
            
            const endDate = appointmentData.endTime instanceof Date 
              ? appointmentData.endTime 
              : new Date(appointmentData.endTime)
            
            console.log('[processCheckout] 📅 Date objects created:', {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              isStartDateValid: !isNaN(startDate.getTime()),
              isEndDateValid: !isNaN(endDate.getTime())
            })
            
            const notifResults = await sendAllAppointmentNotifications({
              appointmentId: appointment.id,
              productTitle: item.product.title,
              startTime: startDate,
              endTime: endDate,
              timezone: appointmentData.timezone,
              attendeeName: appointmentData.attendeeName,
              attendeeEmail: appointmentData.attendeeEmail,
              attendeePhone: appointmentData.attendeePhone,
              price: price,
              currency: item.product.currency || 'EUR',
              notes: appointmentData.notes,
              userId: user.userId
            })

            console.log('[processCheckout] ✅ Appointment notifications sent:', {
              clientEmail: notifResults.clientEmail.success,
              adminEmail: notifResults.adminEmail.success,
              adminChat: notifResults.adminChat.success
            })
          } catch (emailError) {
            console.warn('[processCheckout] ⚠️ Failed to send appointment notifications (non-critical):', emailError instanceof Error ? emailError.message : emailError)
            // Non-blocking - continuer le checkout même si l'email échoue (OK en mode DEV)
          }
        }
      }
    }

    // 8. Send Confirmation Emails — routed by product type (non-blocking)
    console.log('[processCheckout] 📧 Sending order confirmation + payment receipt emails', { to: user.email })
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://neosaas.com'
      const firstName = user.name?.split(' ')[0] || 'Customer'
      const orderDate = new Date().toLocaleDateString('fr-FR')
      const orderUrl = `${appUrl}/orders/${order.id}`
      const currency = (cart.items[0] as any)?.product?.currency || 'EUR'
      const itemsSummary = cart.items.map((i: any) => ({
        name: i.product.title,
        quantity: i.quantity,
        price: (i.product.price / 100).toFixed(2),
      }))
      const totalFormatted = (totalAmount / 100).toFixed(2)

      // Detect dominant product type
      const hasSubscription = cart.items.some((i: any) => i.product.paymentType === 'subscription')
      const hasDigital = cart.items.some((i: any) => i.product.type === 'digital')
      const hasPhysical = cart.items.some((i: any) => i.product.type === 'physical')
      const hasAppointmentItems = cart.items.some((i: any) => i.product.type === 'appointment')

      if (hasSubscription) {
        const subItem = cart.items.find((i: any) => i.product.paymentType === 'subscription') as any
        const hasMonthly = subItem?.product?.subscriptionPriceMonthly
        const hasYearly = subItem?.product?.subscriptionPriceYearly
        const interval = hasMonthly ? 'monthly' : hasYearly ? 'yearly' : 'weekly'
        const intervalLabel = { monthly: 'Monthly', yearly: 'Yearly', weekly: 'Weekly' }[interval]
        const nextRenewal = new Date()
        if (interval === 'monthly') nextRenewal.setMonth(nextRenewal.getMonth() + 1)
        else if (interval === 'yearly') nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
        else nextRenewal.setDate(nextRenewal.getDate() + 7)

        await emailRouter.sendEmail({
          to: [user.email],
          template: 'order_confirmation_subscription',
          subject: `Subscription Activated — ${subItem?.product?.title} #${orderNumber}`,
          data: {
            firstName,
            orderNumber,
            orderDate,
            planName: subItem?.product?.title || 'Subscription Plan',
            billingInterval: intervalLabel,
            nextRenewalDate: nextRenewal.toLocaleDateString('fr-FR'),
            total: totalFormatted,
            currency,
            actionUrl: `${appUrl}/dashboard/subscriptions`,
          },
        })
      } else if (hasDigital && !hasPhysical) {
        // Retrieve generated license keys / download URLs from saved order items
        const savedItems = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, order.id) })
        const digitalItem = savedItems.find((si) => si.metadata && (si.metadata as any).productType === 'digital')
        const meta = (digitalItem?.metadata as any) || {}

        await emailRouter.sendEmail({
          to: [user.email],
          template: 'order_confirmation_digital',
          subject: `Your Purchase is Ready — #${orderNumber}`,
          data: {
            firstName,
            orderNumber,
            orderDate,
            total: totalFormatted,
            currency,
            licenseKey: meta.generatedLicenseKey || null,
            licenseInstructions: meta.licenseInstructions || null,
            downloadUrl: meta.downloadUrl || null,
            actionUrl: orderUrl,
          },
        })
      } else if (hasPhysical) {
        await emailRouter.sendEmail({
          to: [user.email],
          template: 'order_confirmation_physical',
          subject: `Order Confirmed — #${orderNumber}`,
          data: {
            firstName,
            orderNumber,
            orderDate,
            total: totalFormatted,
            currency,
            items: itemsSummary,
            actionUrl: orderUrl,
          },
        })
      } else if (hasAppointmentItems) {
        // Produit appointment — confirmation avec détails du rendez-vous
        const apptItem = cart.items.find((i: any) => i.product.type === 'appointment') as any
        const apptData = appointmentsData ? Object.values(appointmentsData)[0] : undefined
        const startTimeFormatted = apptData?.startTime
          ? new Date(apptData.startTime).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
          : 'À confirmer'
        await emailRouter.sendEmail({
          to: [user.email],
          template: 'order_confirmation',
          subject: `Rendez-vous confirmé — ${apptItem?.product?.title || 'Appointment'} #${orderNumber}`,
          data: {
            firstName,
            orderNumber,
            orderDate,
            items: [{
              name: `${apptItem?.product?.title || 'Appointment'} — ${startTimeFormatted}`,
              quantity: 1,
              price: totalFormatted,
            }],
            total: totalFormatted,
            currency,
            actionUrl: `${appUrl}/dashboard/appointments`,
          },
        })
      } else {
        // Fallback: generic template
        await emailRouter.sendEmail({
          to: [user.email],
          template: 'order_confirmation',
          subject: `Order Confirmation #${orderNumber}`,
          data: {
            firstName,
            orderNumber,
            orderDate,
            items: itemsSummary,
            total: totalFormatted,
            actionUrl: orderUrl,
          },
        })
      }

      // Payment receipt — always sent, all product types
      await emailRouter.sendEmail({
        to: [user.email],
        template: 'payment_confirmation',
        subject: `Payment Received — #${orderNumber}`,
        data: {
          firstName,
          orderNumber,
          orderDate,
          total: totalFormatted,
          currency,
          paymentMethod: 'Card',
          items: itemsSummary,
          actionUrl: orderUrl,
        },
      })

      console.log('[processCheckout] ✅ Confirmation + payment receipt emails sent')
    } catch (emailError) {
      console.warn('[processCheckout] ⚠️ Failed to send order emails (non-critical):', emailError instanceof Error ? emailError.message : emailError)
    }

    // 8b. Record coupon usage if a coupon was applied
    if (appliedCoupon && couponDiscount > 0) {
      console.log('[processCheckout] 🎟️ Recording coupon usage')
      try {
        const { recordCouponUsage } = await import('@/app/actions/coupons')
        await recordCouponUsage({
          couponId: appliedCoupon.id,
          userId: user.userId,
          orderId: order.id,
          discountAmount: couponDiscount
        })
        console.log('[processCheckout] ✅ Coupon usage recorded', {
          couponCode: appliedCoupon.code,
          discountAmount: couponDiscount
        })
      } catch (couponError) {
        console.warn('[processCheckout] ⚠️ Failed to record coupon usage (non-critical):', couponError)
      }

    }

    // 9. Mark Cart as Converted
    console.log('[processCheckout] 🔄 Converting cart')
    await db.update(carts)
      .set({ status: "converted" })
      .where(eq(carts.id, cart.id))

    console.log('[processCheckout] ✅ Cart converted successfully', { cartId: cart.id })

    revalidatePath("/cart")
    revalidatePath("/orders")
    
    console.log('[processCheckout] ✅ Cache revalidated')
    console.log('[processCheckout] 🎉🎉🎉 CHECKOUT COMPLETED SUCCESSFULLY 🎉🎉🎉', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: (totalAmount / 100).toFixed(2) + ' EUR',
      paymentStatus: paymentResult.status
    })
    
    return {
      success: true,
      orderId: order.id,
      payment: paymentResult,
      // If subscription requires 3D Secure confirmation, frontend needs clientSecret
      ...(paymentResult.clientSecret ? { clientSecret: paymentResult.clientSecret } : {})
    }

  } catch (error) {
    console.error('[processCheckout] 💥 Checkout failed with exception:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { success: false, error: error instanceof Error ? error.message : "Checkout failed" }
  }
}

// --- Clear Cart ---

/**
 * Clear the active cart for the current user
 * Used after successful checkout to ensure clean state
 */
export async function clearActiveCart() {
  console.log('[clearActiveCart] 🧹 Clearing active cart')
  
  try {
    const user = await getCurrentUser()
    
    if (user) {
      // For logged-in users, mark their active cart as converted
      console.log('[clearActiveCart] 👤 Clearing cart for logged-in user', { userId: user.userId })
      const cart = await db.query.carts.findFirst({
        where: and(
          eq(carts.userId, user.userId),
          eq(carts.status, "active")
        )
      })

      if (cart) {
        await db.update(carts)
          .set({ status: "converted" })
          .where(eq(carts.id, cart.id))
        console.log('[clearActiveCart] ✅ User cart marked as converted', { cartId: cart.id })
      }
    } else {
      // For guest users, clear the cookie cart
      console.log('[clearActiveCart] 👻 Clearing cart for guest user')
      const cookieStore = await cookies()
      const cartId = cookieStore.get("cart_id")?.value

      if (cartId) {
        const cart = await db.query.carts.findFirst({
          where: and(
            eq(carts.id, cartId),
            eq(carts.status, "active")
          )
        })

        if (cart) {
          await db.update(carts)
            .set({ status: "converted" })
            .where(eq(carts.id, cart.id))
          console.log('[clearActiveCart] ✅ Guest cart marked as converted', { cartId: cart.id })
        }

        // Clear the cookie
        cookieStore.delete("cart_id")
      }
    }

    revalidatePath("/cart")
    revalidatePath("/dashboard/cart")
    
    console.log('[clearActiveCart] ✅ Cart cleared successfully')
    return { success: true }
  } catch (error) {
    console.error('[clearActiveCart] ❌ Failed to clear cart:', error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to clear cart" }
  }
}

// --- Order Management ---

/**
 * Mark an order as shipped and notify the customer
 * Used by admins when they ship physical products
 */
export async function markOrderAsShipped(params: {
  orderId: string
  trackingNumber?: string
  carrier?: string
  estimatedDelivery?: string
  shippedProducts?: Array<{
    title: string
    quantity: number
  }>
}) {
  console.log('[markOrderAsShipped] 📦 Marking order as shipped', { orderId: params.orderId })
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // TODO: Check if user is admin
    
    // Get the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.orderId),
      with: {
        user: true,
        items: {
          with: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return { success: false, error: "Order not found" }
    }

    // Update order status to shipped
    await db.update(orders)
      .set({ 
        status: "shipped",
        metadata: {
          ...order.metadata as any,
          shippedAt: new Date().toISOString(),
          trackingNumber: params.trackingNumber,
          carrier: params.carrier,
          estimatedDelivery: params.estimatedDelivery
        }
      })
      .where(eq(orders.id, params.orderId))

    console.log('[markOrderAsShipped] ✅ Order marked as shipped in database')

    // Send notification to customer
    try {
      const { notifyClientProductShipped } = await import('@/lib/notifications')
      
      // Get shipped products from order items if not provided
      const shippedProducts = params.shippedProducts || order.items
        .filter(item => item.product?.type === 'physical' || item.product?.requiresShipping)
        .map(item => ({
          title: item.itemName,
          quantity: item.quantity
        }))

      if (order.user) {
        await notifyClientProductShipped({
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.user.id,
          userEmail: order.user.email,
          userName: `${order.user.firstName} ${order.user.lastName}`,
          shippedProducts,
          trackingNumber: params.trackingNumber,
          carrier: params.carrier,
          estimatedDelivery: params.estimatedDelivery
        })

        console.log('[markOrderAsShipped] ✅ Customer notification sent')
      }
    } catch (notifError) {
      console.warn('[markOrderAsShipped] ⚠️ Failed to send customer notification:', notifError)
      // Non-blocking
    }

    revalidatePath("/admin/orders")
    revalidatePath(`/orders/${params.orderId}`)
    
    return { success: true }
  } catch (error) {
    console.error('[markOrderAsShipped] ❌ Error:', error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark order as shipped" }
  }
}

// --- Outlook ---

export async function syncOutlookCalendar(authCode: string) {
  // TODO: Exchange code for tokens
  return { success: false, error: "Not implemented yet" }
}

// --- Product Leads (Appointments) ---

/**
 * Create a lead for appointment/consultation products
 * No payment is processed - this is for tracking interest only
 */
export async function createProductLead(data: {
  productId: string
  userEmail: string
  userName?: string
  userPhone?: string
  metadata?: any
}) {
  try {
    const user = await getCurrentUser()
    
    // Verify product exists and is of type 'appointment'
    const product = await db.query.products.findFirst({
      where: eq(products.id, data.productId)
    })
    
    if (!product) {
      return { success: false, error: "Product not found" }
    }
    
    if (product.type !== 'appointment') {
      return { success: false, error: "This product does not support lead creation" }
    }

    // Create the lead
    const { productLeads } = await import("@/db/schema")
    const result = await db.insert(productLeads).values({
      productId: data.productId,
      userId: user?.id || null,
      userEmail: data.userEmail,
      userName: data.userName,
      userPhone: data.userPhone,
      status: 'new',
      source: 'website',
      metadata: data.metadata,
    }).returning({ id: productLeads.id })

    // TODO: Send notification email to admin
    // TODO: Send confirmation email to user
    
    return { success: true, leadId: result[0].id }
  } catch (error) {
    console.error("Failed to create product lead:", error)
    return { success: false, error: "Failed to create lead" }
  }
}
