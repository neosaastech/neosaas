/**
 * Theme Settings Component
 * Theme configuration interface in admin panel
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Palette, RefreshCw, Sun, Moon, Type, Cloud } from 'lucide-react'
import type { ThemeConfig, ColorPalette } from '@/types/theme-config'
import { defaultTheme } from '@/types/theme-config'
import { updateThemeConfig, resetThemeConfig, getThemeConfig } from '@/app/actions/theme-config'
import { Icon, ICON_LIBRARIES, ICON_LIBRARY_LABELS, type IconLibrary } from '@/components/ui/icon'
import { FONT_PAIRS, getFontPair } from '@/lib/theme/font-pairs'
import { FontSourcePicker } from '@/components/admin/font-source-picker'
import { resolveFontFamily } from '@/lib/theme/font-source'
import { applyThemePreview } from '@/lib/theme/apply-theme-variables'
import { DICEBEAR_STYLES, DEFAULT_DICEBEAR_STYLE, getAvatarUrl } from '@/lib/theme/avatar'

const ICON_PREVIEW_NAMES = ['home', 'user', 'settings', 'check', 'close']

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
}

function ColorInput({ label, value, onChange, description }: ColorInputProps) {
  // Convert HSL to hex for the color picker
  const hslToHex = (hsl: string): string => {
    try {
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v))
      const hue = h
      const sat = s / 100
      const light = l / 100

      const c = (1 - Math.abs(2 * light - 1)) * sat
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
      const m = light - c / 2

      let r = 0, g = 0, b = 0
      if (hue < 60) { r = c; g = x; b = 0 }
      else if (hue < 120) { r = x; g = c; b = 0 }
      else if (hue < 180) { r = 0; g = c; b = x }
      else if (hue < 240) { r = 0; g = x; b = c }
      else if (hue < 300) { r = x; g = 0; b = c }
      else { r = c; g = 0; b = x }

      const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    } catch {
      return '#000000'
    }
  }

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-20 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="0 0% 0%"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function ThemeSettings() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const hasHydrated = useRef(false)

  const loadTheme = useCallback(async () => {
    setLoading(true)
    try {
      const config = await getThemeConfig()
      setTheme(config)
    } catch (error) {
      toast.error('Error loading theme')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load the configuration
  useEffect(() => {
    loadTheme()
  }, [loadTheme])

  const saveTheme = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const result = await updateThemeConfig(theme)
      if (result.success) {
        setSaveStatus('saved')
        router.refresh()
      } else {
        setSaveStatus('error')
        toast.error(result.error || 'Error saving theme')
      }
    } catch (error) {
      setSaveStatus('error')
      toast.error('Error saving theme')
    }
  }, [theme, router])

  const triggerAutoSave = useCallback(() => {
    if (!hasHydrated.current) return

    setSaveStatus('unsaved')

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      saveTheme()
    }, 1500)
  }, [saveTheme])

  // Live preview + auto-save when theme changes
  useEffect(() => {
    if (loading) return

    applyThemePreview(theme, resolvedTheme)

    if (!hasHydrated.current) {
      hasHydrated.current = true
      return
    }

    triggerAutoSave()
  }, [theme, resolvedTheme, loading, triggerAutoSave])

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to the default theme?')) {
      return
    }

    setSaveStatus('saving')
    try {
      const result = await resetThemeConfig()
      if (result.success) {
        toast.success('Theme reset successfully')
        setSaveStatus('saved')
        hasHydrated.current = false
        await loadTheme()
        router.refresh()
      } else {
        setSaveStatus('error')
        toast.error(result.error || 'Error resetting theme')
      }
    } catch (error) {
      setSaveStatus('error')
      toast.error('Error resetting theme')
    }
  }

  const updateColor = (mode: 'light' | 'dark', key: keyof ColorPalette, value: string) => {
    setTheme(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: value,
      },
    }))
  }

  const updateIconLibrary = (library: IconLibrary) => {
    setTheme(prev => ({ ...prev, iconLibrary: library }))
  }

  const updateFontPair = (fontPairId: string) => {
    const pair = getFontPair(fontPairId)
    setTheme(prev => ({
      ...prev,
      fontPairId,
      // Presets use the next/font pipeline (Pilier D v1), not the Google Fonts /
      // upload / link sources below — clear those so the pickers show "System"
      // rather than a stale source that no longer matches the applied font.
      headingFontSource: undefined,
      bodyFontSource: undefined,
      typography: {
        ...prev.typography,
        fontFamily: pair.fontFamily,
        fontFamilyHeading: pair.fontFamilyHeading,
      },
    }))
  }

  const SaveStatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {saveStatus === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <Cloud className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {saveStatus === 'unsaved' && (
        <>
          <Cloud className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600">Unsaved changes</span>
        </>
      )}
      {saveStatus === 'error' && (
        <>
          <Cloud className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Save failed</span>
        </>
      )}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Theme Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your site's colors and styles (auto-saved)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SaveStatusIndicator />
          <Button variant="outline" onClick={handleReset} disabled={saveStatus === 'saving'}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Display Mode
          </CardTitle>
          <CardDescription>
            Whether visitors can switch light/dark mode themselves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium">Allow visitors to switch mode</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When off, the light/dark toggle is hidden site-wide and everyone stays on the configured default mode.
                </p>
              </div>
              <Switch
                checked={theme.allowModeToggle ?? true}
                onCheckedChange={(checked) => setTheme(prev => ({ ...prev, allowModeToggle: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Icons & Avatars (Pilier D) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Icons & Avatars
          </CardTitle>
          <CardDescription>
            Icon set for UI glyphs, avatar style for generated user/company avatars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Icon Library</Label>
            <Select
              value={theme.iconLibrary ?? 'lucide'}
              onValueChange={(value: IconLibrary) => updateIconLibrary(value)}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_LIBRARIES.map((library) => (
                  <SelectItem key={library} value={library}>
                    {ICON_LIBRARY_LABELS[library]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              {ICON_PREVIEW_NAMES.map((name) => (
                <Icon
                  key={name}
                  name={name}
                  library={theme.iconLibrary ?? 'lucide'}
                  className="h-6 w-6 text-foreground"
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Avatar Style (DiceBear)</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Generated per-user avatar fallback (identicon-style), not semantic UI icons.
            </p>
            <Select
              value={theme.avatarStyle ?? DEFAULT_DICEBEAR_STYLE}
              onValueChange={(style) => setTheme((prev) => ({ ...prev, avatarStyle: style }))}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DICEBEAR_STYLES.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              {['Alex', 'Sam', 'Jordan', 'Taylor'].map((seed) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={seed}
                  src={getAvatarUrl(seed, theme.avatarStyle ?? DEFAULT_DICEBEAR_STYLE)}
                  alt={seed}
                  className="h-10 w-10 rounded-full bg-background"
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Typography (Pilier D) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>
            Heading and body fonts — Google Fonts, your own font file, or a direct link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {FONT_PAIRS.map((pair) => (
                <Button
                  key={pair.id}
                  type="button"
                  variant={theme.fontPairId === pair.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFontPair(pair.id)}
                >
                  {pair.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
            <FontSourcePicker
              label="Heading font"
              role="heading"
              value={theme.headingFontSource}
              activeFontFamily={theme.typography.fontFamilyHeading}
              onChange={(source) =>
                setTheme((prev) => ({
                  ...prev,
                  fontPairId: 'custom',
                  headingFontSource: source,
                  typography: { ...prev.typography, fontFamilyHeading: resolveFontFamily(source, 'heading') },
                }))
              }
            />
            <FontSourcePicker
              label="Body font"
              role="body"
              value={theme.bodyFontSource}
              activeFontFamily={theme.typography.fontFamily}
              onChange={(source) =>
                setTheme((prev) => ({
                  ...prev,
                  fontPairId: 'custom',
                  bodyFontSource: source,
                  typography: { ...prev.typography, fontFamily: resolveFontFamily(source, 'body') },
                }))
              }
            />
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Live preview</p>
            <h3 className="text-2xl font-heading font-bold">Heading — The quick brown fox</h3>
            <p className="font-sans text-base">
              Body text — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Changes apply instantly across the site.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Color Palettes */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palettes</CardTitle>
          <CardDescription>
            Configure colors for light and dark modes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="light">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light">
                <Sun className="h-4 w-4 mr-2" />
                Light Mode
              </TabsTrigger>
              <TabsTrigger value="dark">
                <Moon className="h-4 w-4 mr-2" />
                Dark Mode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="light" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput
                  label="Primary Color"
                  value={theme.light.primary}
                  onChange={(v) => updateColor('light', 'primary', v)}
                  description="Your brand's primary color"
                />
                <ColorInput
                  label="Primary Text"
                  value={theme.light.primaryForeground}
                  onChange={(v) => updateColor('light', 'primaryForeground', v)}
                />
                <ColorInput
                  label="Secondary Color"
                  value={theme.light.secondary}
                  onChange={(v) => updateColor('light', 'secondary', v)}
                />
                <ColorInput
                  label="Secondary Text"
                  value={theme.light.secondaryForeground}
                  onChange={(v) => updateColor('light', 'secondaryForeground', v)}
                />
                <ColorInput
                  label="Accent Color"
                  value={theme.light.accent}
                  onChange={(v) => updateColor('light', 'accent', v)}
                />
                <ColorInput
                  label="Accent Text"
                  value={theme.light.accentForeground}
                  onChange={(v) => updateColor('light', 'accentForeground', v)}
                />
                <ColorInput
                  label="Background"
                  value={theme.light.background}
                  onChange={(v) => updateColor('light', 'background', v)}
                />
                <ColorInput
                  label="Main Text"
                  value={theme.light.foreground}
                  onChange={(v) => updateColor('light', 'foreground', v)}
                />
                <ColorInput
                  label="Border"
                  value={theme.light.border}
                  onChange={(v) => updateColor('light', 'border', v)}
                />
                <ColorInput
                  label="Success"
                  value={theme.light.success}
                  onChange={(v) => updateColor('light', 'success', v)}
                />
                <ColorInput
                  label="Warning"
                  value={theme.light.warning}
                  onChange={(v) => updateColor('light', 'warning', v)}
                />
                <ColorInput
                  label="Error"
                  value={theme.light.destructive}
                  onChange={(v) => updateColor('light', 'destructive', v)}
                />
              </div>
            </TabsContent>

            <TabsContent value="dark" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorInput
                  label="Primary Color"
                  value={theme.dark.primary}
                  onChange={(v) => updateColor('dark', 'primary', v)}
                  description="Your brand's primary color"
                />
                <ColorInput
                  label="Primary Text"
                  value={theme.dark.primaryForeground}
                  onChange={(v) => updateColor('dark', 'primaryForeground', v)}
                />
                <ColorInput
                  label="Secondary Color"
                  value={theme.dark.secondary}
                  onChange={(v) => updateColor('dark', 'secondary', v)}
                />
                <ColorInput
                  label="Secondary Text"
                  value={theme.dark.secondaryForeground}
                  onChange={(v) => updateColor('dark', 'secondaryForeground', v)}
                />
                <ColorInput
                  label="Accent Color"
                  value={theme.dark.accent}
                  onChange={(v) => updateColor('dark', 'accent', v)}
                />
                <ColorInput
                  label="Accent Text"
                  value={theme.dark.accentForeground}
                  onChange={(v) => updateColor('dark', 'accentForeground', v)}
                />
                <ColorInput
                  label="Background"
                  value={theme.dark.background}
                  onChange={(v) => updateColor('dark', 'background', v)}
                />
                <ColorInput
                  label="Main Text"
                  value={theme.dark.foreground}
                  onChange={(v) => updateColor('dark', 'foreground', v)}
                />
                <ColorInput
                  label="Border"
                  value={theme.dark.border}
                  onChange={(v) => updateColor('dark', 'border', v)}
                />
                <ColorInput
                  label="Success"
                  value={theme.dark.success}
                  onChange={(v) => updateColor('dark', 'success', v)}
                />
                <ColorInput
                  label="Warning"
                  value={theme.dark.warning}
                  onChange={(v) => updateColor('dark', 'warning', v)}
                />
                <ColorInput
                  label="Error"
                  value={theme.dark.destructive}
                  onChange={(v) => updateColor('dark', 'destructive', v)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Preview of configured colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(theme.light).slice(0, 8).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div
                  className="h-20 rounded-md border"
                  style={{ background: `hsl(${value})` }}
                />
                <p className="text-xs font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
