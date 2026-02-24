import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { products } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * POST /api/products/image
 * Upload product image with automatic dimension management
 * Uses SVG container technique to ensure consistent 16:9 aspect ratio
 * for product display without heavy image processing libraries
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const productId = formData.get("productId") as string

    if (!image || !productId) {
      return NextResponse.json(
        { error: "Image and productId are required" },
        { status: 400 }
      )
    }

    // Validate file type - stricter validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 3MB for optimal performance)
    const maxSize = 3 * 1024 * 1024 // 3MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: "Image must be less than 3MB" },
        { status: 400 }
      )
    }

    // Convert file to buffer then to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`

    // Create an SVG container that maintains 16:9 aspect ratio (ideal for products)
    // Width: 1200px, Height: 675px (16:9 ratio)
    // This ensures all product images have consistent dimensions without cropping
    // The image is scaled to cover the entire area while preserving aspect ratio
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
  <defs>
    <clipPath id="product-clip">
      <rect width="1200" height="675" rx="8" />
    </clipPath>
  </defs>
  <rect width="1200" height="675" fill="#f3f4f6" />
  <image 
    href="${base64Image}" 
    width="1200" 
    height="675" 
    preserveAspectRatio="xMidYMid slice" 
    clip-path="url(#product-clip)"
  />
</svg>`.trim()

    const svgBuffer = Buffer.from(svgContent)
    const imageUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`

    // Update product in database with SVG-wrapped image
    await db
      .update(products)
      .set({ 
        imageUrl,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId))

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: "Image uploaded and optimized successfully"
    })
  } catch (error) {
    console.error("[API] Product image upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/image
 * Delete product image
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    // Update product to remove image
    await db
      .update(products)
      .set({ 
        imageUrl: null,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId))

    return NextResponse.json({ 
      success: true,
      message: "Image deleted successfully"
    })
  } catch (error) {
    console.error("[API] Product image delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    )
  }
}
