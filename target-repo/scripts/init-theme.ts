/**
 * Initialize Default Theme Configuration
 * Script optionnel pour initialiser le thème par défaut dans la base de données
 * 
 * Usage: npm run init-theme
 */

import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { defaultTheme } from '@/types/theme-config'
import { eq } from 'drizzle-orm'

async function initializeTheme() {
  console.log('🎨 Initializing default theme configuration...')

  try {
    // Vérifier si une configuration existe déjà
    const existing = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.key, 'theme_config'))
      .limit(1)

    if (existing.length > 0) {
      console.log('⚠️  Theme configuration already exists.')
      console.log('   Use the admin interface to modify it, or delete it first to reinitialize.')
      return
    }

    // Insérer le thème par défaut
    await db.insert(platformConfig).values({
      key: 'theme_config',
      value: JSON.stringify({
        ...defaultTheme,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updatedAt: new Date(),
    })

    console.log('✅ Default theme configuration initialized successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Go to Admin > Settings > Styles')
    console.log('   2. Customize your theme colors')
    console.log('   3. Save and reload to see changes')
    console.log('')
  } catch (error) {
    console.error('❌ Error initializing theme:', error)
    process.exit(1)
  }
}

// Exécuter le script
initializeTheme()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
