import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, Database, Code, Server, Layers } from "lucide-react"

export const metadata = {
  title: "Architecture | NeoSaaS Documentation",
  description: "Understand the NeoSaaS architecture and how components work together",
}

export default function ArchitecturePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Badge variant="outline">Technical Overview</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Architecture du Système</h1>
        <p className="text-lg text-muted-foreground">
          NeoSaaS suit une architecture modulaire qui sépare clairement le frontend, le backend et la base de données.
          Découvrez comment les composants interagissent ensemble.
        </p>
      </div>

      {/* System Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Diagramme du Système
          </CardTitle>
          <CardDescription>Vue d'ensemble de l'architecture technique de NeoSaaS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
            <Image
              src="/images/design-mode/tech-stack.png"
              alt="NeoSaaS Technical Architecture Diagram"
              fill
              className="object-contain p-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Prérequis</AlertTitle>
        <AlertDescription>
          NeoSaaS nécessite <strong>Next.js 16+</strong> et <strong>Tailwind CSS</strong> pour fonctionner correctement.
        </AlertDescription>
      </Alert>

      {/* Main Components */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Composants Principaux</h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Client Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Couche Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Interface utilisateur construite avec React et Next.js 16</p>
              <ul className="space-y-1 text-sm">
                <li>• Pages et composants React</li>
                <li>• Gestion de l'état client</li>
                <li>• Routing Next.js App Router</li>
                <li>• UI avec Tailwind CSS</li>
              </ul>
            </CardContent>
          </Card>

          {/* Backend Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Backend / API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Logique métier et routes API Next.js</p>
              <ul className="space-y-1 text-sm">
                <li>• API Routes Next.js</li>
                <li>• Server Actions</li>
                <li>• Middleware d'authentification</li>
                <li>• Validation des données</li>
              </ul>
            </CardContent>
          </Card>

          {/* Database Layer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de Données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">PostgreSQL avec Prisma ORM</p>
              <ul className="space-y-1 text-sm">
                <li>• Prisma ORM intégré</li>
                <li>• Migrations automatiques</li>
                <li>• Support Neon ou local</li>
                <li>• Type-safe queries</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Database Configuration */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Configuration de la Base de Données</h2>

        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Base de données PostgreSQL requise</AlertTitle>
          <AlertDescription>
            NeoSaaS utilise Prisma ORM pour interagir avec PostgreSQL. Vous devez configurer une base de données externe
            (Neon) ou locale.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Option 1: Neon */}
          <Card>
            <CardHeader>
              <CardTitle>Option 1: Utiliser Neon</CardTitle>
              <CardDescription>Service PostgreSQL cloud (recommandé)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2 text-sm">
                <li>
                  <strong>1. Créer un compte</strong>
                  <p className="text-muted-foreground">
                    Allez sur{" "}
                    <Link href="https://neon.tech" className="text-primary hover:underline" target="_blank">
                      neon.tech
                    </Link>{" "}
                    et créez un compte gratuit
                  </p>
                </li>
                <li>
                  <strong>2. Créer une base de données</strong>
                  <p className="text-muted-foreground">
                    Suivez les instructions pour créer un nouveau projet PostgreSQL
                  </p>
                </li>
                <li>
                  <strong>3. Récupérer l'URL de connexion</strong>
                  <p className="text-muted-foreground">Copiez la connection string fournie par Neon</p>
                </li>
                <li>
                  <strong>4. Configurer l'environnement</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">DATABASE_URL="postgresql://user:password@host:port/database"</code>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Option 2: Local PostgreSQL */}
          <Card>
            <CardHeader>
              <CardTitle>Option 2: PostgreSQL Local</CardTitle>
              <CardDescription>Installation locale sur votre machine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-2 text-sm">
                <li>
                  <strong>1. Installer PostgreSQL</strong>
                  <p className="text-muted-foreground">
                    Téléchargez et installez PostgreSQL depuis{" "}
                    <Link href="https://postgresql.org" className="text-primary hover:underline" target="_blank">
                      postgresql.org
                    </Link>
                  </p>
                </li>
                <li>
                  <strong>2. Créer une base de données</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">createdb neosaas</code>
                  </div>
                </li>
                <li>
                  <strong>3. Configurer l'URL de connexion</strong>
                  <div className="mt-2 rounded-md bg-muted p-3">
                    <code className="text-xs">DATABASE_URL="postgresql://user:password@localhost:5432/neosaas"</code>
                  </div>
                </li>
                <li>
                  <strong>4. Lancer les migrations</strong>
                  <p className="text-muted-foreground">Voir la section suivante pour les commandes Prisma</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prisma Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Prisma</CardTitle>
          <CardDescription>
            Prisma ORM est intégré dans NeoSaaS. Il suffit de lancer les commandes nécessaires.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Étapes d'installation</h4>
            <ol className="space-y-3 text-sm">
              <li>
                <strong>1. Installer les dépendances</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npm install</code>
                </div>
              </li>
              <li>
                <strong>2. Générer le client Prisma</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma generate</code>
                </div>
              </li>
              <li>
                <strong>3. Lancer les migrations</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma migrate deploy</code>
                </div>
              </li>
              <li>
                <strong>4. (Optionnel) Seed la base de données</strong>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <code className="text-xs">npx prisma db seed</code>
                </div>
              </li>
            </ol>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Astuce</AlertTitle>
            <AlertDescription>
              Utilisez <code className="text-xs">npx prisma studio</code> pour visualiser et gérer vos données via une
              interface web.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Deployment Architecture */}
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Architecture de Déploiement</h2>

        <Card>
          <CardHeader>
            <CardTitle>Déploiement sur Vercel</CardTitle>
            <CardDescription>NeoSaaS est optimisé pour Vercel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              L'architecture de NeoSaaS est conçue pour être déployée facilement sur Vercel avec les fonctionnalités
              suivantes:
            </p>
            <ul className="space-y-2 text-sm">
              <li>• Déploiement automatique depuis GitHub</li>
              <li>• Variables d'environnement sécurisées</li>
              <li>• Edge Functions pour les performances</li>
              <li>• CDN global pour les assets statiques</li>
              <li>• Preview deployments pour chaque commit</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Prochaines Étapes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Maintenant que vous comprenez l'architecture, voici ce que vous pouvez faire:
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/docs/download"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Télécharger NeoSaaS depuis GitHub
            </Link>
            <Link
              href="/docs/installation"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Guide d'installation complet
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              → Retour à l'introduction
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
