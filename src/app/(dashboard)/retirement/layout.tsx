import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulateur de retraite",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
