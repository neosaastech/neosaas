import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="absolute left-0 top-0 -z-10 opacity-5">
        <div className="h-96 w-96 rounded-full bg-[#5B8FF9]" />
      </div>
      <div className="absolute right-0 top-20 -z-10 opacity-5">
        <div className="h-32 w-32 rounded-full bg-brand" />
      </div>
      <div className="absolute bottom-0 right-0 -z-10 opacity-5">
        <div className="h-96 w-96 rounded-full bg-[#5B8FF9]" />
      </div>

      <div className="relative z-10 w-full max-w-[800px] text-center">
        <div className="mb-6 flex items-center justify-center gap-2 sm:gap-4">
          {/* First 4 */}
          <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-[#5B8FF9] sm:h-44 sm:w-32">
            <span className="text-8xl font-black text-white sm:text-9xl">4</span>
          </div>
          
          {/* 0 with emoji */}
          <div className="relative flex h-32 w-24 items-center justify-center rounded-lg bg-[#5B8FF9] sm:h-44 sm:w-32">
            <span className="text-8xl font-black text-white sm:text-9xl">0</span>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform rounded-full bg-white p-1 shadow-lg sm:-bottom-3">
              <span className="text-2xl sm:text-3xl">😞</span>
            </div>
          </div>
          
          {/* Second 4 */}
          <div className="flex h-32 w-24 items-center justify-center rounded-lg bg-[#5B8FF9] sm:h-44 sm:w-32">
            <span className="text-8xl font-black text-white sm:text-9xl">4</span>
          </div>
        </div>

        <h2 className="mb-5 text-2xl font-bold text-foreground sm:text-4xl">
          Sorry, the page can&apos;t be found
        </h2>

        <p className="mb-8 text-base leading-relaxed text-muted-foreground">
          The page you were looking for appears to have been moved, deleted or does not exist.
        </p>

        <Button asChild size="lg" className="bg-[#5B8FF9] hover:bg-[#4a7de8]">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <p className="text-sm text-muted-foreground">
          © 2025 - <span className="text-foreground">Neo</span>
          <span className="text-brand">SaaS</span>
        </p>
      </div>
    </div>
  )
}
