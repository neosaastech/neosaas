import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

export default function BrandPage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">NeoSaaS Brand Guidelines</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Our brand identity system helps maintain consistency across all touchpoints
        </p>
      </div>

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="elements">Elements</TabsTrigger>
          <TabsTrigger value="tech">Tech Stack</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        {/* Logo Tab */}
        <TabsContent value="logo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo Usage</CardTitle>
              <CardDescription>Guidelines for using the NeoSaaS logo across different mediums</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col items-center justify-center p-6 bg-[#1A1A1A] rounded-lg border">
                  <div className="w-48 h-48 relative mb-4">
                    <Image src="/images/logo_neolux.png" alt="NeoSaaS Logo" fill style={{ objectFit: "contain" }} />
                  </div>
                  <p className="text-sm text-gray-400 text-center">Primary Logo on Dark Background</p>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border">
                  <div className="w-48 h-48 relative mb-4">
                    <Image
                      src="/images/logo_neolux.png"
                      alt="NeoSaaS Logo on Light Background"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Logo on Light Background</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Logo Guidelines</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Maintain clear space around the logo equal to the height of the "N" in the logo</li>
                  <li>Do not stretch, compress, or distort the logo in any way</li>
                  <li>Do not change the colors of the logo</li>
                  <li>Minimum size: 24px height for digital, 0.25 inches for print</li>
                  <li>Use the transparent version on dark or colored backgrounds</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Official brand colors and their usage guidelines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-[#CD7F32]"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Primary Bronze</h3>
                    <p className="text-sm text-muted-foreground">#CD7F32</p>
                    <p className="text-xs mt-2">Used for primary actions, accents, and key highlights</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-[#1A1A1A]"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Deep Black</h3>
                    <p className="text-sm text-muted-foreground">#1A1A1A</p>
                    <p className="text-xs mt-2">Used for text, backgrounds, and UI elements</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-white border"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Pure White</h3>
                    <p className="text-sm text-muted-foreground">#FFFFFF</p>
                    <p className="text-xs mt-2">Used for backgrounds, text on dark colors</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-[#F5F5F5]"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Light Gray</h3>
                    <p className="text-sm text-muted-foreground">#F5F5F5</p>
                    <p className="text-xs mt-2">Used for backgrounds, cards, and subtle UI elements</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-[#6B7280]"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Medium Gray</h3>
                    <p className="text-sm text-muted-foreground">#6B7280</p>
                    <p className="text-xs mt-2">Used for secondary text and icons</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="h-24 rounded-t-lg bg-[#E5A667]"></div>
                  <div className="p-4 border border-t-0 rounded-b-lg">
                    <h3 className="font-medium">Secondary Bronze</h3>
                    <p className="text-sm text-muted-foreground">#E5A667</p>
                    <p className="text-xs mt-2">Used for hover states and secondary accents</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Color Usage Guidelines</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Primary Bronze should be used sparingly for emphasis and calls to action</li>
                  <li>Maintain sufficient contrast ratios for accessibility (minimum 4.5:1 for text)</li>
                  <li>Use the grayscale palette for most UI elements and backgrounds</li>
                  <li>Ensure color combinations meet WCAG 2.1 AA standards</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Typography System</CardTitle>
              <CardDescription>Font families, sizes, and typographic rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Primary Font: Inter</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-5xl font-bold">Aa</p>
                      <p className="text-sm text-muted-foreground mt-2">Inter Bold</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-2xl font-semibold">Heading Example</p>
                        <p className="text-sm text-muted-foreground mt-2">Inter Semi-Bold</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-base">
                          Body text example with <span className="font-medium">medium emphasis</span> and{" "}
                          <span className="font-bold">strong emphasis</span>.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">Inter Regular/Medium/Bold</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Secondary Font: Mono</h3>
                  <div className="p-4 border rounded-lg">
                    <p className="font-mono text-base">const code = "example";</p>
                    <p className="text-sm text-muted-foreground mt-2">Used for code snippets and technical content</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Typography Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Font Size Hierarchy</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li>Heading 1: 2.5rem (40px) / line-height: 1.2</li>
                        <li>Heading 2: 2rem (32px) / line-height: 1.2</li>
                        <li>Heading 3: 1.5rem (24px) / line-height: 1.3</li>
                        <li>Heading 4: 1.25rem (20px) / line-height: 1.4</li>
                        <li>Body: 1rem (16px) / line-height: 1.5</li>
                        <li>Small: 0.875rem (14px) / line-height: 1.5</li>
                        <li>XSmall: 0.75rem (12px) / line-height: 1.5</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Typographic Principles</h4>
                      <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li>Maintain a maximum line length of 70-80 characters</li>
                        <li>Use proper typographic hierarchy to guide users</li>
                        <li>Ensure sufficient contrast between text and background</li>
                        <li>Use consistent spacing between paragraphs (1.5× line height)</li>
                        <li>Avoid all-caps text except for small UI elements</li>
                        <li>Use font weights strategically (400 for body, 600 for subheadings, 700 for headings)</li>
                        <li>Maintain consistent alignment (typically left-aligned)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Elements Tab */}
        <TabsContent value="elements" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>UI Elements</CardTitle>
              <CardDescription>Design guidelines for common interface elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Buttons</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <button className="bg-[#CD7F32] text-white px-4 py-2 rounded-md">Primary Button</button>
                      <span className="text-sm text-muted-foreground">Primary Action</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="border border-[#CD7F32] text-[#CD7F32] px-4 py-2 rounded-md">
                        Secondary Button
                      </button>
                      <span className="text-sm text-muted-foreground">Secondary Action</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="text-[#CD7F32] px-4 py-2">Tertiary Button</button>
                      <span className="text-sm text-muted-foreground">Minor Action</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Form Elements</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Input Field</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Placeholder text"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="checkbox" />
                      <label htmlFor="checkbox" className="text-sm">
                        Checkbox Label
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Cards & Containers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Standard Card</h4>
                    <p className="text-sm text-muted-foreground mt-2">Used for content grouping</p>
                  </div>
                  <div className="p-4 border rounded-lg shadow-md">
                    <h4 className="font-medium">Elevated Card</h4>
                    <p className="text-sm text-muted-foreground mt-2">Used for important content</p>
                  </div>
                  <div className="p-4 bg-[#F5F5F5] rounded-lg">
                    <h4 className="font-medium">Filled Card</h4>
                    <p className="text-sm text-muted-foreground mt-2">Used for grouped content</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Element Guidelines</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Maintain consistent spacing between elements (8px grid system)</li>
                  <li>Use rounded corners (4px radius) for interactive elements</li>
                  <li>Apply subtle shadows for elevated elements</li>
                  <li>Ensure all interactive elements have appropriate hover and focus states</li>
                  <li>Maintain minimum touch target size of 44×44px for mobile interfaces</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tech Stack Tab */}
        <TabsContent value="tech" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
              <CardDescription>Core technologies and frameworks used in NeoSaaS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Frontend Technologies</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Next.js 14</h4>
                      <p className="text-sm text-muted-foreground mt-1">React framework with App Router</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>Server Components for improved performance</li>
                        <li>Server Actions for form handling</li>
                        <li>Streaming for progressive rendering</li>
                        <li>Route Handlers for API endpoints</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">UI Framework</h4>
                      <p className="text-sm text-muted-foreground mt-1">Component library and styling</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>Tailwind CSS for utility-first styling</li>
                        <li>shadcn/ui for accessible components</li>
                        <li>Radix UI for headless primitives</li>
                        <li>Lucide React for consistent iconography</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">State Management</h4>
                      <p className="text-sm text-muted-foreground mt-1">Client-side state handling</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>React Context for global state</li>
                        <li>React Query for server state</li>
                        <li>Zustand for complex state management</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Backend Technologies</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Database</h4>
                      <p className="text-sm text-muted-foreground mt-1">Data storage and management</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>PostgreSQL for relational data</li>
                        <li>Prisma ORM for type-safe database access</li>
                        <li>Neon for serverless PostgreSQL</li>
                        <li>Redis for caching (optional)</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Authentication</h4>
                      <p className="text-sm text-muted-foreground mt-1">User authentication and authorization</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>NextAuth.js for authentication</li>
                        <li>JWT for stateless sessions</li>
                        <li>Role-based access control</li>
                        <li>OAuth providers integration</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Infrastructure</h4>
                      <p className="text-sm text-muted-foreground mt-1">Hosting and deployment</p>
                      <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                        <li>Vercel for hosting and deployment</li>
                        <li>Edge Functions for global performance</li>
                        <li>AWS S3 for file storage</li>
                        <li>GitHub Actions for CI/CD</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-medium mb-4">Development Workflow</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium">Code Quality</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                      <li>TypeScript for type safety</li>
                      <li>ESLint for code linting</li>
                      <li>Prettier for code formatting</li>
                      <li>Husky for pre-commit hooks</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Testing</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                      <li>Vitest for unit testing</li>
                      <li>React Testing Library for component tests</li>
                      <li>Playwright for E2E testing</li>
                      <li>MSW for API mocking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Monitoring</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                      <li>Vercel Analytics for performance</li>
                      <li>Sentry for error tracking</li>
                      <li>LogRocket for session replay</li>
                      <li>OpenTelemetry for observability</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Modular Architecture</CardTitle>
              <CardDescription>NeoSaaS is built with a modular, extensible architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="relative h-[400px] w-full overflow-hidden rounded-md bg-black">
                <Image
                  src="/schema-neosaas-architecture.png"
                  alt="NeoSaaS Architecture Diagram"
                  fill
                  className="object-contain p-4"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Back Office Module</h3>
                  <p className="text-muted-foreground mt-2">
                    The back office module serves as the central hub of the NeoSaaS platform, connecting all other
                    modules through a jointed schema architecture. This design allows for:
                  </p>
                  <ul className="list-disc pl-5 mt-4 space-y-2">
                    <li>Centralized administration while maintaining module independence</li>
                    <li>Unified data management across disparate services</li>
                    <li>Consistent user experience for administrators</li>
                    <li>Scalable architecture where modules can be added or replaced</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Jointed Schema Benefits</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                      <li>Data consistency across modules</li>
                      <li>Reduced redundancy and duplication</li>
                      <li>Simplified API integration</li>
                      <li>Improved performance through optimized queries</li>
                      <li>Enhanced security with centralized authentication</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Module Independence</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                      <li>Each module can scale independently</li>
                      <li>Services can be upgraded without system-wide downtime</li>
                      <li>Specialized optimization for different workloads</li>
                      <li>Flexible deployment options (cloud, on-premise, hybrid)</li>
                      <li>Technology-agnostic implementation</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Integration Capabilities</h3>
                  <p className="text-muted-foreground mt-2">
                    The NeoSaaS architecture connects seamlessly with third-party services through standardized APIs:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        A
                      </div>
                      <span>Analytics via Plausible</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        E
                      </div>
                      <span>Email via Resend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        S
                      </div>
                      <span>Storage via AWS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        P
                      </div>
                      <span>Payments via multiple providers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        D
                      </div>
                      <span>Documentation via Starlight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-[#CD7F32] flex items-center justify-center text-white">
                        C
                      </div>
                      <span>Scheduled tasks via node-cron</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
