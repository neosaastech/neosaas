import { getPlatformConfig } from "@/lib/config"
import { getLegalCompanyDetails } from "@/app/actions/legal"
import { Mail, MapPin, Phone, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata = {
  title: "Privacy Policy",
  description: "Our privacy policy explains how we collect, use, and protect your personal information. Read our data protection and privacy practices.",
  keywords: ["privacy", "policy", "data protection", "GDPR", "personal information"],
}

export default async function PrivacyPolicyPage() {
  const config = await getPlatformConfig()
  const company = await getLegalCompanyDetails()

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Privacy Policy</h1>
        <p className="text-xl text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <div className="h-1 w-20 bg-primary rounded-full" />
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>1. Introduction</h2>
        <p>
          Welcome to <strong>{config.siteName}</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
          If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We collect personal information that you voluntarily provide to us when registering at the Services expressing an interest in obtaining information about us or our products and services, when participating in activities on the Services or otherwise contacting us.
        </p>
        <p>
          The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make and the products and features you use. The personal information we collect can include the following:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Name and Contact Data.</strong> We collect your first and last name, email address, postal address, phone number, and other similar contact data.</li>
          <li><strong>Credentials.</strong> We collect passwords, password hints, and similar security information used for authentication and account access.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>
          We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To facilitate account creation and logon process.</li>
          <li>To send you marketing and promotional communications.</li>
          <li>To send administrative information to you.</li>
        </ul>

        <h2>4. Compliance with EU Regulations (DSA/DMA)</h2>
        <p>
          We are committed to complying with the Digital Services Act (DSA) and Digital Markets Act (DMA) to ensure a safe and fair digital environment. Our data collection and processing practices are designed to meet the transparency and accountability standards set by these regulations.
        </p>
        <p>
          For more information on how the EU regulates digital platforms and protects user rights, please refer to the official documentation:
        </p>
        <div className="not-prose my-4">
          <Button asChild variant="outline" className="h-auto py-4 px-6">
            <Link href="https://www.europarl.europa.eu/topics/en/article/20211209STO19124/eu-digital-markets-act-and-digital-services-act-explained" target="_blank" rel="noopener noreferrer">
              <Building2 className="mr-2 h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">EU Digital Markets Act & Digital Services Act</div>
                <div className="text-xs text-muted-foreground">Read the official explanation on europarl.europa.eu</div>
              </div>
            </Link>
          </Button>
        </div>

        <h2>5. Contact Us</h2>
        <p>
          If you have questions or comments about this policy, you may contact us via email.
        </p>
        <div className="not-prose mt-4">
          <Button asChild variant="outline">
            <Link href={`mailto:${company?.email || config.defaultSenderEmail}`}>
              <Mail className="mr-2 h-4 w-4" />
              Contact Privacy Team
            </Link>
          </Button>
        </div>
      </div>

      {company && (
        <div className="mt-12 border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="bg-muted/50 p-4 border-b flex items-center gap-2">
                {company.isPerson ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                <h3 className="font-semibold text-lg">
                  {company.isPerson ? "Site Manager (Responsable du site)" : "Legal Entity"}
                </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Name / Organization</p>
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
                            <p className="text-sm text-muted-foreground mb-1">SIRET</p>
                            <p className="font-mono">{company.siret}</p>
                        </div>
                    )}
                    {company.vatNumber && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">VAT Number</p>
                            <p className="font-mono">{company.vatNumber}</p>
                        </div>
                    )}
                    {company.superAdminName && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Super Admin / DPO</p>
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
