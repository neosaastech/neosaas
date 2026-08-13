/**
 * Grid-item variant for a directory of authors (author-list block) —
 * AuthorBox was designed for a compact inline byline under an article, not
 * a card in a grid, hence a distinct component rather than reusing/
 * stretching AuthorBox. Same "dumb, no visibility logic" rule: the caller
 * (AuthorListLayer, via resolveAuthorProfile) decides what's included.
 */
export function AuthorGridCard({
  name,
  bio,
  avatarUrl,
  email,
  socialLinks,
}: {
  name: string
  bio?: string | null
  avatarUrl?: string | null
  email?: string | null
  socialLinks?: { platform: string; url: string }[] | null
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
          {initials}
        </div>
      )}
      <div>
        <p className="font-medium">{name}</p>
        {bio && <p className="mt-1 text-sm text-muted-foreground">{bio}</p>}
      </div>
      {(email || (socialLinks && socialLinks.length > 0)) && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          {email && (
            <a href={`mailto:${email}`} className="hover:text-foreground">
              {email}
            </a>
          )}
          {socialLinks?.map((link) => (
            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              {link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
