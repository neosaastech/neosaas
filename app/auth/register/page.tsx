"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { CheckCircle, XCircle } from "lucide-react"

interface OAuthConfig {
  github: boolean;
  google: boolean;
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isGithubLoading, setIsGithubLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({ github: false, google: false });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  })
  const [isEmailValid, setIsEmailValid] = useState<boolean | null>(null)

  // Gérer les paramètres d'URL pour le pré-remplissage et les messages (ex: retour OAuth utilisateur inconnu)
  useEffect(() => {
    const error = searchParams.get("error");
    const email = searchParams.get("email");

    if (email) {
      console.log("Found email in params:", email);
      setFormData(prev => ({ ...prev, email }));
      setIsEmailValid(validateEmail(email));
    }

    if (error === "account_not_found") {
      // Petit délai pour s'assurer que l'UI est montée et le toast visible
      setTimeout(() => {
        toast("Account does not exist", {
          description: "No account found with this login. Please create an account to continue.",
          duration: 6000,
          action: {
            label: "Close",
            onClick: () => console.log("Toast closed"),
          },
        });
      }, 100);
    }
  }, [searchParams]);

  // Charger la configuration OAuth au montage du composant
  useEffect(() => {
    async function loadOAuthConfig() {
      try {
        const response = await fetch('/api/auth/oauth/config', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setOauthConfig({
            github: data.github || false,
            google: data.google || false,
          });
        }
      } catch (error) {
        console.error('Failed to load OAuth config:', error);
      }
    }
    loadOAuthConfig();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match")
        setIsLoading(false)
        return
      }

      // Validate terms accepted
      if (!formData.termsAccepted) {
        toast.error("You must accept the terms and conditions")
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Registration failed")
        return
      }

      // Show success message - user needs to verify email before logging in
      toast.success("Account created successfully!", {
        description: "Please check your email to verify your account before logging in.",
        duration: 10000, // Show for 10 seconds
      })

      // Redirect to login page with success message
      router.push("/auth/login?registered=true")
    } catch (error) {
      toast.error("An error occurred during registration")
      console.error("Registration error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.id]: value,
    })

    if (e.target.id === "email") {
      setIsEmailValid(value ? validateEmail(value as string) : null)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-2">
                <span className="text-brand font-bold text-xl">NS</span>
              </div>
              <h1 className="text-3xl font-bold">Create your account</h1>
            </div>
            <p className="text-balance text-muted-foreground">Get started with just your email and password</p>
          </div>
          <div className="grid gap-4">
            {/* Boutons Social Media - Affichés dynamiquement */}
            {(oauthConfig.github || oauthConfig.google) && (
              <>
                <div className="grid gap-4">
                  {oauthConfig.github && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      type="button"
                      disabled={isGithubLoading || isGoogleLoading}
                      onClick={() => {
                        setIsGithubLoading(true);
                        toast.loading('Redirecting to GitHub...', { id: 'github-redirect' });
                        window.location.href = '/api/auth/oauth/github';
                      }}
                    >
                      {isGithubLoading ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <svg
                            className="mr-2 h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          Continue with GitHub
                        </>
                      )}
                    </Button>
                  )}
                  {oauthConfig.google && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      type="button"
                      disabled={isGithubLoading || isGoogleLoading}
                      onClick={() => {
                        setIsGoogleLoading(true);
                        toast.loading('Redirecting to Google...', { id: 'google-redirect' });
                        window.location.href = '/api/auth/oauth/google';
                      }}
                    >
                      {isGoogleLoading ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="24"
                            viewBox="0 0 24 24"
                            width="24"
                            className="mr-2 h-4 w-4"
                          >
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                            <path d="M1 1h22v22H1z" fill="none" />
                          </svg>
                          Continue with Google
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
              </>
            )}

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className={isEmailValid === false ? "border-red-500 focus-visible:ring-red-500" : isEmailValid === true ? "border-green-500 focus-visible:ring-green-500" : ""}
                  />
                  {formData.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isEmailValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Create a secure password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  placeholder="Confirm your password"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="termsAccepted"
                  checked={formData.termsAccepted}
                  onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked as boolean })}
                  disabled={isLoading}
                />
                <label htmlFor="termsAccepted" className="text-sm font-medium leading-none">
                  I agree to the{" "}
                  <Link href="#" className="underline underline-offset-4">
                    terms and conditions
                  </Link>
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted md:flex items-center justify-center p-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
          <div className="relative rounded-2xl border bg-background/50 backdrop-blur-sm p-12">
            <div className="flex flex-col items-center space-y-8">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg
                    className="h-16 w-16 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Quick & Simple</h2>
                <p className="text-muted-foreground max-w-sm">
                  Create your account in seconds. Complete your profile and invite your team later.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full pt-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Fast</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Secure</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium">Flexible</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
