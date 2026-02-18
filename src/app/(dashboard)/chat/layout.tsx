import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conseiller IA",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
