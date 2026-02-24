"use server"

import { db } from "@/db"
import { coupons, couponUsage } from "@/db/schema"
import { eq, and, gte, lte, or, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * Get all coupons
 */
export async function getCoupons() {
  try {
    const allCoupons = await db.select().from(coupons).orderBy(coupons.createdAt)
    return { success: true, data: allCoupons }
  } catch (error) {
    console.error("Failed to get coupons:", error)
    return { success: false, error: "Failed to get coupons" }
  }
}

/**
 * Get a single coupon by ID
 */
export async function getCouponById(id: string) {
  try {
    const coupon = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1)
    return { success: true, data: coupon[0] || null }
  } catch (error) {
    console.error("Failed to get coupon:", error)
    return { success: false, error: "Failed to get coupon" }
  }
}

/**
 * Get a coupon by code (used for validation during checkout)
 */
export async function getCouponByCode(code: string) {
  try {
    const coupon = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1)
    
    return { success: true, data: coupon[0] || null }
  } catch (error) {
    console.error("Failed to get coupon:", error)
    return { success: false, error: "Failed to get coupon" }
  }
}

/**
 * Validate a coupon for use
 */
export async function validateCoupon(
  code: string, 
  userId: string | null, 
  cartTotal: number, // in cents
  productIds: string[]
) {
  try {
    const result = await getCouponByCode(code)
    if (!result.success || !result.data) {
      return { success: false, error: "Coupon not found" }
    }

    const coupon = result.data

    // Check if active
    if (!coupon.isActive) {
      return { success: false, error: "This coupon is no longer active" }
    }

    // Check date validity
    const now = new Date()
    if (coupon.startDate && new Date(coupon.startDate) > now) {
      return { success: false, error: "This coupon is not yet valid" }
    }
    if (coupon.endDate && new Date(coupon.endDate) < now) {
      return { success: false, error: "This coupon has expired" }
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, error: "This coupon has reached its usage limit" }
    }

    // Check per-user limit
    if (userId && coupon.perUserLimit) {
      const userUsageCount = await db
        .select()
        .from(couponUsage)
        .where(
          and(
            eq(couponUsage.couponId, coupon.id),
            eq(couponUsage.userId, userId)
          )
        )
      
      if (userUsageCount.length >= coupon.perUserLimit) {
        return { 
          success: false, 
          error: "You have already used this coupon the maximum number of times" 
        }
      }
    }

    // Check minimum purchase amount
    if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
      const minAmount = (coupon.minPurchaseAmount / 100).toFixed(2)
      return { 
        success: false, 
        error: `Minimum purchase of ${minAmount} € required for this coupon` 
      }
    }

    // Check applicable products
    if (coupon.applicableProducts) {
      const applicableIds = coupon.applicableProducts as string[]
      const hasApplicableProduct = productIds.some(id => applicableIds.includes(id))
      if (!hasApplicableProduct) {
        return { success: false, error: "This coupon is not valid for the products in your cart" }
      }
    }

    // Check excluded products
    if (coupon.excludedProducts) {
      const excludedIds = coupon.excludedProducts as string[]
      const hasExcludedProduct = productIds.some(id => excludedIds.includes(id))
      if (hasExcludedProduct) {
        return { success: false, error: "This coupon cannot be used with some products in your cart" }
      }
    }

    // Calculate discount
    let discountAmount = 0
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((cartTotal * coupon.discountValue) / 100)
      
      // Apply max discount if set
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount
      }
    } else if (coupon.discountType === 'fixed_amount') {
      discountAmount = coupon.discountValue
    }

    // Don't allow discount to exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal
    }

    return {
      success: true,
      data: {
        coupon,
        discountAmount,
        finalTotal: cartTotal - discountAmount
      }
    }
  } catch (error) {
    console.error("Failed to validate coupon:", error)
    return { success: false, error: "Failed to validate coupon" }
  }
}

/**
 * Create or update a coupon
 */
export async function upsertCoupon(couponData: {
  id?: string
  code: string
  description?: string | null
  discountType: string
  discountValue: number
  currency?: string
  minPurchaseAmount?: number | null
  maxDiscountAmount?: number | null
  usageLimit?: number | null
  perUserLimit?: number | null
  startDate?: Date | null
  endDate?: Date | null
  applicableProducts?: string[] | null
  excludedProducts?: string[] | null
  isActive?: boolean
  createdBy?: string | null
}) {
  try {
    // Normalize code to uppercase
    const normalizedCode = couponData.code.toUpperCase()

    // Check if code already exists (for other coupons)
    if (!couponData.id) {
      const existing = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, normalizedCode))
        .limit(1)
      
      if (existing.length > 0) {
        return { success: false, error: "A coupon with this code already exists" }
      }
    }

    const couponPayload: any = {
      code: normalizedCode,
      description: couponData.description || null,
      discountType: couponData.discountType,
      discountValue: couponData.discountValue,
      currency: couponData.currency || 'EUR',
      minPurchaseAmount: couponData.minPurchaseAmount || null,
      maxDiscountAmount: couponData.maxDiscountAmount || null,
      usageLimit: couponData.usageLimit || null,
      perUserLimit: couponData.perUserLimit || null,
      startDate: couponData.startDate || null,
      endDate: couponData.endDate || null,
      applicableProducts: couponData.applicableProducts || null,
      excludedProducts: couponData.excludedProducts || null,
      isActive: couponData.isActive !== undefined ? couponData.isActive : true,
      createdBy: couponData.createdBy || null,
      updatedAt: new Date()
    }

    let result
    if (couponData.id) {
      // Update existing coupon
      result = await db
        .update(coupons)
        .set(couponPayload)
        .where(eq(coupons.id, couponData.id))
        .returning()
    } else {
      // Create new coupon
      result = await db
        .insert(coupons)
        .values(couponPayload)
        .returning()
    }

    revalidatePath("/admin/coupons")

    return { success: true, data: result[0] }
  } catch (error) {
    console.error("Failed to upsert coupon:", error)
    return { success: false, error: "Failed to save coupon" }
  }
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(id: string) {
  try {
    // Fetch coupon data before deleting (for Lago sync)
    const couponData = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1)

    await db.delete(coupons).where(eq(coupons.id, id))
    revalidatePath("/admin/coupons")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete coupon:", error)
    return { success: false, error: "Failed to delete coupon" }
  }
}

/**
 * Record coupon usage
 */
export async function recordCouponUsage(data: {
  couponId: string
  userId: string | null
  orderId: string | null
  discountAmount: number
}) {
  try {
    // Create usage record
    await db.insert(couponUsage).values({
      couponId: data.couponId,
      userId: data.userId,
      orderId: data.orderId,
      discountAmount: data.discountAmount
    })

    // Increment usage count
    await db
      .update(coupons)
      .set({
        usageCount: sql`${coupons.usageCount} + 1`
      })
      .where(eq(coupons.id, data.couponId))

    return { success: true }
  } catch (error) {
    console.error("Failed to record coupon usage:", error)
    return { success: false, error: "Failed to record coupon usage" }
  }
}
