"use client"

import { useState } from "react"
import { Twitter, Facebook, Linkedin, Link as LinkIcon, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * "Share this article" intent links — NOT this site's own social profile
 * links (that's lib/social-links.ts, used by the header/footer). Same three
 * platforms as the site's configured presence (see lib/social-links.ts) for
 * visual consistency, but these URLs always point at Twitter/Facebook/
 * LinkedIn's own share-intent endpoints with THIS article's url+title, never
 * at the site's profile pages.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    { name: "Twitter", icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ]

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 flex items-center gap-2">
      {links.map(({ name, icon: Icon, href }) => (
        <Button key={name} variant="outline" size="icon" asChild>
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}>
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      ))}
      <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
