import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t bg-[#1A1A1A] text-white">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="font-bold text-xl tracking-tight">
                <span className="text-white">Neo</span>
                <span className="text-[#CD7F32]">SaaS</span>
              </div>
            </div>
            <p className="text-sm text-white/70">
              All-in-one platform with everything you need to launch, grow, and manage your SaaS business.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-[#CD7F32]">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/features" className="text-sm text-white/70 hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-white/70 hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/appearance" className="text-sm text-white/70 hover:text-white">
                  Appearance
                </Link>
              </li>
              <li>
                <Link href="/brand" className="text-sm text-white/70 hover:text-white">
                  Brand
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-[#CD7F32]">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/legacy/about" className="text-sm text-white/70 hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/legacy/contact" className="text-sm text-white/70 hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/legacy/affiliate" className="text-sm text-white/70 hover:text-white">
                  Affiliates
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4 text-[#CD7F32]">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-white/70 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/70 hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-white/70 hover:text-white">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-white/70">&copy; {new Date().getFullYear()} NeoSaaS. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="text-white/70 hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </Link>
            <Link href="#" className="text-white/70 hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
              </svg>
            </Link>
            <Link href="#" className="text-white/70 hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
