import { NextResponse } from 'next/server'
import { getFilteredCatalog } from '@/lib/search-catalog'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/search/catalog
 * Retourne le catalogue de recherche filtré selon les permissions de l'utilisateur
 */
export async function GET() {
  try {
    // Récupérer l'utilisateur courant (optionnel)
    let userRolesList: string[] = []
    
    try {
      const currentUser = await getCurrentUser()
      
      if (currentUser) {
        // Récupérer les rôles de l'utilisateur
        const userRolesData = await db
          .select({
            roleName: roles.name,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, currentUser.userId))
        
        userRolesList = userRolesData.map(r => r.roleName)
      }
    } catch (error) {
      // Si l'utilisateur n'est pas authentifié, continuer avec un catalogue public
      console.log('[SEARCH API] User not authenticated, returning public catalog')
    }

    // Récupérer le catalogue filtré
    const catalog = getFilteredCatalog(userRolesList)

    return NextResponse.json({ 
      success: true,
      catalog,
      userRoles: userRolesList,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[SEARCH API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load search catalog',
        catalog: [] 
      },
      { status: 500 }
    )
  }
}
