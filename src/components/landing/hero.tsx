"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex items-center justify-center overflow-hidden px-4 pt-20 pb-12 sm:min-h-screen sm:pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[300px] sm:h-[400px] sm:w-[400px] rounded-full bg-chart-1/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Propulsé par l&apos;intelligence artificielle</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
        >
          Votre gestionnaire de portefeuille{" "}
          <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent">
            propulsé par l&apos;IA
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground"
        >
          WealthPilot évalue votre profil de risque, génère des portefeuilles
          personnalisés et vous accompagne avec un conseiller IA disponible 24/7.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-7 sm:mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base w-full sm:w-auto">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="text-base w-full sm:w-auto">
              En savoir plus
            </Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mx-auto mt-10 sm:mt-16 grid max-w-lg grid-cols-3 gap-4 sm:gap-8"
        >
          {[
            { value: "3", label: "Portefeuilles personnalisés" },
            { value: "90+", label: "ETFs analysés" },
            { value: "24/7", label: "Conseiller IA" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
              <div className="text-[11px] sm:text-sm text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
