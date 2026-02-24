/**
 * Script to check user roles in the database
 * Usage: npx tsx scripts/check-user-roles.ts [email]
 */

import { db } from '../db'
import { users, userRoles, roles } from '../db/schema'
import { eq } from 'drizzle-orm'

async function checkUserRoles(email?: string) {
  try {
    console.log('🔍 Checking user roles...\n')

    if (email) {
      // Check specific user
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: {
          userRoles: {
            with: {
              role: true
            }
          },
          company: true
        }
      })

      if (!user) {
        console.log(`❌ User not found: ${email}`)
        return
      }

      console.log(`📧 User: ${user.email}`)
      console.log(`👤 Name: ${user.firstName} ${user.lastName}`)
      console.log(`🏢 Company: ${user.company?.name || 'None'}`)
      console.log(`🔑 User ID: ${user.id}`)
      console.log(`✅ Active: ${user.isActive}`)
      console.log('\n📋 Roles:')

      if (user.userRoles.length === 0) {
        console.log('  ⚠️  No roles assigned')
      } else {
        user.userRoles.forEach(ur => {
          console.log(`  - ${ur.role.name} (scope: ${ur.role.scope})`)
        })
      }
    } else {
      // Check all users
      const allUsers = await db.query.users.findMany({
        with: {
          userRoles: {
            with: {
              role: true
            }
          },
          company: true
        },
        orderBy: (users, { desc }) => [desc(users.createdAt)]
      })

      console.log(`Found ${allUsers.length} users:\n`)

      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName})`)
        console.log(`   Company: ${user.company?.name || 'None'}`)
        console.log(`   Active: ${user.isActive}`)
        console.log(`   Roles: ${user.userRoles.map(ur => ur.role.name).join(', ') || 'None'}`)
        console.log('')
      })

      // Check admin users specifically
      const adminUsers = allUsers.filter(u =>
        u.userRoles.some(ur => ur.role.name === 'admin' || ur.role.name === 'super_admin')
      )

      console.log('\n👑 Admin Users:')
      if (adminUsers.length === 0) {
        console.log('  ⚠️  No admin users found!')
      } else {
        adminUsers.forEach(user => {
          const adminRoles = user.userRoles
            .filter(ur => ur.role.name === 'admin' || ur.role.name === 'super_admin')
            .map(ur => ur.role.name)
          console.log(`  - ${user.email}: ${adminRoles.join(', ')}`)
        })
      }
    }

    console.log('\n✅ Check complete')
  } catch (error) {
    console.error('❌ Error checking user roles:', error)
    process.exit(1)
  }
}

// Get email from command line args
const email = process.argv[2]
checkUserRoles(email).then(() => process.exit(0))
