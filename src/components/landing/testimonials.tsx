import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, StarHalf } from "lucide-react";

const testimonials = [
  {
    name: "Marie-Claire Dubois",
    role: "Professionnelle, 34 ans",
    initials: "MD",
    content:
      "WealthPilot m'a aidée à comprendre mon profil de risque et à construire un portefeuille adapté. Le conseiller IA est incroyablement pertinent!",
    rating: 5,
    metric: "Rendement +12%",
  },
  {
    name: "Jean-François Tremblay",
    role: "Ingénieur, 42 ans",
    initials: "JT",
    content:
      "J'ai enfin un portefeuille optimisé pour mes CELI et REER. L'onboarding est comme un vrai rendez-vous avec un conseiller, mais disponible 24/7.",
    rating: 5,
    metric: "Frais réduits de 85%",
  },
  {
    name: "Sophie Lavoie",
    role: "Entrepreneure, 29 ans",
    initials: "SL",
    content:
      "L'interface est magnifique et les recommandations sont claires. Je comprends enfin où va mon argent et pourquoi.",
    rating: 5,
    metric: "3 objectifs atteints",
  },
  {
    name: "Marc-Antoine Gagnon",
    role: "Médecin, 38 ans",
    initials: "MG",
    content:
      "La planification fiscale m'a permis de maximiser mes cotisations REER et d'économiser significativement en impôts. Un outil indispensable.",
    rating: 4.5,
    metric: "4 500$ économisés",
  },
  {
    name: "Isabelle Chen",
    role: "Analyste financière, 31 ans",
    initials: "IC",
    content:
      "Même en tant que professionnelle de la finance, j'utilise WealthPilot pour mes finances personnelles. Le simulateur de retraite Monte Carlo est excellent.",
    rating: 5,
    metric: "Retraite avancée de 3 ans",
  },
];

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalf && <StarHalf className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-14 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold sm:text-4xl">
            Ils nous font confiance
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Découvrez les résultats concrets de nos utilisateurs
          </p>
        </div>

        <div className="mt-10 sm:mt-16 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              className={`animate-in fade-in slide-in-from-bottom-4 duration-500${index >= 3 ? " hidden sm:block" : ""}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Card className="h-full">
                <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating rating={t.rating} />
                    <Badge variant="secondary" className="text-xs">
                      {t.metric}
                    </Badge>
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground sm:text-base">&ldquo;{t.content}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarFallback className="text-xs sm:text-sm">{t.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
