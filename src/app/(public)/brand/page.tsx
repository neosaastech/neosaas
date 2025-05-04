import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function BrandPage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">NeoSaaS Brand Guidelines</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Our brand identity reflects our values of innovation, elegance, and reliability.
        </p>
      </div>

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="elements">Elements</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        {/* Logo Section */}
        <TabsContent value="logo" className="mt-6">
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Primary Logo</CardTitle>
                <CardDescription>The main logo should be used whenever possible</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center p-8 bg-[#1A1A1A] rounded-b-lg">
                <div className="relative w-48 h-48">
                  <Image src="/images/logo_neolux.svg" alt="NeoSaaS Logo" fill className="object-contain" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Logo Variations</CardTitle>
                <CardDescription>Alternative versions for different backgrounds</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-2">
                    <Image src="/images/logo_neolux.svg" alt="NeoSaaS Logo Dark" fill className="object-contain" />
                  </div>
                  <span className="text-sm text-muted-foreground">Dark Background</span>
                </div>
                <div className="flex flex-col items-center bg-[#1A1A1A] p-4 rounded-lg">
                  <div className="relative w-32 h-32 mb-2">
                    <Image
                      src="/images/logo_neolux_transparent.png"
                      alt="NeoSaaS Logo Light"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-sm text-white/70">Light Background</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Logo Usage Guidelines</CardTitle>
                <CardDescription>Rules for proper logo implementation</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <h3 className="font-medium">Minimum Size</h3>
                  <div className="relative w-16 h-16 border border-dashed border-muted-foreground p-2 flex items-center justify-center">
                    <Image src="/images/logo_neolux.svg" alt="Minimum Size" width={40} height={40} />
                  </div>
                  <p className="text-sm text-muted-foreground">Minimum 40px width for digital use</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Clear Space</h3>
                  <div className="relative w-24 h-24 border border-dashed border-muted-foreground p-4 flex items-center justify-center">
                    <div className="relative w-12 h-12">
                      <Image src="/images/logo_neolux.svg" alt="Clear Space" fill className="object-contain" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Maintain clear space equal to 25% of logo width</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Incorrect Usage</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative w-10 h-10 border border-red-500 rounded-full flex items-center justify-center">
                      <div className="relative w-6 h-6 transform rotate-45">
                        <Image src="/images/logo_neolux.svg" alt="Don't Rotate" fill className="object-contain" />
                      </div>
                    </div>
                    <div className="relative w-10 h-10 border border-red-500 rounded-full flex items-center justify-center bg-red-100">
                      <div className="relative w-6 h-6">
                        <Image
                          src="/images/logo_neolux.svg"
                          alt="Don't Use Incorrect Background"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Don't rotate, distort, or use on clashing backgrounds</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Colors Section */}
        <TabsContent value="colors" className="mt-6">
          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Primary Colors</CardTitle>
                <CardDescription>Main brand colors to be used across all materials</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <div className="h-24 rounded-lg bg-[#000000] flex items-end p-3">
                    <div className="text-white text-sm">
                      <p className="font-medium">Black</p>
                      <p>#000000</p>
                      <p>RGB: 0, 0, 0</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Used for background elements and main texts</p>
                </div>

                <div className="space-y-3">
                  <div className="h-24 rounded-lg bg-[#CD7F32] flex items-end p-3">
                    <div className="text-white text-sm">
                      <p className="font-medium">Gold</p>
                      <p>#CD7F32</p>
                      <p>RGB: 205, 127, 50</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Used for accent elements, icons, and details</p>
                </div>

                <div className="space-y-3">
                  <div className="h-24 rounded-lg bg-[#1A1A1A] flex items-end p-3">
                    <div className="text-white text-sm">
                      <p className="font-medium">Gradient Black</p>
                      <p>#1A1A1A</p>
                      <p>RGB: 26, 26, 26</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Used for subtle backgrounds</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color Usage</CardTitle>
                <CardDescription>Examples of color application in UI elements</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Buttons</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">Primary Button</Button>
                    <Button variant="outline" className="border-[#CD7F32] text-[#CD7F32] hover:bg-[#CD7F32]/10">
                      Secondary Button
                    </Button>
                    <Button variant="ghost" className="text-[#CD7F32] hover:bg-[#CD7F32]/10">
                      Ghost Button
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Text Colors</h3>
                  <div className="space-y-2">
                    <p className="text-[#000000] font-medium">Primary Text - Black (#000000)</p>
                    <p className="text-[#CD7F32] font-medium">Accent Text - Gold (#CD7F32)</p>
                    <p className="text-[#1A1A1A] font-medium">Secondary Text - Gradient Black (#1A1A1A)</p>
                    <p className="text-muted-foreground">Muted Text - For less important information</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Typography Section */}
        <TabsContent value="typography" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font families and usage guidelines</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Primary Font: Montserrat</h3>
                  <div className="space-y-3">
                    <div className="font-sans font-bold text-3xl">Heading 1</div>
                    <div className="font-sans font-bold text-2xl">Heading 2</div>
                    <div className="font-sans font-bold text-xl">Heading 3</div>
                    <div className="font-sans font-medium text-lg">Subheading</div>
                    <div className="font-sans text-base">Body text - The quick brown fox jumps over the lazy dog.</div>
                    <div className="font-sans text-sm">Small text - The quick brown fox jumps over the lazy dog.</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Used for titles, subtitles, and body text</p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Secondary Font: Merriweather</h3>
                  <div className="space-y-3">
                    <div className="font-serif font-bold text-3xl">Heading 1</div>
                    <div className="font-serif font-bold text-2xl">Heading 2</div>
                    <div className="font-serif font-bold text-xl">Heading 3</div>
                    <div className="font-serif font-medium text-lg">Subheading</div>
                    <div className="font-serif text-base">Body text - The quick brown fox jumps over the lazy dog.</div>
                    <div className="font-serif text-sm">Small text - The quick brown fox jumps over the lazy dog.</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Used for quotes, accompanying texts, or decorative elements
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Typography Guidelines</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Hierarchy</h4>
                    <p className="text-sm text-muted-foreground">
                      Maintain clear hierarchy with font sizes and weights to guide the user's attention
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Line Height</h4>
                    <p className="text-sm text-muted-foreground">
                      Use 1.5x line height for body text and 1.2x for headings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Spacing</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow generous spacing between paragraphs for readability
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Graphic Elements Section */}
        <TabsContent value="elements" className="mt-6">
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shapes & Icons</CardTitle>
                <CardDescription>Geometric elements and iconography</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Shapes</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="w-16 h-16 bg-[#CD7F32]/20 border border-[#CD7F32]"></div>
                    <div className="w-16 h-16 bg-[#CD7F32]/20 border border-[#CD7F32] rounded-lg"></div>
                    <div className="w-16 h-16 bg-[#CD7F32]/20 border border-[#CD7F32] rounded-full"></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use squares and rectangles for frames, buttons, and icons
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Icons</h3>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 flex items-center justify-center text-[#CD7F32]">
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
                        >
                          <path d="M12 5v14"></path>
                          <path d="M5 12h14"></path>
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">Add</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 flex items-center justify-center text-[#CD7F32]">
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
                        >
                          <path d="M5 12h14"></path>
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">Remove</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 flex items-center justify-center text-[#CD7F32]">
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
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">Check</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use simple and clean icons, with a golden touch to highlight them
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Textures & Patterns</CardTitle>
                <CardDescription>Background elements and decorative patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Metallic Texture</h3>
                  <div className="h-32 rounded-lg bg-gradient-to-br from-[#CD7F32] via-[#E8C496] to-[#CD7F32]"></div>
                  <p className="text-sm text-muted-foreground">
                    Incorporate metallic or shiny textures to recall the gold of the logo
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Geometric Pattern</h3>
                  <div className="h-32 rounded-lg bg-[#1A1A1A] p-2 grid grid-cols-4 gap-2">
                    {Array(16)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="bg-[#CD7F32]/20 rounded-sm"></div>
                      ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use geometric patterns for backgrounds and decorative elements
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Examples Section */}
        <TabsContent value="examples" className="mt-6">
          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Application Examples</CardTitle>
                <CardDescription>How to apply the brand identity across different mediums</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-medium">Business Card</h3>
                  <div className="aspect-[1.75/1] rounded-lg bg-[#1A1A1A] p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10">
                        <Image src="/images/logo_neolux.svg" alt="NeoSaaS Logo" fill className="object-contain" />
                      </div>
                      <span className="text-white font-bold text-xl">NeoSaaS</span>
                    </div>
                    <div className="text-white/80 text-sm space-y-1">
                      <p className="font-medium">Sarah Johnson</p>
                      <p>Co-Founder & CEO</p>
                      <p>sarah@neosaas.com</p>
                      <p>+1 (555) 123-4567</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Website Header</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-[#1A1A1A] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8">
                          <Image src="/images/logo_neolux.svg" alt="NeoSaaS Logo" fill className="object-contain" />
                        </div>
                        <span className="text-white font-bold">NeoSaaS</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-white/80 text-sm">Features</span>
                        <span className="text-white/80 text-sm">Pricing</span>
                        <span className="text-white/80 text-sm">About</span>
                        <Button size="sm" className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
                          Sign Up
                        </Button>
                      </div>
                    </div>
                    <div className="p-8 flex flex-col items-center text-center">
                      <h2 className="text-2xl font-bold mb-2">Welcome to NeoSaaS</h2>
                      <p className="text-muted-foreground mb-4">The all-in-one platform for your business</p>
                      <Button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">Get Started</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <h3 className="font-medium">Social Media Banner</h3>
                  <div className="aspect-[2.5/1] rounded-lg bg-gradient-to-r from-[#1A1A1A] to-[#000000] p-8 flex items-center justify-between">
                    <div className="space-y-4 max-w-md">
                      <h2 className="text-white text-3xl font-bold">Transform Your Business with NeoSaaS</h2>
                      <p className="text-white/80">The most powerful SaaS platform for modern businesses</p>
                      <Button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">Learn More</Button>
                    </div>
                    <div className="relative w-32 h-32">
                      <Image src="/images/logo_neolux.svg" alt="NeoSaaS Logo" fill className="object-contain" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
