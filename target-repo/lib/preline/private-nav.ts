import type { LucideIcon } from "lucide-react"
import {
  Home,
  CreditCard,
  Building2,
  User,
  HelpCircle,
  MessageSquare,
  Rocket,
  CalendarDays,
  ShoppingBag,
  Users,
  Layers,
  FileText,
  Settings,
  Key,
  Mail,
  Headphones,
  LayoutGrid,
} from "lucide-react"

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

export const dashboardNavItems: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Company", href: "/dashboard/company-management", icon: Building2 },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Support", href: "/dashboard/support", icon: HelpCircle },
]

export const adminNavItems: NavItem[] = [
  { name: "Business", href: "/admin", icon: Rocket },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { name: "Products", href: "/admin/products", icon: ShoppingBag },
  { name: "Organization", href: "/admin/users", icon: Users, superAdminOnly: true },
  { name: "Content", href: "/admin/pages", icon: Layers },
  { name: "Page Builder", href: "/admin/pilotage/builder", icon: LayoutGrid },
  { name: "Internal Routes", href: "/admin/internal-routes", icon: FileText, superAdminOnly: true },
  { name: "Parameters", href: "/admin/settings", icon: Settings },
  { name: "API Management", href: "/admin/api", icon: Key },
  { name: "Mail", href: "/admin/mail", icon: Mail },
  { name: "Legal", href: "/admin/legal", icon: FileText },
]

export const supportSubItems = [
  { name: "Chat", href: "/admin/chat", icon: MessageSquare },
  { name: "Tickets", href: "/admin/support", icon: Headphones },
]
