"use client";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useSimpleMode } from "@/contexts/simple-mode-context";

export function FloatingHelpButton({ question }: { question: string }) {
  const { isSimple } = useSimpleMode();
  const router = useRouter();
  if (!isSimple) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      <button
        onClick={() => router.push(`/chat?q=${encodeURIComponent(question)}`)}
        className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span>Aide IA</span>
      </button>
    </div>
  );
}
