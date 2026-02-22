"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Shield } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-muted/50 py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="text-3xl font-bold sm:text-4xl">
          Prêt à prendre le contrôle de vos finances?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Rejoignez des milliers d&apos;investisseurs qui utilisent WealthPilot
          pour optimiser leur portefeuille.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {[
            "Portefeuilles personnalisés par l'IA",
            "Optimisation fiscale CELI/REER",
            "Conseiller IA disponible 24/7",
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base">
              Créer mon compte gratuitement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Badge variant="outline" className="text-xs">
            Aucune carte de crédit requise
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Garantie 30 jours satisfait ou remboursé</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
