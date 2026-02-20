/**
 * Theme Settings Component
 * Theme configuration interface in admin panel
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Palette, RefreshCw, Sun, Moon, Monitor } from 'lucide-react'
import type { ThemeConfig, ColorPalette } from '@/types/theme-config'
import { defaultTheme } from '@/types/theme-config'
import { updateThemeConfig, resetThemeConfig, getThemeConfig } from '@/app/actions/theme-config'

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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)

  // Load the configuration
  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    setLoading(true)
    try {
      const config = await getThemeConfig()
      setTheme(config)
    } catch (error) {
      toast.error('Error loading theme')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateThemeConfig(theme)
      if (result.success) {
        toast.success('Theme saved successfully')
        // Reload page to apply changes
        window.location.reload()
      } else {
        toast.error(result.error || 'Error saving theme')
      }
    } catch (error) {
      toast.error('Error saving theme')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to the default theme?')) {
      return
    }

    setSaving(true)
    try {
      const result = await resetThemeConfig()
      if (result.success) {
        toast.success('Theme reset successfully')
        await loadTheme()
        window.location.reload()
      } else {
        toast.error(result.error || 'Error resetting theme')
      }
    } catch (error) {
      toast.error('Error resetting theme')
    } finally {
      setSaving(false)
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
            Customize your site's colors and styles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      {/* Theme Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Display Mode
          </CardTitle>
          <CardDescription>
            Choose the default display mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={theme.mode}
            onValueChange={(value: 'light' | 'dark' | 'auto') =>
              setTheme(prev => ({ ...prev, mode: value }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Auto
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
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
