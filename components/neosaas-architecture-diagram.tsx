import Image from "next/image"

export function NeoSaasArchitectureDiagram() {
  return (
    <div className="relative w-full max-w-4xl mx-auto p-8 bg-background rounded-lg border">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">NeoSaaS Architecture</h3>
        <p className="text-muted-foreground text-sm">Full-stack Next.js application with modern tooling</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Frontend Column */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-[#CD7F32] text-white rounded-md font-semibold mb-4">Frontend</div>
          </div>

          <div className="space-y-3">
            {/* JSX Files */}
            <div className="flex items-center justify-center">
              <div className="bg-muted border rounded-lg p-4 w-full text-center">
                <div className="text-2xl mb-2">📄</div>
                <p className="text-xs font-mono">.jsx / .tsx</p>
                <p className="text-xs text-muted-foreground mt-1">React Components</p>
              </div>
            </div>

            {/* React Logo */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-3 w-24 h-24 flex items-center justify-center">
                <div className="text-4xl">⚛️</div>
              </div>
            </div>

            {/* Next.js Logo */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-2">
                <Image
                  src="/images/design-mode/OIP.mJ5m2pvYDrgXgQV26fLoDQHaGp.webp"
                  alt="Next.js"
                  width={80}
                  height={40}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Backend Column */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-[#CD7F32] text-white rounded-md font-semibold mb-4">Backend</div>
          </div>

          <div className="space-y-3">
            {/* API Routes */}
            <div className="flex items-center justify-center">
              <div className="bg-muted border rounded-lg p-4 w-full text-center">
                <div className="text-2xl mb-2">🔧</div>
                <p className="text-xs font-mono">API Routes</p>
                <p className="text-xs text-muted-foreground mt-1">Server Actions</p>
              </div>
            </div>

            {/* Node.js */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-3 w-24 h-24 flex items-center justify-center">
                <div className="text-4xl">🟢</div>
              </div>
            </div>

            {/* Prisma */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-2">
                <Image
                  src="/images/design-mode/OIP.2qv4I5DCIN_XE8cT6M_sFQAAAA.webp"
                  alt="Prisma"
                  width={80}
                  height={40}
                  className="object-contain"
                />
              </div>
            </div>

            {/* Database */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-2">
                <Image
                  src="/images/design-mode/OIP.rMNgqM_B76VzXugyzHZt0QHaEB.webp"
                  alt="Neon"
                  width={80}
                  height={40}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Column */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-[#CD7F32] text-white rounded-md font-semibold mb-4">
              Deployment
            </div>
          </div>

          <div className="space-y-3">
            {/* Build */}
            <div className="flex items-center justify-center">
              <div className="bg-muted border rounded-lg p-4 w-full text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <p className="text-xs font-mono">Build Process</p>
                <p className="text-xs text-muted-foreground mt-1">Optimization</p>
              </div>
            </div>

            {/* Docker */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-3 w-24 h-24 flex items-center justify-center">
                <div className="text-4xl">🐳</div>
              </div>
            </div>

            {/* Node.js Runtime */}
            <div className="flex justify-center">
              <div className="bg-background border rounded-lg p-3 w-24 h-24 flex items-center justify-center">
                <div className="text-4xl">🟢</div>
              </div>
            </div>

            {/* Vercel/Server */}
            <div className="flex items-center justify-center">
              <div className="bg-muted border rounded-lg p-4 w-full text-center">
                <div className="text-2xl mb-2">☁️</div>
                <p className="text-xs font-mono">Production</p>
                <p className="text-xs text-muted-foreground mt-1">Vercel / VPS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Arrows */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" style={{ position: "absolute", top: 0, left: 0 }}>
          {/* Arrow from Frontend to Backend */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              className="fill-[#CD7F32]"
            >
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>
          <line
            x1="33%"
            y1="50%"
            x2="40%"
            y2="50%"
            stroke="#CD7F32"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            className="hidden md:block"
          />
          <line
            x1="60%"
            y1="50%"
            x2="67%"
            y2="50%"
            stroke="#CD7F32"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            className="hidden md:block"
          />
        </svg>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>Powered by Next.js 16 • Prisma • Neon • Better Auth</p>
      </div>
    </div>
  )
}
