import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "WealthPilot remplace-t-il un conseiller financier?",
    answer:
      "Non. WealthPilot est un outil d'aide à la décision qui complète les conseils d'un professionnel agréé. Il vous aide à mieux comprendre votre situation financière et à explorer des stratégies d'investissement, mais ne remplace pas un conseiller certifié.",
  },
  {
    question: "Mes données sont-elles sécurisées?",
    answer:
      "Absolument. Vos données sont chiffrées en transit et au repos. Nous utilisons Supabase avec des politiques de sécurité au niveau des lignes (RLS) pour garantir que seul vous pouvez accéder à vos informations. Nous ne partageons jamais vos données avec des tiers.",
  },
  {
    question: "Comment fonctionne le plan gratuit?",
    answer:
      "Le plan gratuit vous donne accès au tableau de bord personnalisé, un portefeuille recommandé, 5 messages IA par jour et le questionnaire de profil de risque. C'est suffisant pour commencer à explorer et comprendre votre situation financière.",
  },
  {
    question: "Puis-je annuler à tout moment?",
    answer:
      "Oui, vous pouvez annuler votre abonnement à tout moment depuis la page Abonnement. Votre accès aux fonctionnalités premium restera actif jusqu'à la fin de votre période de facturation. Nous offrons également une garantie satisfait ou remboursé de 30 jours.",
  },
  {
    question: "Quels ETFs sont recommandés?",
    answer:
      "WealthPilot analyse plus de 90 ETFs canadiens et internationaux disponibles sur les marchés TSX et NYSE. Les recommandations sont personnalisées selon votre profil de risque, vos objectifs et votre situation fiscale (CELI, REER, REEE).",
  },
  {
    question: "WealthPilot est-il réglementé?",
    answer:
      "WealthPilot n'est pas un conseiller financier enregistré auprès de l'AMF. Nous fournissons des outils éducatifs et d'aide à la décision. Pour des conseils financiers personnalisés réglementés, consultez un professionnel agréé.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-14 px-4 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur WealthPilot
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "100ms" }}>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
