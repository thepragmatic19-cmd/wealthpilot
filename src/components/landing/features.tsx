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
    <section id="features" className="py-14 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Une suite complète d&apos;outils pour gérer votre patrimoine intelligemment
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
