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

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Une suite complète d&apos;outils pour gérer votre patrimoine intelligemment
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
