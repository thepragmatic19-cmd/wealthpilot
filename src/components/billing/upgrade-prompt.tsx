"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Check } from "lucide-react";
import { PLAN_PRICES } from "@/lib/subscription";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const PRO_FEATURES = [
  "Planification fiscale (CELI, REER, REEE)",
  "Simulateur de retraite Monte Carlo",
  "Export PDF de votre portefeuille",
  "Insights IA personnalisés",
  "50 messages IA par jour",
  "Jusqu'à 5 portefeuilles",
];

export function UpgradePrompt({ open, onOpenChange, feature }: UpgradePromptProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="sm:max-w-md" asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-xl">
                  Passez à Pro
                </DialogTitle>
                <DialogDescription>
                  {feature
                    ? `Cette fonctionnalité nécessite un abonnement Pro ou Élite.`
                    : "Débloquez toutes les fonctionnalités de WealthPilot."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Pro</span>
                      <Badge variant="secondary">Populaire</Badge>
                    </div>
                    <span className="text-lg font-bold">
                      {PLAN_PRICES.pro}$/mois
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/billing");
                  }}
                >
                  Voir les plans
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Plus tard
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
