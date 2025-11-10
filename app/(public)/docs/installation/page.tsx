import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, AlertTriangle, ArrowLeft, ArrowRight, Copy } from "lucide-react"

export default function InstallationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">Installation</h1>
        <p className="text-lg text-muted-foreground">Learn how to install and set up NeoSaaS for your project</p>
      </div>

      <div className="flex items-center space-x-2 text-sm">
        <Link href="/docs" className="text-muted-foreground hover:text-foreground">
          Documentation
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>Installation</span>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Prerequisites</h2>
          <p>Before you begin, make sure you have the following installed:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Node.js 18.0 or higher</li>
            <li>npm 8.0 or higher (or yarn/pnpm)</li>
            <li>Git (for cloning the repository)</li>
          </ul>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Required Technologies</AlertTitle>
            <AlertDescription>
              NeoSaaS is built on Next.js 16+ and Tailwind CSS. These will be included when you download the project.
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 1: Download from GitHub</h2>
          <p>
            Download the latest version of NeoSaaS from the official GitHub repository at{" "}
            <a
              href="https://github.com/neosaastech/neosaas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#CD7F32] hover:underline font-medium"
            >
              https://github.com/neosaastech/neosaas
            </a>
          </p>

          <Tabs defaultValue="clone" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clone">Git Clone</TabsTrigger>
              <TabsTrigger value="download">Direct Download</TabsTrigger>
            </TabsList>
            <TabsContent value="clone" className="space-y-4">
              <p>Clone the repository using Git:</p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>git clone https://github.com/neosaastech/neosaas.git</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p>Then navigate to the project directory:</p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>cd neosaas</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Copy code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="download" className="space-y-4">
              <p>Download the ZIP file directly from GitHub and extract it to your desired location.</p>
              <Link href="https://github.com/neosaastech/neosaas/archive/refs/heads/main.zip">
                <Button className="bg-[#CD7F32] hover:bg-[#CD7F32]/90">Download ZIP</Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                After downloading, extract the files and navigate to the extracted folder in your terminal.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 2: Install Node Dependencies</h2>
          <p>Install all required Node.js packages using npm:</p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>npm install</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This will install Next.js 16, Tailwind CSS, Prisma, and all other dependencies defined in package.json.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 3: Configure Environment Variables</h2>
          <p>
            Create a <code className="bg-muted px-2 py-1 rounded">.env</code> file in the root of your project. You can
            copy the example file:
          </p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>cp .env.example .env</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p>Add your PostgreSQL database URL (from Neon or local PostgreSQL):</p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>DATABASE_URL="postgresql://username:password@localhost:5432/neosaas"</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 4: Set Up Prisma Database</h2>
          <p>NeoSaaS uses Prisma as the ORM. Follow these steps to set up your database:</p>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">4.1. Generate Prisma Client</h3>
            <p className="text-sm text-muted-foreground">Generate the Prisma Client based on your schema:</p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>npx prisma generate</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">4.2. Run Database Migrations</h3>
            <p className="text-sm text-muted-foreground">Push the database schema to your database (creates tables):</p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>npx prisma db push</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Or run migrations for production:</p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>npx prisma migrate deploy</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">4.3. (Optional) Seed the Database</h3>
            <p className="text-sm text-muted-foreground">If you want to populate your database with sample data:</p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>npx prisma db seed</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">4.4. Open Prisma Studio (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Prisma Studio provides a visual interface to view and edit your database:
            </p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>npx prisma studio</code>
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Copy code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will open Prisma Studio at <code className="bg-muted px-2 py-1 rounded">http://localhost:5555</code>
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important: Database URL</AlertTitle>
          <AlertDescription>
            Make sure your <code>DATABASE_URL</code> in the <code>.env</code> file is correctly configured before
            running Prisma commands. The URL should include your database credentials and connection string.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 5: Start the Development Server</h2>
          <p>Once everything is configured, start the Next.js development server:</p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>npm run dev</code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p>
            Your application will be available at{" "}
            <code className="bg-muted px-2 py-1 rounded">http://localhost:3000</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Access the admin dashboard at{" "}
            <code className="bg-muted px-2 py-1 rounded">http://localhost:3000/dashboard</code>
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Next Steps</AlertTitle>
          <AlertDescription>
            Congratulations! Your NeoSaaS installation is complete. Check out the{" "}
            <Link href="/docs/architecture" className="text-[#CD7F32] hover:underline">
              Architecture documentation
            </Link>{" "}
            to understand how the application is structured.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4 border-t">
          <Link href="/docs">
            <Button variant="outline" className="gap-1 bg-transparent">
              <ArrowLeft className="h-4 w-4" /> Introduction
            </Button>
          </Link>
          <Link href="/docs/download">
            <Button variant="outline" className="gap-1 bg-transparent">
              Download from GitHub <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
