'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

interface ErrorPageLayoutProps {
  errorCode: string
  title: string
  description: string
  icon: React.ReactNode
}

export function ErrorPageLayout({ errorCode, title, description, icon }: ErrorPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Decorative Background Circles */}
      <div className="absolute left-0 top-0 -z-10">
        <svg width="364" height="201" viewBox="0 0 364 201" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path opacity="0.05" d="M182 0.5C282.5 0.5 363.5 81.5 363.5 182C363.5 282.5 282.5 363.5 182 363.5C81.5 363.5 0.5 282.5 0.5 182C0.5 81.5 81.5 0.5 182 0.5Z" fill="#5B8FF9"/>
        </svg>
      </div>
      <div className="absolute right-0 top-0 -z-10">
        <svg width="130" height="97" viewBox="0 0 130 97" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path opacity="0.05" d="M0.5 48.5C0.5 22.1 22.1 0.5 48.5 0.5C74.9 0.5 96.5 22.1 96.5 48.5C96.5 74.9 74.9 96.5 48.5 96.5C22.1 96.5 0.5 74.9 0.5 48.5Z" fill="#CD7F32"/>
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 -z-10">
        <svg width="364" height="201" viewBox="0 0 364 201" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path opacity="0.05" d="M182 0.5C282.5 0.5 363.5 81.5 363.5 182C363.5 282.5 282.5 363.5 182 363.5C81.5 363.5 0.5 282.5 0.5 182C0.5 81.5 81.5 0.5 182 0.5Z" fill="#5B8FF9"/>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[546px] text-center">
        {/* Error Code Display */}
        <div className="mb-9">
          {icon}
        </div>

        {/* Title */}
        <h2 className="mb-5 text-2xl font-bold text-foreground sm:text-4xl">
          {title}
        </h2>

        {/* Description */}
        <p className="mb-7.5 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* Back to Home Button */}
        <Button asChild size="lg" className="bg-[#5B8FF9] hover:bg-[#4a7de8]">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <p className="text-sm text-muted-foreground">
          © 2025 - <span className="text-foreground">Neo</span>
          <span className="text-brand">SaaS</span>
        </p>
      </div>
    </div>
  )
}
