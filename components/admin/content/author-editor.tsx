"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Trash2, Plus } from "lucide-react"
import { MediaPickerField } from "./media-picker-field"
import { updateAuthorProfile, type AuthorProfile } from "@/app/actions/authors"
import type { AuthorSocialLinkInput } from "@/db/schema"

/**
 * Bio/avatar/social-links/visibility only — name/email are read-only here
 * (synced from Payload's Users, never editable on this side) and siteUserId
 * is display-only (auto-linked by email, see payload-cms's
 * syncUserAfterChange; a real re-link picker is a follow-up, not in scope
 * for this first version of the panel).
 */
export function AuthorEditor({ author, onSaved, onCancel }: { author: AuthorProfile; onSaved: () => void; onCancel: () => void }) {
  const [bio, setBio] = useState(author.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(author.avatarUrl ?? "")
  const [socialLinks, setSocialLinks] = useState<AuthorSocialLinkInput[]>(author.socialLinks ?? [])
  const [showBioPublicly, setShowBioPublicly] = useState(author.showBioPublicly)
  const [showEmailPublicly, setShowEmailPublicly] = useState(author.showEmailPublicly)
  const [showPhonePublicly, setShowPhonePublicly] = useState(author.showPhonePublicly)
  const [showSocialLinksPublicly, setShowSocialLinksPublicly] = useState(author.showSocialLinksPublicly)
  const [saving, setSaving] = useState(false)

  function updateLink(index: number, patch: Partial<AuthorSocialLinkInput>) {
    setSocialLinks((links) => links.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateAuthorProfile(author.id, {
      bio: bio || null,
      avatarUrl: avatarUrl || null,
      socialLinks: socialLinks.filter((l) => l.platform && l.url),
      showBioPublicly,
      showEmailPublicly,
      showPhonePublicly,
      showSocialLinksPublicly,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Author profile saved")
      onSaved()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">{author.name}</p>
        <p className="text-xs text-muted-foreground">{author.email}</p>
        <p className="text-xs text-muted-foreground">
          Linked site admin: {author.siteUserLabel ?? "none (Payload-only author, auto-linked by matching email)"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Avatar</Label>
        <MediaPickerField name="avatarUrl" kind="image" value={avatarUrl} onChange={setAvatarUrl} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bio</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Public</span>
            <Switch checked={showBioPublicly} onCheckedChange={setShowBioPublicly} />
          </div>
        </div>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
      </div>

      <div className="flex items-center justify-between">
        <Label>Show email publicly</Label>
        <Switch checked={showEmailPublicly} onCheckedChange={setShowEmailPublicly} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label>Show phone publicly</Label>
          {!author.siteUserId && (
            <p className="text-xs text-muted-foreground">No linked admin account — no phone to show.</p>
          )}
        </div>
        <Switch checked={showPhonePublicly} onCheckedChange={setShowPhonePublicly} disabled={!author.siteUserId} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Social links</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Public</span>
            <Switch checked={showSocialLinksPublicly} onCheckedChange={setShowSocialLinksPublicly} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="LinkedIn, Twitter..."
                value={link.platform}
                onChange={(e) => updateLink(index, { platform: e.target.value })}
                className="w-[140px]"
              />
              <Input
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
              />
              <Button variant="ghost" size="icon-sm" onClick={() => setSocialLinks((links) => links.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSocialLinks((links) => [...links, { platform: "", url: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}
