import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, AlertTriangle, Code, Database, Shield, Cloud } from "lucide-react"

export default function ConfigurationPage() {
  return (
    <div className="container py-12 md:py-24">
      <div className="mx-auto max-w-3xl text-center mb-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">NeoSaaS Configuration</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Technical guidelines and best practices for configuring and deploying NeoSaaS
        </p>
      </div>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        {/* Environment Configuration */}
        <TabsContent value="environment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5 text-[#CD7F32]" /> Environment Configuration
              </CardTitle>
              <CardDescription>Essential environment variables and configuration settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-[#1A1A1A] text-white p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Required Environment Variables</h3>
                  <div className="font-mono text-sm space-y-2">
                    <p>
                      <span className="text-[#CD7F32]">DATABASE_URL</span>
                      =postgresql://user:password@localhost:5432/neosaas
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">JWT_SECRET</span>=your-secure-jwt-secret-key
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">NEXTAUTH_URL</span>=http://localhost:3000
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">NEXTAUTH_SECRET</span>=your-nextauth-secret
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">STRIPE_API_KEY</span>=sk_test_...
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">STRIPE_WEBHOOK_SECRET</span>=whsec_...
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">AWS_S3_BUCKET</span>=your-bucket-name
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">AWS_ACCESS_KEY_ID</span>=your-access-key
                    </p>
                    <p>
                      <span className="text-[#CD7F32]">AWS_SECRET_ACCESS_KEY</span>=your-secret-key
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Development Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use .env.local for local development</span>
                          <p className="text-sm text-muted-foreground">
                            Keep sensitive information out of version control
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use .env.example as a template</span>
                          <p className="text-sm text-muted-foreground">
                            Provide an example file with dummy values for team onboarding
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Prefix client-side variables</span>
                          <p className="text-sm text-muted-foreground">
                            Use NEXT_PUBLIC_ prefix for variables needed on the client
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Production Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use environment variable management</span>
                          <p className="text-sm text-muted-foreground">
                            Use Vercel, AWS Parameter Store, or similar for production
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Rotate secrets regularly</span>
                          <p className="text-sm text-muted-foreground">
                            Implement a process for rotating API keys and secrets
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="mr-2 h-4 w-4 mt-1 text-amber-500" />
                        <div>
                          <span className="font-medium">Never hardcode secrets</span>
                          <p className="text-sm text-muted-foreground">
                            Always use environment variables for sensitive information
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Configuration */}
        <TabsContent value="database" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-[#CD7F32]" /> Database Configuration
              </CardTitle>
              <CardDescription>PostgreSQL setup and optimization guidelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Schema Design Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use UUID as primary keys</span>
                          <p className="text-sm text-muted-foreground">
                            Prevents sequential ID guessing and improves security
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Implement proper indexing</span>
                          <p className="text-sm text-muted-foreground">
                            Index columns used in WHERE, JOIN, and ORDER BY clauses
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use foreign key constraints</span>
                          <p className="text-sm text-muted-foreground">
                            Maintain referential integrity between related tables
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Migration Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Version all migrations</span>
                          <p className="text-sm text-muted-foreground">
                            Use sequential versioning for database migrations
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Make migrations reversible</span>
                          <p className="text-sm text-muted-foreground">
                            Include both up and down migrations for rollback capability
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="mr-2 h-4 w-4 mt-1 text-amber-500" />
                        <div>
                          <span className="font-medium">Backup before migrations</span>
                          <p className="text-sm text-muted-foreground">
                            Always create a backup before applying migrations to production
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] text-white p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Connection Pool Configuration</h3>
                  <div className="font-mono text-sm space-y-2">
                    <p>
                      <span className="text-[#CD7F32]">// Prisma connection pool example</span>
                    </p>
                    <p>datasource db {"{"}</p>
                    <p>
                      {" "}
                      provider = <span className="text-green-400">"postgresql"</span>
                    </p>
                    <p>
                      {" "}
                      url = env(<span className="text-green-400">"DATABASE_URL"</span>)
                    </p>
                    <p>
                      {" "}
                      directUrl = env(<span className="text-green-400">"DIRECT_URL"</span>)
                    </p>
                    <p>
                      {" "}
                      relationMode = <span className="text-green-400">"prisma"</span>
                    </p>
                    <p> pooled = true</p>
                    <p>{"}"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Configuration */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-[#CD7F32]" /> Security Configuration
              </CardTitle>
              <CardDescription>Security best practices and configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Authentication Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use secure password hashing</span>
                          <p className="text-sm text-muted-foreground">
                            Implement bcrypt or Argon2 for password storage
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Implement MFA</span>
                          <p className="text-sm text-muted-foreground">
                            Support multi-factor authentication for sensitive operations
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use short-lived JWTs</span>
                          <p className="text-sm text-muted-foreground">
                            Set reasonable expiration times for authentication tokens
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">API Security Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Implement rate limiting</span>
                          <p className="text-sm text-muted-foreground">
                            Protect APIs from abuse with appropriate rate limits
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Validate all inputs</span>
                          <p className="text-sm text-muted-foreground">
                            Use Zod or similar for robust input validation
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="mr-2 h-4 w-4 mt-1 text-amber-500" />
                        <div>
                          <span className="font-medium">Never trust client data</span>
                          <p className="text-sm text-muted-foreground">
                            Always validate and sanitize data on the server
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] text-white p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Security Headers</h3>
                  <div className="font-mono text-sm space-y-2">
                    <p>
                      <span className="text-[#CD7F32]">// next.config.js security headers</span>
                    </p>
                    <p>const securityHeaders = [</p>
                    <p> {"{"}</p>
                    <p>
                      {" "}
                      key: <span className="text-green-400">'X-DNS-Prefetch-Control'</span>,
                    </p>
                    <p>
                      {" "}
                      value: <span className="text-green-400">'on'</span>
                    </p>
                    <p> {"}"},</p>
                    <p> {"{"}</p>
                    <p>
                      {" "}
                      key: <span className="text-green-400">'Strict-Transport-Security'</span>,
                    </p>
                    <p>
                      {" "}
                      value: <span className="text-green-400">'max-age=63072000; includeSubDomains; preload'</span>
                    </p>
                    <p> {"}"},</p>
                    <p> {"{"}</p>
                    <p>
                      {" "}
                      key: <span className="text-green-400">'X-Content-Type-Options'</span>,
                    </p>
                    <p>
                      {" "}
                      value: <span className="text-green-400">'nosniff'</span>
                    </p>
                    <p> {"}"},</p>
                    <p> {"{"}</p>
                    <p>
                      {" "}
                      key: <span className="text-green-400">'Content-Security-Policy'</span>,
                    </p>
                    <p>
                      {" "}
                      value: <span className="text-green-400">"default-src 'self';"</span>
                    </p>
                    <p> {"}"}</p>
                    <p>]</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployment Configuration */}
        <TabsContent value="deployment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cloud className="mr-2 h-5 w-5 text-[#CD7F32]" /> Deployment Configuration
              </CardTitle>
              <CardDescription>Deployment strategies and infrastructure setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-4">CI/CD Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Automate testing</span>
                          <p className="text-sm text-muted-foreground">
                            Run unit and integration tests before deployment
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use staging environments</span>
                          <p className="text-sm text-muted-foreground">
                            Test changes in a production-like environment before release
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Implement feature flags</span>
                          <p className="text-sm text-muted-foreground">
                            Use feature flags to safely roll out new features
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Infrastructure Rules</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Use infrastructure as code</span>
                          <p className="text-sm text-muted-foreground">
                            Define infrastructure with Terraform or similar tools
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Check className="mr-2 h-4 w-4 mt-1 text-[#CD7F32]" />
                        <div>
                          <span className="font-medium">Implement monitoring</span>
                          <p className="text-sm text-muted-foreground">Set up comprehensive monitoring and alerting</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <AlertTriangle className="mr-2 h-4 w-4 mt-1 text-amber-500" />
                        <div>
                          <span className="font-medium">Plan for disaster recovery</span>
                          <p className="text-sm text-muted-foreground">
                            Implement and test backup and recovery procedures
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] text-white p-6 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Recommended Tech Stack</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[#CD7F32] font-medium mb-2">Frontend</h4>
                      <ul className="space-y-1 text-sm">
                        <li>Next.js 14+</li>
                        <li>React 18+</li>
                        <li>TypeScript 5+</li>
                        <li>Tailwind CSS</li>
                        <li>shadcn/ui components</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[#CD7F32] font-medium mb-2">Backend</h4>
                      <ul className="space-y-1 text-sm">
                        <li>Node.js 18+</li>
                        <li>PostgreSQL 15+</li>
                        <li>Prisma ORM</li>
                        <li>NextAuth.js</li>
                        <li>tRPC (optional)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[#CD7F32] font-medium mb-2">Infrastructure</h4>
                      <ul className="space-y-1 text-sm">
                        <li>Vercel/Netlify</li>
                        <li>Neon/Supabase (Database)</li>
                        <li>AWS S3 (Storage)</li>
                        <li>Stripe (Payments)</li>
                        <li>Resend (Email)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[#CD7F32] font-medium mb-2">DevOps</h4>
                      <ul className="space-y-1 text-sm">
                        <li>GitHub Actions</li>
                        <li>Docker</li>
                        <li>Terraform</li>
                        <li>Datadog/New Relic</li>
                        <li>Sentry (Error tracking)</li>
                      </ul>
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
