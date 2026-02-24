/**
 * Example Component using Dynamic Theme Variables
 * Démontre comment utiliser les variables CSS du thème personnalisé
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ThemeExampleComponent() {
  return (
    <div className="space-y-6 p-6">
      {/* Exemple 1 : Utilisation des classes Tailwind avec variables du thème */}
      <Card>
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle>Exemple 1 : Classes Tailwind</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Utilisation des couleurs via les classes Tailwind
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="default" className="bg-primary hover:bg-primary/90">
              Bouton Primary
            </Button>
            <Button variant="secondary" className="bg-secondary hover:bg-secondary/90">
              Bouton Secondary
            </Button>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
              Bouton Accent
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-success text-white">Succès</Badge>
            <Badge className="bg-warning text-white">Avertissement</Badge>
            <Badge className="bg-destructive text-destructive-foreground">Erreur</Badge>
            <Badge className="bg-info text-white">Info</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Exemple 2 : Utilisation inline des variables CSS */}
      <Card>
        <CardHeader>
          <CardTitle>Exemple 2 : Style Inline</CardTitle>
          <CardDescription>
            Utilisation directe des variables CSS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--card-foreground))',
            }}
          >
            <p>Ce contenu utilise les variables CSS directement</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Primary', var: '--primary' },
              { name: 'Secondary', var: '--secondary' },
              { name: 'Accent', var: '--accent' },
              { name: 'Background', var: '--background' },
            ].map(({ name, var: cssVar }) => (
              <div key={name} className="space-y-2">
                <div
                  className="h-20 rounded-md border"
                  style={{ backgroundColor: `hsl(var(${cssVar}))` }}
                />
                <p className="text-sm font-medium">{name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exemple 3 : États et variantes */}
      <Card>
        <CardHeader>
          <CardTitle>Exemple 3 : États et Variantes</CardTitle>
          <CardDescription>
            Utilisation des couleurs pour différents états
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-muted text-muted-foreground">
              État par défaut (muted)
            </div>
            <div className="p-3 rounded-md bg-primary text-primary-foreground">
              État actif (primary)
            </div>
            <div className="p-3 rounded-md bg-secondary text-secondary-foreground">
              État secondaire (secondary)
            </div>
            <div className="p-3 rounded-md bg-destructive text-destructive-foreground">
              État d'erreur (destructive)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemple 4 : Bordures et anneaux de focus */}
      <Card>
        <CardHeader>
          <CardTitle>Exemple 4 : Bordures et Focus</CardTitle>
          <CardDescription>
            Utilisation des variables de bordure et de focus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="text"
            placeholder="Input avec bordure thématique"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          
          <button className="px-4 py-2 rounded-md bg-accent text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            Bouton avec ring de focus
          </button>
        </CardContent>
      </Card>

      {/* Guide de développement */}
      <Card className="border-accent">
        <CardHeader>
          <CardTitle className="text-accent">💡 Guide pour les développeurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">Utilisation recommandée :</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Préférez les classes Tailwind : <code className="bg-muted px-1 rounded">bg-primary</code></li>
              <li>Pour du CSS custom : <code className="bg-muted px-1 rounded">hsl(var(--primary))</code></li>
              <li>Évitez les couleurs hardcodées pour maintenir la cohérence</li>
              <li>Testez toujours en mode clair ET sombre</li>
            </ul>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-mono">
              {`// ✅ Bon`}<br />
              {`<Button className="bg-primary text-primary-foreground">`}<br />
              <br />
              {`// ❌ À éviter`}<br />
              {`<Button className="bg-brand">`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
