/**
 * "code-showcase" layer (Pilier C — Calques de page). Registered in lib/layers/registry.ts.
 * Section title + a single monospace code card — mirrors neomnia-ui-registry's
 * "Project Structure" section pattern (neomnia.net).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface CodeShowcaseLayerProps {
  title?: string
  subtitle?: string
  blockTitle?: string
  blockDescription?: string
  code: string
}

export function CodeShowcaseLayer({ title, subtitle, blockTitle, blockDescription, code }: CodeShowcaseLayerProps) {
  return (
    <div className="mx-auto mt-16 max-w-3xl">
      {title && <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>}
      {subtitle && (
        <div
          className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      )}
      <Card className="mt-8 bg-muted/30">
        {(blockTitle || blockDescription) && (
          <CardHeader>
            {blockTitle && <CardTitle className="font-mono text-sm">{blockTitle}</CardTitle>}
            {blockDescription && <CardDescription>{blockDescription}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-background p-4 text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
