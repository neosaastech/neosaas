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
            <li>npm 8.0 or higher, or yarn 1.22 or higher</li>
            <li>A database (PostgreSQL, MySQL, or MongoDB)</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Installation Options</h2>
          <p>
            You can install NeoSaaS using npm, yarn, or by cloning the repository directly. Choose the method that works
            best for your workflow.
          </p>

          <Tabs defaultValue="npm" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="npm">npm</TabsTrigger>
              <TabsTrigger value="yarn">yarn</TabsTrigger>
              <TabsTrigger value="git">Git</TabsTrigger>
            </TabsList>
            <TabsContent value="npm" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>npm install neosaas</code>
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
              <p>Then, initialize your project:</p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>npx neosaas init</code>
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
            <TabsContent value="yarn" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>yarn add neosaas</code>
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
              <p>Then, initialize your project:</p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>yarn neosaas init</code>
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
            <TabsContent value="git" className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>git clone https://github.com/neosaas/neosaas.git</code>
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
              <p>Then, navigate to the directory and install dependencies:</p>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                  <code>cd neosaas && npm install</code>
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
          </Tabs>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>
            For production environments, we recommend using a specific version number instead of the latest version to
            ensure consistency across deployments.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Configuration</h2>
          <p>
            After installation, you'll need to configure your environment variables. Create a <code>.env</code> file in
            the root of your project with the following variables:
          </p>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              <code>
                DATABASE_URL=postgresql://username:password@localhost:5432/neosaas
                <br />
                JWT_SECRET=your-secret-key
                <br />
                STRIPE_SECRET_KEY=sk_test_your_stripe_key
                <br />
                SMTP_HOST=smtp.example.com
                <br />
                SMTP_PORT=587
                <br />
                SMTP_USER=your-smtp-username
                <br />
                SMTP_PASSWORD=your-smtp-password
              </code>
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

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Never commit your <code>.env</code> file to version control. Add it to your <code>.gitignore</code> file to
            prevent accidentally exposing sensitive information.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Running the Application</h2>
          <p>Once you've configured your environment variables, you can start the application:</p>
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
            This will start the development server at <code>http://localhost:3000</code>. You can access the admin
            dashboard at <code>http://localhost:3000/dashboard</code>.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Next Steps</h2>
          <p>Now that you have NeoSaaS installed and running, you can:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Link href="/docs/configuration" className="text-[#CD7F32] hover:underline">
                Configure your application settings
              </Link>
            </li>
            <li>
              <Link href="/docs/core-concepts/user-management" className="text-[#CD7F32] hover:underline">
                Set up user management
              </Link>
            </li>
            <li>
              <Link href="/docs/core-concepts/billing" className="text-[#CD7F32] hover:underline">
                Configure billing and subscriptions
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Link href="/docs">
            <Button variant="outline" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Introduction
            </Button>
          </Link>
          <Link href="/docs/configuration">
            <Button variant="outline" className="gap-1">
              Configuration <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
