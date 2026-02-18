import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation de WealthPilot — gestionnaire de portefeuille propulsé par l'IA.",
};

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-24">
        <h1 className="text-3xl font-bold">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : 17 février 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptation des conditions</h2>
            <p className="mt-2">
              En accédant à WealthPilot ou en l&apos;utilisant, vous acceptez d&apos;être lié par ces
              conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas
              utiliser le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description du service</h2>
            <p className="mt-2">
              WealthPilot est un outil d&apos;aide à la décision en matière d&apos;investissement.
              Il fournit des analyses de portefeuille, des recommandations générées par intelligence
              artificielle et des outils de planification financière. WealthPilot ne constitue pas
              un service de conseil en investissement réglementé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Avertissement important</h2>
            <p className="mt-2">
              WealthPilot n&apos;est pas un conseiller financier enregistré auprès de l&apos;Autorité des
              marchés financiers (AMF) du Québec ni d&apos;aucun autre organisme de réglementation.
              Les informations et recommandations fournies sont à titre éducatif seulement et ne
              constituent pas des conseils financiers, fiscaux ou juridiques. Consultez un professionnel
              agréé avant de prendre toute décision d&apos;investissement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Comptes utilisateur</h2>
            <p className="mt-2">
              Vous êtes responsable de maintenir la confidentialité de vos identifiants de connexion
              et de toute activité effectuée sous votre compte. Vous devez nous notifier immédiatement
              de toute utilisation non autorisée de votre compte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Abonnements et paiements</h2>
            <p className="mt-2">
              Certaines fonctionnalités de WealthPilot sont disponibles via des abonnements payants.
              Les prix sont affichés en dollars canadiens (CAD). Les abonnements se renouvellent
              automatiquement sauf annulation. Vous pouvez annuler à tout moment depuis votre tableau
              de bord. Un remboursement est possible dans les 30 jours suivant l&apos;achat initial.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Propriété intellectuelle</h2>
            <p className="mt-2">
              Le contenu, les fonctionnalités et la technologie de WealthPilot sont protégés par les
              lois sur la propriété intellectuelle. Vous ne pouvez pas reproduire, distribuer ou
              modifier le service sans autorisation écrite préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Limitation de responsabilité</h2>
            <p className="mt-2">
              WealthPilot ne garantit pas les résultats d&apos;investissement. Les performances passées
              ne sont pas indicatives des résultats futurs. En aucun cas WealthPilot ne sera
              responsable des pertes financières résultant de l&apos;utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Modifications</h2>
            <p className="mt-2">
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications
              prennent effet dès leur publication. Votre utilisation continue du service après
              modification constitue votre acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Droit applicable</h2>
            <p className="mt-2">
              Ces conditions sont régies par les lois de la province de Québec, Canada. Tout litige
              sera soumis aux tribunaux compétents du district judiciaire de Montréal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="mt-2">
              Pour toute question concernant ces conditions, contactez-nous à support@wealthpilot.ca.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
