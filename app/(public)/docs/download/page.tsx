import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ArrowLeft, Download, Github, ExternalLink } from "lucide-react"

export default function DownloadPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">Download NeoSaaS from GitHub</h1>
        <p className="text-lg text-muted-foreground">
          Get the latest version of NeoSaaS directly from our GitHub repository
        </p>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Link href="/docs" className="text-muted-foreground hover:text-foreground">
          Documentation
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>Download from GitHub</span>
      </div>

      <div className="space-y-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Latest Version</AlertTitle>
          <AlertDescription>
            Always download the latest version from GitHub to ensure you have the most recent features, security
            updates, and bug fixes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Prerequisites</h2>
          <p>Before downloading, ensure you have:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Next.js 16+</li>
            <li>Tailwind CSS configured in your project</li>
            <li>Git installed on your system</li>
          </ul>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Clone from GitHub</CardTitle>
            </div>
            <CardDescription>Clone the repository to get started with NeoSaaS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>git clone https://github.com/neosaas/neosaas.git</code>
              </pre>
            </div>
            <p className="text-sm text-muted-foreground">
              After cloning, navigate to the directory and install dependencies:
            </p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>
                  cd neosaas
                  <br />
                  npm install
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>Download ZIP</CardTitle>
            </div>
            <CardDescription>Download the repository as a ZIP file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              If you prefer not to use Git, you can download the repository as a ZIP file directly from GitHub.
            </p>
            <Button className="gap-2 bg-[#CD7F32] hover:bg-[#CD7F32]/90" asChild>
              <a href="https://github.com/neosaas/neosaas/archive/refs/heads/main.zip" download>
                <Download className="h-4 w-4" />
                Download Latest Version
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-[#CD7F32]" />
              <CardTitle>View on GitHub</CardTitle>
            </div>
            <CardDescription>Explore the source code, releases, and documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              Visit our GitHub repository to view the source code, check releases, report issues, and contribute to the
              project.
            </p>
            <Button variant="outline" className="gap-2 border-[#CD7F32] text-[#CD7F32] bg-transparent" asChild>
              <a href="https://github.com/neosaas/neosaas" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                Visit GitHub Repository
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Next Steps</h2>
          <p>After downloading NeoSaaS:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Configure your environment variables</li>
            <li>Run the development server with npm run dev</li>
            <li>Start building your SaaS application</li>
          </ol>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Link href="/docs/installation">
            <Button variant="outline" className="gap-1 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Installation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
