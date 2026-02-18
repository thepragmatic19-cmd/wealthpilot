import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de WealthPilot — comment nous protégeons vos données personnelles.",
};

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : 17 février 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="mt-2">
              WealthPilot s&apos;engage à protéger votre vie privée. Cette politique décrit comment nous
              collectons, utilisons et protégeons vos informations personnelles conformément à la
              Loi 25 du Québec et à la Loi sur la protection des renseignements personnels et les
              documents électroniques (LPRPDE) du Canada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p className="mt-2">Nous collectons les types de données suivants :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Informations d&apos;identification :</strong> nom, adresse courriel</li>
              <li><strong>Données financières :</strong> revenus, épargne, objectifs déclarés par vous</li>
              <li><strong>Profil de risque :</strong> réponses au questionnaire d&apos;évaluation</li>
              <li><strong>Données d&apos;utilisation :</strong> pages visitées, fonctionnalités utilisées</li>
              <li><strong>Données de paiement :</strong> traitées par Stripe, nous ne stockons pas vos informations de carte</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Utilisation des données</h2>
            <p className="mt-2">Vos données sont utilisées pour :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Générer des recommandations de portefeuille personnalisées</li>
              <li>Alimenter le conseiller IA avec le contexte de votre situation</li>
              <li>Calculer vos projections fiscales et de retraite</li>
              <li>Traiter vos paiements d&apos;abonnement</li>
              <li>Améliorer nos services et algorithmes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Sécurité des données</h2>
            <p className="mt-2">
              Vos données sont protégées par les mesures suivantes :
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Chiffrement en transit (TLS/HTTPS) et au repos</li>
              <li>Politiques de sécurité au niveau des lignes (RLS) via Supabase</li>
              <li>Authentification sécurisée avec tokens JWT</li>
              <li>Accès limité aux données uniquement par l&apos;utilisateur propriétaire</li>
              <li>Aucun partage de données avec des tiers non autorisés</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Intelligence artificielle</h2>
            <p className="mt-2">
              WealthPilot utilise des modèles d&apos;IA (Claude par Anthropic) pour générer des
              recommandations. Vos données financières sont envoyées de manière sécurisée à
              l&apos;API pour le traitement des requêtes. Les conversations ne sont pas utilisées
              pour entraîner les modèles d&apos;IA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p className="mt-2">
              Nous utilisons des cookies essentiels pour l&apos;authentification et les préférences
              utilisateur (langue, thème). Aucun cookie de pistage publicitaire n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Vos droits</h2>
            <p className="mt-2">Conformément à la Loi 25, vous avez le droit de :</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier vos données inexactes</li>
              <li>Demander la suppression de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
              <li>Recevoir vos données dans un format portable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Conservation des données</h2>
            <p className="mt-2">
              Vos données sont conservées tant que votre compte est actif. En cas de suppression de
              compte, vos données personnelles sont supprimées dans un délai de 30 jours. Les données
              anonymisées peuvent être conservées à des fins statistiques.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Modifications</h2>
            <p className="mt-2">
              Cette politique peut être mise à jour. Nous vous notifierons de tout changement
              significatif par courriel ou via l&apos;application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="mt-2">
              Pour toute question concernant vos données personnelles, contactez notre responsable
              de la protection des renseignements personnels à privacy@wealthpilot.ca.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
