import type * as React from "react"

function BarChart4(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16h2" />
      <path d="M11 11h2" />
      <path d="M15 16h2" />
      <path d="M19 6h2" />
    </svg>
  )
}

export { BarChart4 }
