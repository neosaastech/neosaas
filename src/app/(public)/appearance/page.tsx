import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Palette } from "lucide-react"

export default function AppearancePage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Customize Your Experience</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          NeoSaaS offers flexible appearance options to match your brand and preferences.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-4xl">
        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="customization">Customization</TabsTrigger>
            <TabsTrigger value="white-label">White Labeling</TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-4">
                  <div className="h-32 rounded-md bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  <CardTitle className="mt-4">Modern Theme</CardTitle>
                  <CardDescription>Clean, modern interface with vibrant colors</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Responsive design</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Light & dark mode</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Accessible UI</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Preview</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="h-32 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600"></div>
                  <CardTitle className="mt-4">Enterprise Theme</CardTitle>
                  <CardDescription>Professional design for business applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Responsive design</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Light & dark mode</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Data-dense layouts</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Preview</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <div className="h-32 rounded-md bg-gradient-to-br from-amber-500 to-orange-600"></div>
                  <CardTitle className="mt-4">Minimal Theme</CardTitle>
                  <CardDescription>Simple, clean interface with minimal distractions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Responsive design</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Light & dark mode</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Focus on content</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Preview</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customization" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="mr-2 h-5 w-5" />
                  Brand Customization
                </CardTitle>
                <CardDescription>
                  Customize the appearance of your NeoSaaS instance to match your brand identity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Color Schemes</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize primary, secondary, and accent colors to match your brand.
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="h-10 rounded-md bg-blue-500"></div>
                      <div className="h-10 rounded-md bg-green-500"></div>
                      <div className="h-10 rounded-md bg-purple-500"></div>
                      <div className="h-10 rounded-md bg-amber-500"></div>
                      <div className="h-10 rounded-md bg-rose-500"></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Logo & Branding</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your company logo and customize the login and dashboard experience.
                    </p>
                    <div className="flex items-center justify-center h-32 rounded-md border-2 border-dashed border-muted-foreground/25 p-4">
                      <p className="text-sm text-muted-foreground">Drag and drop your logo here or click to browse</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">Typography</h3>
                    <p className="text-sm text-muted-foreground mb-4">Choose fonts that match your brand identity.</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-md border p-3">
                        <p className="font-sans text-lg font-bold">Inter</p>
                        <p className="text-sm text-muted-foreground">Modern, clean sans-serif</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="font-serif text-lg font-bold">Merriweather</p>
                        <p className="text-sm text-muted-foreground">Classic serif font</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="font-mono text-lg font-bold">Roboto Mono</p>
                        <p className="text-sm text-muted-foreground">Monospace for code</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto">Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="white-label" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>White Label Solutions</CardTitle>
                <CardDescription>Completely rebrand NeoSaaS as your own product for your customers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="rounded-md bg-muted p-4">
                    <h3 className="font-medium">Enterprise Feature</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      White labeling is available on our Enterprise plan. Contact sales for more information.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium">White Label Features</h3>
                    <ul className="mt-4 space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-primary" />
                        <div>
                          <span className="font-medium">Custom Domain</span>
                          <p className="text-sm text-muted-foreground">Use your own domain for the application</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-primary" />
                        <div>
                          <span className="font-medium">Remove NeoSaaS Branding</span>
                          <p className="text-sm text-muted-foreground">No mention of NeoSaaS anywhere in the UI</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-primary" />
                        <div>
                          <span className="font-medium">Custom Email Templates</span>
                          <p className="text-sm text-muted-foreground">
                            All emails sent from your domain with your branding
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-primary" />
                        <div>
                          <span className="font-medium">Custom Terms & Privacy Policy</span>
                          <p className="text-sm text-muted-foreground">Use your own legal documents</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Contact Sales</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
