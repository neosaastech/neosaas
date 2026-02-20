import { getCookieConsents } from "@/app/actions/cookie-consent"
import { getPlatformConfig } from "@/lib/config"
import { LegalManagement } from "./legal-management"

export default async function LegalPage() {
  const [consentsResult, config] = await Promise.all([
    getCookieConsents(),
    getPlatformConfig()
  ])

  const consents = consentsResult.success 
    ? consentsResult.data.map(c => ({
        ...c,
        consentedAt: c.consentedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Legal & Compliance</h1>
        <p className="text-muted-foreground">
          Manage Cookie Consents and legal configuration.
        </p>
      </div>
      
      <LegalManagement 
        initialConfig={config} 
        initialConsents={consents}
      />
    </div>
  )
}
