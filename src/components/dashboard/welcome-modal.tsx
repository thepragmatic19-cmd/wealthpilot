"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Shield, MessageSquare, X } from "lucide-react";

const STORAGE_KEY = "wp_welcome_v1";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-background border shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Bienvenue sur WealthPilot&nbsp;!</h2>
            <p className="text-sm text-muted-foreground">Votre copilote financier personnel</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          WealthPilot est conçu pour être <strong>simple et accessible</strong>, même si vous débutez en finances.
          Voici comment démarrer&nbsp;:
        </p>

        <div className="space-y-3 mb-6">
          {[
            { Icon: Shield, title: "Mode débutant activé", desc: "L'affichage simplifié met en avant l'essentiel. Vous pouvez basculer en mode avancé à tout moment depuis le menu." },
            { Icon: MessageSquare, title: "Posez vos questions à Alex", desc: "Notre IA répond à vos questions en langage simple. Il n'y a pas de mauvaise question !" },
            { Icon: TrendingUp, title: "Suivez vos 4 piliers", desc: "Complétez votre profil, vos comptes enregistrés, un objectif et une habitude d'épargne pour un score A+." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={dismiss} className="w-full rounded-xl h-11 font-semibold">
          C&apos;est parti&nbsp;!
        </Button>
      </div>
    </div>
  );
}
