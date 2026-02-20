import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, AlertTriangle, ArrowLeft, ArrowRight, Copy } from "lucide-react"

export const metadata = {
  title: "Installation",
  description: "Learn how to install and set up NeoSaaS for your project. Step-by-step installation guide with prerequisites and configuration.",
  keywords: ["installation", "setup", "configure", "deploy", "getting started"],
}

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
              className="text-brand hover:underline font-medium"
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
                <Button className="bg-brand hover:bg-brand/90">Download ZIP</Button>
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
            This will install Next.js 16, Tailwind CSS, Drizzle ORM, and all other dependencies defined in package.json.
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
          <p>Configurez vos variables d'environnement, notamment la DATABASE_URL (depuis Neon, Scaleway ou PostgreSQL local) :</p>
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Configuration automatique</AlertTitle>
            <AlertDescription>
              Une fois vos variables d'environnement configurées, le processus de déploiement s'occupe automatiquement de 
              l'installation et de la configuration de la base de données. Aucune manipulation manuelle n'est nécessaire !
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 4: Déployez votre application</h2>
          <p>Une fois vos variables d'environnement configurées, déployez simplement votre application. Le système s'occupe de tout :</p>
          
          <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
            <li>Installation automatique de la base de données</li>
            <li>Création des tables et schémas nécessaires</li>
            <li>Configuration de l'environnement de production</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-4">
            Le site sera accessible dès que le déploiement sera terminé. Aucune commande de migration manuelle n'est requise !
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 5: Créez votre premier utilisateur administrateur</h2>
          <p>Lors de votre première connexion, utilisez les identifiants par défaut :</p>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Email :</span>
              <code className="bg-background px-2 py-1 rounded">admin@exemple.com</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Mot de passe :</span>
              <code className="bg-background px-2 py-1 rounded">admin</code>
            </div>
          </div>

          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important : Sécurité</AlertTitle>
            <AlertDescription>
              Pour des raisons de sécurité, pensez à modifier ces identifiants par défaut dès votre première connexion !
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 6: Accédez au Dashboard</h2>
          <p>
            Une fois connecté avec vos identifiants administrateur, vous pouvez accéder au dashboard pour développer 
            et gérer les services de votre projet :
          </p>
          
          <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
            <li>Gestion des utilisateurs et des rôles</li>
            <li>Configuration des services et intégrations</li>
            <li>Tableau de bord analytique</li>
            <li>Gestion du contenu et des produits</li>
            <li>Configuration des paiements et abonnements</li>
          </ul>

          <p className="text-sm text-muted-foreground mt-4">
            Le dashboard est votre interface centrale pour développer et gérer tous les aspects de votre application SaaS.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Step 7: Développement local (optionnel)</h2>
          <p>Pour le développement en local, démarrez le serveur de développement Next.js :</p>
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
            Votre application sera disponible à l'adresse{" "}
            <code className="bg-muted px-2 py-1 rounded">http://localhost:3000</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Accédez au dashboard administrateur à{" "}
            <code className="bg-muted px-2 py-1 rounded">http://localhost:3000/dashboard</code>
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Prochaines étapes</AlertTitle>
          <AlertDescription>
            Félicitations ! Votre installation NeoSaaS est terminée. Une fois connecté avec vos identifiants 
            administrateur (<strong>admin@exemple.com</strong> / <strong>admin</strong>), vous pouvez commencer 
            à développer les services de votre projet directement depuis le dashboard. Consultez la{" "}
            <Link href="/docs/architecture" className="text-brand hover:underline">
              documentation d'architecture
            </Link>{" "}
            pour comprendre la structure de l'application.
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
