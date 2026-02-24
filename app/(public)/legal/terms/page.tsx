import { getLatestTos } from "@/app/actions/legal"
import { getPlatformConfig } from "@/lib/config"

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service and legal notices. Read our conditions of use, user responsibilities, and service agreements.",
  keywords: ["terms", "service", "legal", "conditions", "agreement"],
}

export default async function TermsOfServicePage() {
  const tosResult = await getLatestTos()
  const config = await getPlatformConfig()

  if (!tosResult.success || !tosResult.data) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>
        <p>No terms of service have been published yet.</p>
        <p className="text-sm text-muted-foreground">
          If you are an administrator, please create and publish the Terms of Service from the admin panel.
        </p>
      </div>
    )
  }

  const tos = tosResult.data

  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Terms of Service</h1>
      <p className="lead">Version {tos.version} - Effective Date: {new Date(tos.effectiveDate).toLocaleDateString()}</p>

      <div dangerouslySetInnerHTML={{ __html: tos.content }} />

      <hr className="my-8" />

      <h3>Contact Information</h3>
      <p>
        If you have any questions about these Terms, please contact us at {config.defaultSenderEmail}.
      </p>
    </div>
  )
}
