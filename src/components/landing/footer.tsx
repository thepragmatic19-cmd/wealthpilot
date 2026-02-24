"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  }

  return (
    <footer className="border-t py-8 px-4 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              WealthPilot
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              WealthPilot est un outil d&apos;aide à la décision. Il ne remplace
              pas les conseils d&apos;un professionnel agréé.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="h-5 w-5" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="X (Twitter)"
              >
                <XIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground">Fonctionnalités</Link></li>
              <li><Link href="#how-it-works" className="hover:text-foreground">Comment ça marche</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground">Tarification</Link></li>
              <li><Link href="#faq" className="hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Légal</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground">Conditions d&apos;utilisation</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Politique de confidentialité</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Newsletter</h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Recevez nos conseils d&apos;investissement et mises à jour.
            </p>
            {subscribed ? (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                Merci pour votre inscription!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-base"
                  autoComplete="email"
                  required
                />
                <Button type="submit" size="sm">
                  S&apos;inscrire
                </Button>
              </form>
            )}
          </div>
        </div>
        <div className="mt-8 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            <strong>Avis important :</strong> WealthPilot n&apos;est pas un conseiller financier enregistré
            auprès de l&apos;Autorité des marchés financiers (AMF) du Québec ni d&apos;aucun autre organisme
            de réglementation. Les informations et recommandations fournies sont à titre éducatif
            seulement et ne constituent pas des conseils financiers, fiscaux ou juridiques. Consultez
            un professionnel agréé avant de prendre toute décision d&apos;investissement.
          </p>
        </div>
        <div className="mt-6 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} WealthPilot. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
