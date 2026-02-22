"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center p-6 text-center antialiased">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Erreur critique du système
        </h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Une erreur fatale est survenue dans l&apos;application. Veuillez rafraîchir la page ou contacter le support.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Rafraîchir
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-10 w-full max-w-2xl overflow-hidden rounded-lg border bg-muted p-4 text-left">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Critical Debug Info
            </p>
            <pre className="overflow-auto font-mono text-xs text-muted-foreground">
              {error.message}
            </pre>
          </div>
        )}
      </body>
    </html>
  );
}
