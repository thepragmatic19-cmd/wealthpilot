"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        Une erreur est survenue
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Désolé pour ce désagrément. Notre équipe a été notifiée et travaille sur une solution.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/"}>
          Retour à l&apos;accueil
        </Button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <div className="mt-10 w-full max-w-2xl overflow-hidden rounded-lg border bg-muted p-4 text-left">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Debug Info
          </p>
          <pre className="overflow-auto font-mono text-xs text-muted-foreground">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  );
}
