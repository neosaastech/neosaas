/**
 * Centralized status configurations for consistent badge display across the application
 * This file contains all status display configurations for products, orders, roles, etc.
 */

import {
  Package,
  Calendar,
  Clock,
  Cog,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
  FileText,
  Eye,
  Play,
  Pause,
  Ban,
  Rocket,
  Download,
  Repeat,
  CreditCard
} from "lucide-react"
import type { StatusConfig } from "@/components/ui/status-badge"

// =============================================================================
// PRODUCT TYPES
// =============================================================================

export const productTypeConfigs: Record<string, StatusConfig> = {
  physical: {
    label: "Physical",
    icon: Package,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  digital: {
    label: "Digital",
    icon: Rocket,
    className: "bg-blue-100 text-blue-700 border-blue-300"
  },
  // Legacy types (backward compatibility)
  standard: {
    label: "Standard (Legacy)",
    icon: Package,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  },
  free: {
    label: "Free (Legacy)",
    icon: Download,
    className: "bg-amber-100 text-amber-700 border-amber-300"
  },
  consulting: {
    label: "Consulting (Legacy)",
    icon: Calendar,
    className: "bg-purple-100 text-purple-700 border-purple-300"
  },
  undefined: {
    label: "Undefined",
    icon: Package,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  }
}

export function getProductTypeConfig(type: string | null): StatusConfig {
  if (!type) return productTypeConfigs.undefined
  return productTypeConfigs[type] || {
    label: type,
    icon: Package,
    className: "bg-orange-100 text-orange-700 border-orange-300"
  }
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export const paymentTypeConfigs: Record<string, StatusConfig> = {
  one_time: {
    label: "One-time",
    icon: CreditCard,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  hourly: {
    label: "Hourly",
    icon: Clock,
    className: "bg-orange-100 text-orange-700 border-orange-300"
  },
  subscription: {
    label: "Subscription",
    icon: Repeat,
    className: "bg-indigo-100 text-indigo-700 border-indigo-300"
  },
  undefined: {
    label: "One-time",
    icon: CreditCard,
    className: "bg-green-100 text-green-700 border-green-300"
  }
}

export function getPaymentTypeConfig(paymentType: string | null | undefined): StatusConfig {
  if (!paymentType) return paymentTypeConfigs.undefined
  return paymentTypeConfigs[paymentType] || paymentTypeConfigs.undefined
}

// =============================================================================
// ORDER STATUS
// =============================================================================

export const orderStatusConfigs: Record<string, StatusConfig> = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 border-yellow-300"
  },
  processing: {
    label: "En cours",
    icon: Cog,
    className: "bg-blue-100 text-blue-700 border-blue-300"
  },
  paid: {
    label: "Payée",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  completed: {
    label: "Terminée",
    icon: Package,
    className: "bg-emerald-100 text-emerald-700 border-emerald-300"
  },
  cancelled: {
    label: "Annulée",
    icon: XCircle,
    className: "bg-red-100 text-red-700 border-red-300"
  },
  refunded: {
    label: "Remboursée",
    icon: RefreshCw,
    className: "bg-purple-100 text-purple-700 border-purple-300"
  }
}

export function getOrderStatusConfig(status: string): StatusConfig {
  return orderStatusConfigs[status] || {
    label: status,
    icon: Clock,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  }
}

// =============================================================================
// USER ROLES
// =============================================================================

export const userRoleConfigs: Record<string, StatusConfig> = {
  super_admin: {
    label: "Super Admin",
    icon: ShieldCheck,
    className: "bg-red-100 text-red-700 border-red-300"
  },
  admin: {
    label: "Administrator",
    icon: Shield,
    className: "bg-orange-100 text-orange-700 border-orange-300"
  },
  writer: {
    label: "Writer",
    icon: UserCog,
    className: "bg-blue-100 text-blue-700 border-blue-300"
  },
  reader: {
    label: "Reader",
    icon: Users,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  user: {
    label: "User",
    icon: Users,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  }
}

export function getUserRoleConfig(role: string): StatusConfig {
  const roleLower = role?.toLowerCase() || "user"
  
  if (roleLower.includes("super") || roleLower === "super_admin") {
    return userRoleConfigs.super_admin
  }
  
  if (roleLower.includes("admin")) {
    return userRoleConfigs.admin
  }
  
  if (roleLower.includes("writer")) {
    return userRoleConfigs.writer
  }
  
  if (roleLower.includes("reader")) {
    return userRoleConfigs.reader
  }
  
  return userRoleConfigs.user
}

// =============================================================================
// PUBLICATION STATUS
// =============================================================================

export const publicationStatusConfigs: Record<string, StatusConfig> = {
  published: {
    label: "Published",
    icon: Eye,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  },
  archived: {
    label: "Archived",
    icon: Ban,
    className: "bg-red-100 text-red-700 border-red-300"
  }
}

export function getPublicationStatusConfig(isPublished: boolean): StatusConfig {
  return isPublished ? publicationStatusConfigs.published : publicationStatusConfigs.draft
}

// =============================================================================
// ACTIVE STATUS
// =============================================================================

export const activeStatusConfigs: Record<string, StatusConfig> = {
  active: {
    label: "Active",
    icon: Play,
    className: "bg-green-100 text-green-700 border-green-300"
  },
  inactive: {
    label: "Inactive",
    icon: Pause,
    className: "bg-gray-100 text-gray-700 border-gray-300"
  }
}

export function getActiveStatusConfig(isActive: boolean): StatusConfig {
  return isActive ? activeStatusConfigs.active : activeStatusConfigs.inactive
}
