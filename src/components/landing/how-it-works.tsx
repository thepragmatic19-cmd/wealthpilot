"use client";

import { motion } from "framer-motion";
import { UserCheck, BarChart3, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    step: "01",
    title: "Complétez votre profil",
    description:
      "Répondez à notre questionnaire intelligent qui s'adapte à vos réponses, comme un vrai rendez-vous avec un conseiller.",
  },
  {
    icon: BarChart3,
    step: "02",
    title: "Recevez vos recommandations",
    description:
      "Notre IA analyse votre profil et génère 3 portefeuilles personnalisés avec des ETFs réels.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Échangez avec votre conseiller IA",
    description:
      "Posez vos questions à tout moment. Votre conseiller connaît votre situation et vous guide.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/50 py-24 px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Comment ça marche</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Trois étapes simples vers un portefeuille optimisé
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative text-center"
            >
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-border md:block" />
              )}
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-background shadow-lg ring-1 ring-border">
                <step.icon className="h-10 w-10 text-primary" />
                <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
