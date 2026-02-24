/**
 * Theme Configuration Actions
 * Gestion des configurations de thème dans la base de données
 */

'use server'

import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { ThemeConfig } from '@/types/theme-config'
import { defaultTheme } from '@/types/theme-config'

/**
 * Récupérer la configuration de thème actuelle
 */
export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    const result = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, 'theme_config'))
      .limit(1)

    if (result.length === 0 || !result[0].value) {
      return defaultTheme
    }

    return JSON.parse(result[0].value) as ThemeConfig
  } catch (error) {
    console.error('Failed to get theme config:', error)
    return defaultTheme
  }
}

/**
 * Sauvegarder la configuration de thème
 */
export async function updateThemeConfig(config: ThemeConfig): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const configValue = JSON.stringify({
      ...config,
      updatedAt: new Date(),
    })

    await db
      .insert(platformConfig)
      .values({
        key: 'theme_config',
        value: configValue,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: configValue,
          updatedAt: new Date(),
        },
      })

    // Revalider toutes les pages pour appliquer le nouveau thème
    revalidatePath('/', 'layout')

    return { success: true }
  } catch (error) {
    console.error('Failed to update theme config:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update theme',
    }
  }
}

/**
 * Réinitialiser le thème aux valeurs par défaut
 */
export async function resetThemeConfig(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await db
      .insert(platformConfig)
      .values({
        key: 'theme_config',
        value: JSON.stringify({
          ...defaultTheme,
          updatedAt: new Date(),
        }),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfig.key,
        set: {
          value: JSON.stringify({
            ...defaultTheme,
            updatedAt: new Date(),
          }),
          updatedAt: new Date(),
        },
      })

    revalidatePath('/', 'layout')

    return { success: true }
  } catch (error) {
    console.error('Failed to reset theme config:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset theme',
    }
  }
}

/**
 * Mettre à jour uniquement les couleurs (mode clair ou sombre)
 */
export async function updateThemeColors(
  mode: 'light' | 'dark',
  colors: Partial<ThemeConfig['light']>
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const currentConfig = await getThemeConfig()

    const updatedConfig: ThemeConfig = {
      ...currentConfig,
      [mode]: {
        ...currentConfig[mode],
        ...colors,
      },
      updatedAt: new Date(),
    }

    return await updateThemeConfig(updatedConfig)
  } catch (error) {
    console.error('Failed to update theme colors:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update colors',
    }
  }
}

/**
 * Mettre à jour la typographie
 */
export async function updateTypography(
  typography: Partial<ThemeConfig['typography']>
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const currentConfig = await getThemeConfig()

    const updatedConfig: ThemeConfig = {
      ...currentConfig,
      typography: {
        ...currentConfig.typography,
        ...typography,
      },
      updatedAt: new Date(),
    }

    return await updateThemeConfig(updatedConfig)
  } catch (error) {
    console.error('Failed to update typography:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update typography',
    }
  }
}
