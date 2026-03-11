"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Dashboard Error:", error);
    }
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full border-destructive/20 bg-destructive/5 shadow-lg">
        <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 animate-pulse">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Erreur du Tableau de Bord</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Impossible de charger cette section. Vos données sont en sécurité, mais une erreur technique empêche l&apos;affichage.
            </p>
          </div>

          <div className="flex flex-col w-full gap-2">
            <Button onClick={() => reset()} className="w-full gap-2 shadow-sm">
              <RefreshCcw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Rafraîchir toute la page
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 w-full overflow-hidden rounded-md border bg-background p-3 text-left">
              <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Error Details</p>
              <p className="text-xs font-mono text-muted-foreground break-words">{error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
