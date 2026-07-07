import type { PlatformConfigData } from "@/lib/config"
import type { JWTPayload } from "@/lib/auth"
import type { AuthUser } from "@/lib/auth/server"
import type { RequiredRoleLevel } from "@/lib/auth/page-access"

export const OFFLINE_DEV_USER_ID = "00000000-0000-4000-8000-000000000001"

export const OFFLINE_DEV_USER: JWTPayload & AuthUser = {
  userId: OFFLINE_DEV_USER_ID,
  email: "dev@localhost",
  roles: ["super_admin"],
  permissions: ["*"],
}

export const OFFLINE_PLATFORM_CONFIG: PlatformConfigData = {
  siteName: "NeoSaaS",
  logo: null,
  logoDisplayMode: "both",
  authEnabled: true,
  maintenanceMode: false,
  defaultSenderEmail: "dev@localhost",
  cookieConsentEnabled: false,
  cookieConsentMessage: "Mode développement hors-ligne — pas de cookies réels.",
  cookiePosition: "bottom-left",
  tosPosition: "center",
}

export const OFFLINE_PAGE_PERMISSIONS: { path: string; access: RequiredRoleLevel }[] = [
  { path: "/", access: "public" },
  { path: "/pricing", access: "public" },
  { path: "/legal/privacy", access: "public" },
  { path: "/legal/terms", access: "public" },
  { path: "/auth/login", access: "public" },
  { path: "/auth/register", access: "public" },
  { path: "/dashboard", access: "user" },
  { path: "/admin", access: "admin" },
]

export const OFFLINE_MOCK_TOS = {
  version: "1.0-dev",
  effectiveDate: new Date(),
  content: "<p>Conditions générales de démonstration — mode hors-ligne sans base de données.</p>",
}

export const OFFLINE_LEGAL_COMPANY = {
  name: "NeoSaaS Dev",
  address: "1 rue du Développement",
  city: "Paris",
  zipCode: "75001",
  siret: "000 000 000 00000",
  vatNumber: "FR00000000000",
  email: "dev@localhost",
  phone: null,
  isPerson: false,
  superAdminName: "Dev Admin",
}

/** Shape returned by GET /api/auth/me — used by AdminClientGuard */
export const OFFLINE_AUTH_ME_USER = {
  id: OFFLINE_DEV_USER_ID,
  email: OFFLINE_DEV_USER.email,
  username: "dev",
  firstName: "Dev",
  lastName: "Admin",
  isActive: true,
  isDpo: true,
  isSiteManager: true,
  roles: [{ roleName: "super_admin", roleDescription: "Super Administrator (offline dev)" }],
  permissions: [] as { permissionName: string; permissionDescription: string }[],
}

export const OFFLINE_MOCK_PRODUCTS = [
  {
    id: "offline-product-starter",
    title: "Starter",
    subtitle: "Pour démarrer",
    description: "Plan de démonstration — mode hors-ligne, sans base de données.",
    price: 0,
    currency: "EUR",
    type: "subscription",
    isPublished: true,
    isFeatured: false,
    icon: "Zap",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "offline-product-pro",
    title: "Pro",
    subtitle: "Pour les équipes",
    description: "Plan professionnel de démonstration avec toutes les features.",
    price: 2900,
    currency: "EUR",
    type: "subscription",
    isPublished: true,
    isFeatured: true,
    icon: "Rocket",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "offline-product-enterprise",
    title: "Enterprise",
    subtitle: "Sur mesure",
    description: "Plan entreprise — contactez-nous pour un devis personnalisé.",
    price: 9900,
    currency: "EUR",
    type: "subscription",
    isPublished: true,
    isFeatured: false,
    icon: "Building2",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]
