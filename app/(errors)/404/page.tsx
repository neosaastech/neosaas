import { ErrorPageLayout } from '@/components/common/error-page-layout'

export default function NotFoundPage() {
  return (
    <ErrorPageLayout
      errorCode="404"
      title="Sorry, the page can't be found"
      description="The page you were looking for appears to have been moved, deleted or does not exist."
      icon={
        <div className="flex items-center justify-center gap-4">
          <svg className="h-40 w-40 sm:h-56 sm:w-56" viewBox="0 0 200 200" fill="none">
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-[120px] font-black fill-[#5B8FF9] sm:text-[160px]">
              4
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
              4
            </text>
          </svg>
        </div>
      }
    />
  )
}
