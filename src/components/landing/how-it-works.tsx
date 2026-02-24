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
    <section id="how-it-works" className="bg-muted/50 py-14 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold sm:text-4xl">Comment ça marche</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Trois étapes simples vers un portefeuille optimisé
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {/* Connecteur horizontal (desktop) */}
              {index < steps.length - 1 && (
                <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-border md:block md:top-12" />
              )}
              {/* Connecteur vertical (mobile) */}
              {index < steps.length - 1 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-border md:hidden" style={{ bottom: "-32px" }} />
              )}

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-lg ring-1 ring-border md:h-24 md:w-24">
                <step.icon className="h-7 w-7 text-primary md:h-10 md:w-10" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground md:h-8 md:w-8 md:text-sm">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold sm:mt-6 sm:text-xl">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
