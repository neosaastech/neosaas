export type LogoDisplayMode = "logo" | "text" | "both" | "none"

export interface HeaderBrandingVisibility {
  showLogoInHeader: boolean
  showSiteNameInHeader: boolean
}

export function logoDisplayModeToVisibility(
  mode: LogoDisplayMode | string | undefined,
): HeaderBrandingVisibility {
  switch (mode) {
    case "logo":
      return { showLogoInHeader: true, showSiteNameInHeader: false }
    case "text":
      return { showLogoInHeader: false, showSiteNameInHeader: true }
    case "none":
      return { showLogoInHeader: false, showSiteNameInHeader: false }
    case "both":
    default:
      return { showLogoInHeader: true, showSiteNameInHeader: true }
  }
}

export function visibilityToLogoDisplayMode(
  showLogoInHeader: boolean,
  showSiteNameInHeader: boolean,
): LogoDisplayMode {
  if (showLogoInHeader && showSiteNameInHeader) return "both"
  if (showLogoInHeader) return "logo"
  if (showSiteNameInHeader) return "text"
  return "none"
}

export function shouldShowLogoInHeader(mode: LogoDisplayMode | string | undefined): boolean {
  return mode === "logo" || mode === "both"
}

export function shouldShowSiteNameInHeader(
  mode: LogoDisplayMode | string | undefined,
  options?: { collapsed?: boolean },
): boolean {
  if (options?.collapsed) return false
  return mode === "text" || mode === "both"
}
