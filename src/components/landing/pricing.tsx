"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Shield } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Gratuit",
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    priceAnnualTotal: 0,
    description: "Pour commencer votre parcours d'investissement",
    features: [
      "Tableau de bord personnalisé",
      "1 portefeuille",
      "5 messages IA par jour",
      "Questionnaire de risque",
      "Suivi de base",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    priceMonthly: 19,
    priceAnnualMonthly: 15,
    priceAnnualTotal: 190,
    description: "Pour les investisseurs sérieux",
    features: [
      "Tout du plan Gratuit",
      "Jusqu'à 5 portefeuilles",
      "50 messages IA par jour",
      "Planification fiscale",
      "Simulateur de retraite",
      "Export PDF",
      "Insights IA hebdomadaires",
    ],
    cta: "Passer à Pro",
    href: "/register?plan=pro",
    popular: true,
  },
  {
    name: "Élite",
    priceMonthly: 39,
    priceAnnualMonthly: 32,
    priceAnnualTotal: 390,
    description: "Pour une gestion patrimoniale complète",
    features: [
      "Tout du plan Pro",
      "Portefeuilles illimités",
      "Messages IA illimités",
      "IA prioritaire (réponses plus rapides)",
      "Insights IA avancés",
      "Support prioritaire",
    ],
    cta: "Passer à Élite",
    href: "/register?plan=elite",
    popular: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-12 sm:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold sm:text-4xl">
            Des plans adaptés à vos besoins
          </h2>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Commencez gratuitement et évoluez selon vos besoins. Tous les prix sont en dollars canadiens.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? "font-semibold" : "text-muted-foreground"}`}>
              Mensuel
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={`text-sm ${annual ? "font-semibold" : "text-muted-foreground"}`}>
              Annuel
            </span>
            {annual && (
              <Badge variant="secondary" className="ml-1 text-xs">
                Économisez 20%
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Mobile: horizontal scroll — Desktop: 3-col grid */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-touch pb-2 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:pb-0 max-w-5xl sm:mx-auto">
            {plans.map((plan, i) => {
              const price = annual ? plan.priceAnnualMonthly : plan.priceMonthly;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="shrink-0 w-[80vw] sm:w-auto"
                >
                  <Card
                    className={`relative h-full flex flex-col ${plan.popular
                        ? "border-primary shadow-lg shadow-primary/10 md:scale-105"
                        : ""
                      }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Populaire
                      </Badge>
                    )}
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{price}$</span>
                        {price > 0 && (
                          <span className="text-muted-foreground">/mois</span>
                        )}
                      </div>
                      {annual && plan.priceAnnualTotal > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.priceAnnualTotal}$/an facturé annuellement
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2.5 flex-1 mb-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Link href={plan.href}>
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                        >
                          {plan.cta}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Garantie 30 jours satisfait ou remboursé</span>
        </div>
      </div>
    </section>
  );
}
