import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 pt-24 pb-12 sm:pt-16 sm:pb-0">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-chart-1/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Propulsé par l&apos;intelligence artificielle</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          Votre gestionnaire de portefeuille{" "}
          <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent">
            propulsé par l&apos;IA
          </span>
        </h1>

        {/* Subtitle */}
        <p className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          WealthPilot évalue votre profil de risque, génère des portefeuilles
          personnalisés et vous accompagne avec un conseiller IA disponible 24/7.
        </p>

        {/* CTA buttons */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="text-base">
              En savoir plus
            </Button>
          </Link>
        </div>

        {/* Quick stats */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 mx-auto mt-10 sm:mt-16 grid max-w-lg grid-cols-3 gap-8">
          {[
            { value: "3", label: "Portefeuilles personnalisés" },
            { value: "90+", label: "ETFs canadiens analysés" },
            { value: "24/7", label: "Conseiller IA disponible" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold sm:text-3xl">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
