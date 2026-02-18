import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
            <div className="relative">
                <h1 className="text-[8rem] font-black leading-none tracking-tighter text-primary/10">
                    404
                </h1>
                <p className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                    Page introuvable
                </p>
            </div>
            <p className="max-w-md text-muted-foreground">
                La page que vous cherchez n&apos;existe pas ou a été déplacée.
            </p>
            <div className="flex gap-3">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Retour au tableau de bord
                </Link>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    Accueil
                </Link>
            </div>
        </div>
    );
}
