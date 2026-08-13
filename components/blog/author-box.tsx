/** Real author card (name + avatar + bio) instead of a plain "By {name}" line — synced from Payload's Users.name/bio/avatar. */
export function AuthorBox({ name, bio, avatarUrl }: { name: string; bio?: string | null; avatarUrl?: string | null }) {
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
      </div>
    </div>
  )
}
