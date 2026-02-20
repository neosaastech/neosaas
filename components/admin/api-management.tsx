"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Github, Key, Server, RefreshCw } from "lucide-react";
import type { GitHubConfigResponse } from "@/types/github-config";

export function APIManagement() {
  const [githubPat, setGithubPat] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<GitHubConfigResponse | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubPat.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une clé API GitHub",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/admin/configure-github-oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubPat }),
      });

      const data: GitHubConfigResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      setResponse(data);

      toast({
        title: "✅ Configuration réussie",
        description: data.message || "GitHub OAuth a été configuré avec succès",
      });

      // Nettoyer le champ après succès
      setGithubPat("");

      // Recharger la page après 2 secondes pour appliquer les nouvelles variables
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      const errorMessage = error.message || "Erreur lors de la configuration";
      
      setResponse({
        success: false,
        error: errorMessage,
      });

      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <CardTitle>Configuration GitHub OAuth</CardTitle>
          </div>
          <CardDescription>
            Configurez automatiquement l'authentification GitHub via une clé API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="githubPat">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Clé API GitHub (Personal Access Token)
                </div>
              </Label>
              <Input
                id="githubPat"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                disabled={isLoading}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                La clé doit avoir les permissions <code className="bg-muted px-1 py-0.5 rounded">admin:org</code> et <code className="bg-muted px-1 py-0.5 rounded">write:org</code>
              </p>
            </div>

            <Alert>
              <Server className="h-4 w-4" />
              <AlertDescription>
                <strong>Prérequis :</strong> Assurez-vous que les variables d'environnement{" "}
                <code className="bg-muted px-1 py-0.5 rounded">VERCEL_PROJECT_ID</code> et{" "}
                <code className="bg-muted px-1 py-0.5 rounded">VERCEL_API_TOKEN</code> sont configurées.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={isLoading || !githubPat.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configuration en cours...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  Configurer GitHub OAuth
                </>
              )}
            </Button>
          </form>

          {/* Affichage des résultats */}
          {response && (
            <div className="mt-6 space-y-4">
              {response.success ? (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Succès !</strong> {response.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreur :</strong> {response.error}
                  </AlertDescription>
                </Alert>
              )}

              {response.details && (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">Détails de la configuration :</p>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      {response.details.oauthAppCreated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      OAuth App créée
                    </li>
                    <li className="flex items-center gap-2">
                      {response.details.vercelEnvUpdated ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      Variables Vercel mises à jour
                    </li>
                  </ul>
                </div>
              )}

              {response.success && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Rechargement de la page pour appliquer les modifications...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation rapide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comment obtenir une clé API GitHub ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Allez sur <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary underline">GitHub Settings → Tokens</a></li>
            <li>Cliquez sur "Generate new token (classic)"</li>
            <li>Donnez un nom descriptif (ex: "NeoSAS OAuth Configuration")</li>
            <li>Sélectionnez les permissions : <code className="bg-muted px-1 py-0.5 rounded">admin:org</code> et <code className="bg-muted px-1 py-0.5 rounded">write:org</code></li>
            <li>Cliquez sur "Generate token"</li>
            <li>Copiez le token (vous ne pourrez plus le voir ensuite)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
