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
import { Crown, Check } from "lucide-react";
import { PLAN_PRICES } from "@/lib/subscription";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const ELITE_FEATURES = [
  "Tout du plan Pro",
  "Portefeuilles illimités",
  "Messages IA illimités",
  "IA prioritaire & Support dédié",
  "Simulations avancées de krach boursier",
];

export function UpgradePrompt({ open, onOpenChange, feature }: UpgradePromptProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="sm:max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-xl">
                  Passez à Élite
                </DialogTitle>
                <DialogDescription>
                  {feature
                    ? `Cette fonctionnalité nécessite un abonnement Élite.`
                    : "Débloquez l'expérience ultime de WealthPilot."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="font-bold">Élite</span>
                    </div>
                    <span className="text-lg font-black tracking-tight">
                      {PLAN_PRICES.elite}$/mois
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground font-medium">
                    {ELITE_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="w-full shadow-lg shadow-primary/20"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/billing");
                  }}
                >
                  Passer à Élite
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  Continuer avec mon accès Pro
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
