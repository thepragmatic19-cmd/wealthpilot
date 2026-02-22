import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap", // Show fallback font immediately, swap when Inter loads
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // iOS status bar matches app theme
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "WealthPilot - Gestionnaire de Portefeuille IA",
    template: "%s | WealthPilot",
  },
  description:
    "Votre gestionnaire de portefeuille propulsé par l'intelligence artificielle. Évaluation de profil de risque, portefeuilles personnalisés et conseiller IA 24/7.",
  keywords: [
    "portefeuille",
    "investissement",
    "IA",
    "CELI",
    "REER",
    "ETF",
    "Canada",
    "gestion de patrimoine",
    "conseiller financier IA",
    "robo-advisor",
  ],
  authors: [{ name: "WealthPilot" }],
  creator: "WealthPilot",
  openGraph: {
    type: "website",
    locale: "fr_CA",
    siteName: "WealthPilot",
    title: "WealthPilot - Gestionnaire de Portefeuille IA",
    description:
      "Évaluation de profil de risque, portefeuilles personnalisés et conseiller IA 24/7 pour les investisseurs canadiens.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WealthPilot - Gestionnaire de Portefeuille IA",
    description: "Votre gestionnaire de portefeuille propulsé par l'IA.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ReactQueryProvider>
              {children}
            </ReactQueryProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
