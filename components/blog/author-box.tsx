import { Mail, Phone, Link as LinkIcon } from "lucide-react"

export interface AuthorSocialLink {
  platform: string
  url: string
}

/**
 * Real author card (name + avatar + bio + optional email/phone/social)
 * instead of a plain "By {name}" line — synced from Payload's Users.name,
 * enriched from the site's own `authors` table (bio/avatarUrl/socialLinks)
 * and, when linked, the real site admin's own phone/email.
 *
 * Deliberately "dumb": every field here is rendered unconditionally once
 * passed — the caller (AuthorCardLayer) is the one deciding whether a field
 * is included at all, based on the author's own visibility toggles
 * (showBioPublicly/showEmailPublicly/showPhonePublicly/
 * showSocialLinksPublicly). No visibility logic lives in this component.
 */
export function AuthorBox({
  name,
  bio,
  avatarUrl,
  email,
  phone,
  socialLinks,
}: {
  name: string
  bio?: string | null
  avatarUrl?: string | null
  email?: string | null
  phone?: string | null
  socialLinks?: AuthorSocialLink[] | null
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="mt-3 flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {initials}
        </div>
      )}
      <div>
        <p className="text-sm font-medium">{name}</p>
        {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
        {(email || phone || (socialLinks && socialLinks.length > 0)) && (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1 hover:text-foreground">
                <Mail className="h-3 w-3" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-foreground">
                <Phone className="h-3 w-3" /> {phone}
              </a>
            )}
            {socialLinks?.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <LinkIcon className="h-3 w-3" /> {link.platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
