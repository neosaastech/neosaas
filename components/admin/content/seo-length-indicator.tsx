"use client"

import { cn } from "@/lib/utils"

/**
 * Charles (2026-07-09), Cycle "Liens internes & parité SEO", ticket 3:
 * "dans le site on doit avoir les limites qui s'affichent de caractère
 * comme sur payload." Mirrors @payloadcms/plugin-seo's LengthIndicator
 * (same bounds, same 4-state logic: missing/too short/almost there/good/
 * too long) so PageEditor/ArticleEditor's meta title/description fields
 * give the same feedback Payload's own admin already does — title 50-60,
 * description 100-150 (plugin-seo's defaults.js).
 */
export function SeoLengthIndicator({ text, minLength, maxLength }: { text: string; minLength: number; maxLength: number }) {
  const length = text.length

  let label: string
  let colorClass: string
  let barWidth: number

  if (length === 0) {
    label = "Missing"
    colorClass = "bg-red-600"
    barWidth = 0
  } else {
    const progress = (length - minLength) / (maxLength - minLength)
    if (progress < 0) {
      const ratioUntilMin = length / minLength
      if (ratioUntilMin > 0.9) {
        label = "Almost there"
        colorClass = "bg-orange-500"
      } else {
        label = "Too short"
        colorClass = "bg-orange-600"
      }
      barWidth = ratioUntilMin
    } else if (progress <= 1) {
      label = "Good"
      colorClass = "bg-green-600"
      barWidth = progress
    } else {
      label = "Too long"
      colorClass = "bg-red-600"
      barWidth = 1
    }
  }

  const charsUntilMin = minLength - length
  const charsUntilMax = maxLength - length
  const countText =
    length === 0 || charsUntilMin > 0
      ? `${length} / ${minLength}-${maxLength} characters — ${Math.max(charsUntilMin, 0)} to go`
      : charsUntilMax >= 0
        ? `${length} / ${minLength}-${maxLength} characters — ${charsUntilMax} left over`
        : `${length} / ${minLength}-${maxLength} characters — ${-charsUntilMax} too many`

  return (
    <div className="flex items-center gap-2">
      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white", colorClass)}>{label}</span>
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{countText}</span>
      <div className="relative h-0.5 w-full bg-muted">
        <div className={cn("absolute left-0 top-0 h-full", colorClass)} style={{ width: `${barWidth * 100}%` }} />
      </div>
    </div>
  )
}
