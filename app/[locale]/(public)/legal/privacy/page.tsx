import { getPlatformConfig } from "@/lib/config"
import { getLegalCompanyDetails } from "@/app/actions/legal"
import { Mail, MapPin, Phone, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { privacyPageDictionary, resolveLegalLocale } from "@/lib/i18n/legal-dictionary"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = privacyPageDictionary[resolveLegalLocale(locale)]
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: ["privacy", "policy", "data protection", "GDPR", "personal information"],
  }
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = privacyPageDictionary[resolveLegalLocale(locale)]
  const config = await getPlatformConfig()
  const company = await getLegalCompanyDetails()

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">{t.heading}</h1>
        <p className="text-xl text-muted-foreground">
          {t.lastUpdated} {new Date().toLocaleDateString(resolveLegalLocale(locale) === "fr" ? "fr-FR" : "en-US")}
        </p>
        <div className="h-1 w-20 bg-primary rounded-full" />
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>{t.intro.title}</h2>
        <p>{t.intro.body(config.siteName)}</p>

        <h2>{t.collect.title}</h2>
        <p>{t.collect.body1}</p>
        <p>{t.collect.body2}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>{t.collect.item1}</strong> {t.collect.item1Rest}</li>
          <li><strong>{t.collect.item2}</strong> {t.collect.item2Rest}</li>
        </ul>

        <h2>{t.use.title}</h2>
        <p>{t.use.body}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t.use.item1}</li>
          <li>{t.use.item2}</li>
          <li>{t.use.item3}</li>
        </ul>

        <h2>{t.compliance.title}</h2>
        <p>{t.compliance.body1}</p>
        <p>{t.compliance.body2}</p>
        <div className="not-prose my-4">
          <Button asChild variant="outline" className="h-auto py-4 px-6">
            <Link href="https://www.europarl.europa.eu/topics/en/article/20211209STO19124/eu-digital-markets-act-and-digital-services-act-explained" target="_blank" rel="noopener noreferrer">
              <Building2 className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">{t.compliance.linkTitle}</div>
                <div className="text-xs text-muted-foreground">{t.compliance.linkSubtitle}</div>
              </div>
            </Link>
          </Button>
        </div>

        <h2>{t.contact.title}</h2>
        <p>{t.contact.body}</p>
        <div className="not-prose mt-4">
          <Button asChild variant="outline">
            <Link href={`mailto:${company?.email || config.defaultSenderEmail}`}>
              <Mail className="mr-2 h-4 w-4" />
              {t.contact.button}
            </Link>
          </Button>
        </div>
      </div>

      {company && (
        <div className="mt-12 border rounded-xl overflow-hidden bg-card shadow-xs">
            <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
                {company.isPerson ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                <h3 className="font-semibold text-lg">
                  {company.isPerson ? t.company.personTitle : t.company.entityTitle}
                </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">{t.company.nameLabel}</p>
                        <p className="font-medium text-lg">{company.name}</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p>{company.address}</p>
                            <p>{company.zipCode} {company.city}</p>
                        </div>
                    </div>
                    {company.phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <p>{company.phone}</p>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <p>{company.email}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    {company.siret && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">{t.company.siret}</p>
                            <p className="font-mono">{company.siret}</p>
                        </div>
                    )}
                    {company.vatNumber && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">{t.company.vat}</p>
                            <p className="font-mono">{company.vatNumber}</p>
                        </div>
                    )}
                    {company.superAdminName && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">{t.company.dpo}</p>
                            <p className="font-medium">{company.superAdminName}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
