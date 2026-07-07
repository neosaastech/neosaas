"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HeaderBrandingVisibilitySelectorsProps {
  showLogoInHeader: boolean
  showSiteNameInHeader: boolean
  onShowLogoInHeaderChange: (show: boolean) => void
  onShowSiteNameInHeaderChange: (show: boolean) => void
}

export function HeaderBrandingVisibilitySelectors({
  showLogoInHeader,
  showSiteNameInHeader,
  onShowLogoInHeaderChange,
  onShowSiteNameInHeaderChange,
}: HeaderBrandingVisibilitySelectorsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="showLogoInHeader">Logo in Header</Label>
        <Select
          value={showLogoInHeader ? "show" : "hide"}
          onValueChange={(value) => onShowLogoInHeaderChange(value === "show")}
        >
          <SelectTrigger id="showLogoInHeader">
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show">Show</SelectItem>
            <SelectItem value="hide">Hide</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Display the logo in the site header and sidebar</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="showSiteNameInHeader">Site Name in Header</Label>
        <Select
          value={showSiteNameInHeader ? "show" : "hide"}
          onValueChange={(value) => onShowSiteNameInHeaderChange(value === "show")}
        >
          <SelectTrigger id="showSiteNameInHeader">
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show">Show</SelectItem>
            <SelectItem value="hide">Hide</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Display the site name next to the logo in the header</p>
      </div>
    </div>
  )
}
