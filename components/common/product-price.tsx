"use client"

import { formatProductPrice, type Product } from "@/lib/product-utils"

interface ProductPriceProps {
  product: Pick<Product, 'type' | 'price' | 'hourlyRate' | 'currency'>
  className?: string
}

export function ProductPrice({ product, className = "" }: ProductPriceProps) {
  return (
    <span className={className}>
      {formatProductPrice(product)}
    </span>
  )
}
