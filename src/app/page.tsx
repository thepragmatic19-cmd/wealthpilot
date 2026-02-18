import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "WealthPilot",
      url: "https://wealthpilot.ca",
      description:
        "Gestionnaire de portefeuille propulsé par l'intelligence artificielle pour les investisseurs canadiens.",
      foundingDate: "2024",
      sameAs: ["https://linkedin.com", "https://x.com"],
    },
    {
      "@type": "WebApplication",
      name: "WealthPilot",
      url: "https://wealthpilot.ca",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "CAD",
          name: "Gratuit",
        },
        {
          "@type": "Offer",
          price: "19",
          priceCurrency: "CAD",
          name: "Pro",
        },
        {
          "@type": "Offer",
          price: "39",
          priceCurrency: "CAD",
          name: "Élite",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "WealthPilot remplace-t-il un conseiller financier?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. WealthPilot est un outil d'aide à la décision qui complète les conseils d'un professionnel agréé.",
          },
        },
        {
          "@type": "Question",
          name: "Mes données sont-elles sécurisées?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vos données sont chiffrées en transit et au repos. Nous utilisons des politiques de sécurité au niveau des lignes (RLS) pour garantir que seul vous pouvez accéder à vos informations.",
          },
        },
        {
          "@type": "Question",
          name: "Comment fonctionne le plan gratuit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Le plan gratuit donne accès au tableau de bord personnalisé, un portefeuille recommandé, 5 messages IA par jour et le questionnaire de profil de risque.",
          },
        },
        {
          "@type": "Question",
          name: "Puis-je annuler à tout moment?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui, vous pouvez annuler votre abonnement à tout moment depuis la page Abonnement. Nous offrons une garantie satisfait ou remboursé de 30 jours.",
          },
        },
        {
          "@type": "Question",
          name: "Quels ETFs sont recommandés?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WealthPilot analyse plus de 90 ETFs canadiens et internationaux disponibles sur les marchés TSX et NYSE.",
          },
        },
        {
          "@type": "Question",
          name: "WealthPilot est-il réglementé?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "WealthPilot n'est pas un conseiller financier enregistré auprès de l'AMF. Nous fournissons des outils éducatifs et d'aide à la décision.",
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
