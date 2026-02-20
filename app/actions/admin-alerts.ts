'use server'

import { getCurrentUser } from "@/lib/auth"
import { db } from "@/db"
import { users, emailProviderConfigs, companies } from "@/db/schema"
import { eq } from "drizzle-orm"

import { revalidatePath } from "next/cache"

export type AdminAlert = {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
}

export async function getAdminAlerts(): Promise<AdminAlert[]> {
  // Force dynamic rendering to ensure we get fresh data
  // This is crucial because this action is called from a client component
  // and we want to reflect changes immediately after profile updates.
  try {
    const alerts: AdminAlert[] = []
    
    // 1. Check Authentication
    const session = await getCurrentUser()
    if (!session) return []

    // 2. Fetch full user profile
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId)
    })

    if (!user) return []

  // 3. Check User Profile Completeness
  const missingFields = []
  if (!user.firstName) missingFields.push("First Name")
  if (!user.lastName) missingFields.push("Last Name")
  
  // Check for default values from seed
  if (user.firstName === 'Super' && user.lastName === 'Admin') {
    alerts.push({
      id: 'default-profile',
      type: 'warning',
      title: 'Default Admin Profile',
      message: 'You are using the default "Super Admin" name. Please update your profile with your real name.',
      actionLabel: 'Edit Profile',
      actionUrl: '/dashboard/profile'
    })
  } else if (missingFields.length > 0) {
    alerts.push({
      id: 'profile-incomplete',
      type: 'warning',
      title: 'Profile Incomplete',
      message: `Your admin profile is missing: ${missingFields.join(', ')}. Please complete your profile.`,
      actionLabel: 'Edit Profile',
      actionUrl: '/dashboard/profile'
    })
  }

  // Check for default email (Security Risk)
  if (user.email === 'admin@exemple.com') {
    alerts.push({
      id: 'default-email',
      type: 'error',
      title: 'Security Risk: Default Email',
      message: 'You are using the default admin email (admin@exemple.com). Please change your email or create a new admin account immediately.',
      actionLabel: 'Edit Profile',
      actionUrl: '/dashboard/profile'
    })
  }

  // 4. Check Email Configuration
  // Check if there is at least one active email provider in the database
  const activeEmailProviders = await db.query.emailProviderConfigs.findMany({
    where: eq(emailProviderConfigs.isActive, true)
  })

  // Also check env var as fallback/legacy
  const resendKey = process.env.RESEND_API_KEY
  const hasEnvKey = resendKey && !resendKey.includes('your-api-key')

  if (activeEmailProviders.length === 0 && !hasEnvKey) {
    alerts.push({
      id: 'missing-email-config',
      type: 'error',
      title: 'Missing Email Configuration',
      message: 'No active email provider configured. Transactional emails (welcome, password reset) will not be sent.',
      actionLabel: 'Configure Email',
      actionUrl: '/admin/mail'
    })
  }

  // 5. Check "Company" / Contact Info
  if (!user.phone) {
     alerts.push({
      id: 'profile-phone-missing',
      type: 'warning',
      title: 'Missing Phone Number',
      message: 'Please add a phone number to your profile for urgent notifications.',
      actionLabel: 'Edit Profile',
      actionUrl: '/dashboard/profile'
    })
  }

  // 6. Check Super Admin Company
  if (user.companyId) {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, user.companyId)
    })
    
    if (company && (company.name === 'My Company' || company.name === 'NeoSaaS')) {
       alerts.push({
        id: 'default-company',
        type: 'warning',
        title: 'Default Company Name',
        message: `Your company is still named "${company.name}". Please update it to your real organization name.`,
        actionLabel: 'Edit Company',
        actionUrl: '/dashboard/company-management'
      })
    }
  }

  return alerts
  } catch (error) {
    console.error("Failed to get admin alerts:", error)
    return []
  }
}
