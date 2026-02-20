'use client'

import { useEffect } from 'react'
import { ErrorPageLayout } from '@/components/common/error-page-layout'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorPageLayout
      errorCode="500"
      title="Internal Server Error"
      description="We apologize for the inconvenience. Our server encountered an unexpected error. Please try again later."
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
              0
            </text>
          </svg>
        </div>
      }
    />
  )
}
