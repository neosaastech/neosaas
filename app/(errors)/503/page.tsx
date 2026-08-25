import { ErrorPageLayout } from '@/components/common/error-page-layout'
import { getPlatformConfig } from '@/lib/config'

export default async function Error503Page() {
  const { siteName, siteNameStyle, siteNameHtml } = await getPlatformConfig()
  return (
    <ErrorPageLayout
      siteName={siteName}
      siteNameStyle={siteNameStyle}
      siteNameHtml={siteNameHtml}
      errorCode="503"
      title="Service Unavailable"
      description="The service is temporarily unavailable. We're working to restore it as quickly as possible."
      icon={
        <div className="flex items-center justify-center gap-4">
          <svg className="h-40 w-40 sm:h-56 sm:w-56" viewBox="0 0 200 200" fill="none">
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-[120px] font-black fill-[#5B8FF9] sm:text-[160px]">
              5
            </text>
          </svg>
          <div className="relative h-40 w-40 sm:h-56 sm:w-56">
            <svg className="h-full w-full" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="90" className="fill-[#5B8FF9] opacity-20" />
              <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" className="text-[120px] font-black fill-[#5B8FF9] sm:text-[160px]">
                0
              </text>
              <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" className="text-[40px]">
                😞
              </text>
            </svg>
          </div>
          <svg className="h-40 w-40 sm:h-56 sm:w-56" viewBox="0 0 200 200" fill="none">
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-[120px] font-black fill-[#5B8FF9] sm:text-[160px]">
              3
            </text>
          </svg>
        </div>
      }
    />
  )
}
