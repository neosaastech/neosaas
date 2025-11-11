import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-[#1A1A1A] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid gap-8 md:grid-cols-3">
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
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <p className="text-sm text-white/70 text-center">
            &copy; {new Date().getFullYear()} NeoSaaS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
