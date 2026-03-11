"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import type { Portfolio, PortfolioAllocation } from "@/types/database";

interface PortfolioWithAllocations extends Portfolio {
  allocations: PortfolioAllocation[];
}

interface Props {
  portfolio: PortfolioWithAllocations;
}

export function ExportPdfButton({ portfolio }: Props) {
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { canAccess } = useSubscription();

  async function handleExport() {
    if (!canAccess("pdf_export")) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    try {
      const { generatePortfolioPDF } = await import("@/lib/pdf/portfolio-pdf");
      await generatePortfolioPDF(portfolio);
      toast.success("PDF téléchargé avec succès");
    } catch (err) {
      logger.error("PDF export error:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {loading ? "Génération..." : "Exporter PDF"}
      </Button>
      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Export PDF"
      />
    </>
  );
}
