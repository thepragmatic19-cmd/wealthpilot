"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, TrendingUp, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("landing.nav");

  // Lock body scroll when mobile menu is open (iOS fix)
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl" onClick={closeMenu}>
          <TrendingUp className="h-6 w-6 text-primary" />
          <span>WealthPilot</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("features")}
          </Link>
          <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("howItWorks")}
          </Link>
          <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Témoignages
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Changer de thème"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Link href="/login">
            <Button variant="ghost">{t("login")}</Button>
          </Link>
          <Link href="/register">
            <Button>{t("getStarted")}</Button>
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Changer de thème"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu — CSS transition, no Framer Motion */}
      <div
        className={`border-t bg-background md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 p-4">
          <Link
            href="#features"
            className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            onClick={closeMenu}
          >
            {t("features")}
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            onClick={closeMenu}
          >
            {t("howItWorks")}
          </Link>
          <Link
            href="#testimonials"
            className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            onClick={closeMenu}
          >
            Témoignages
          </Link>
          <Link
            href="#pricing"
            className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            onClick={closeMenu}
          >
            Tarifs
          </Link>
          <div className="flex gap-2 pt-3 border-t mt-1">
            <Link href="/login" className="flex-1" onClick={closeMenu}>
              <Button variant="outline" className="w-full">{t("login")}</Button>
            </Link>
            <Link href="/register" className="flex-1" onClick={closeMenu}>
              <Button className="w-full">{t("getStarted")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
