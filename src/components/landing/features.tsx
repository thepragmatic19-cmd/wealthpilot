"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  PieChart,
  MessageSquare,
  Shield,
  Target,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Profilage IA intelligent",
    description:
      "Notre IA évalue votre profil de risque comme un conseiller certifié, avec des questions de suivi personnalisées.",
  },
  {
    icon: PieChart,
    title: "Portefeuilles sur mesure",
    description:
      "3 portefeuilles générés avec des ETFs réels canadiens et américains, adaptés à votre profil unique.",
  },
  {
    icon: MessageSquare,
    title: "Conseiller IA 24/7",
    description:
      "Posez vos questions à tout moment. Votre conseiller connaît votre situation et répond en temps réel.",
  },
  {
    icon: Shield,
    title: "Sécurité maximale",
    description:
      "Vos données sont chiffrées et isolées. Authentification sécurisée avec Supabase.",
  },
  {
    icon: Target,
    title: "Suivi des objectifs",
    description:
      "Définissez vos objectifs (retraite, maison, études) et suivez votre progression en temps réel.",
  },
  {
    icon: Zap,
    title: "Optimisation fiscale",
    description:
      "Tirez parti des avantages fiscaux canadiens : CELI, REER, REEE avec des stratégies optimisées.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-12 sm:py-24 px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
            Une suite complète d&apos;outils pour gérer votre patrimoine intelligemment
          </p>
        </motion.div>

        {/* Mobile: horizontal scroll — Desktop: 3-col grid */}
        <div className="mt-8 sm:mt-16 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-touch pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:overflow-visible sm:pb-0">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="shrink-0 w-[78vw] sm:w-auto"
              >
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex flex-col gap-3 p-5 sm:p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
