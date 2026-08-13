"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TocHeading } from "@/lib/blog/toc"

export function TableOfContents({ headings, locale }: { headings: TocHeading[]; locale: string }) {
  const [open, setOpen] = useState(true)
  if (headings.length === 0) return null

  const minLevel = Math.min(...headings.map((h) => h.level))

  return (
    <nav className="my-6 rounded-lg border bg-muted/30 not-prose" aria-label={locale === "en" ? "Table of contents" : "Table des matières"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
        aria-expanded={open}
      >
        {locale === "en" ? "Table of contents" : "Table des matières"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="space-y-1 px-4 pb-4 text-sm">
          {headings.map((h) => (
            <li key={h.id} style={{ marginLeft: (h.level - minLevel) * 16 }}>
              <a href={`#${h.id}`} className="text-muted-foreground hover:text-primary hover:underline">
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  )
}
