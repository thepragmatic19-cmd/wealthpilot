"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Trash2,
  Sparkles,
  TrendingUp,
  Target,
  PiggyBank,
  BarChart3,
  Lock,
} from "lucide-react";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useSubscription } from "@/hooks/use-subscription";
import { useSimpleMode } from "@/contexts/simple-mode-context";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/database";

const DEFAULT_SUGGESTIONS = [
  "Analyse mon portefeuille actuel",
  "Optimiser mes comptes CELI et REER",
  "Risques de mon portefeuille actuel",
  "Atteindre mes objectifs de retraite",
];

const SUGGESTION_ICONS = [TrendingUp, PiggyBank, BarChart3, Target];

interface ClientContext {
  hasPortfolio: boolean;
  hasGoals: boolean;
  hasCeli: boolean;
  hasReer: boolean;
  hasCeliBalance: boolean; // true if CELI balance > 0
  goals: Array<{ label: string; target_date: string | null }>;
  age: number | null;
  monthlySavings: number | null;
}

function buildSuggestions(ctx: ClientContext): string[] {
  const suggestions: string[] = [];

  // Priority: guide beginner/new users first
  if (!ctx.hasGoals) {
    suggestions.push("Aide-moi à définir mon premier objectif financier");
  }

  if (!ctx.hasCeli && !ctx.hasReer) {
    suggestions.push("Par où commencer pour investir au Canada ?");
  } else if (ctx.hasCeli && !ctx.hasCeliBalance) {
    suggestions.push("Combien cotiser à mon CELI cette année ?");
  }

  if (ctx.age !== null && ctx.age < 35 && !ctx.hasPortfolio) {
    suggestions.push("Quelle stratégie pour un jeune investisseur débutant ?");
  } else if (ctx.hasPortfolio) {
    suggestions.push("Analyse détaillée de mon portefeuille");
  } else {
    suggestions.push("Quel portefeuille me recommandez-vous ?");
  }

  if (ctx.hasGoals && ctx.goals.length > 0) {
    const urgentGoal = ctx.goals.find(
      (g) =>
        g.target_date &&
        new Date(g.target_date) <
        new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
    );
    if (urgentGoal) {
      suggestions.push(`Stratégie pour atteindre : ${urgentGoal.label}`);
    } else {
      suggestions.push(`Progression vers : ${ctx.goals[0].label}`);
    }
  }

  if (ctx.hasCeli && ctx.hasReer) {
    suggestions.push("Optimiser la répartition CELI vs REER");
  } else if (!ctx.hasReer && ctx.hasGoals) {
    suggestions.push("Est-ce que le REER vaut le coup pour moi ?");
  }

  if (ctx.monthlySavings && ctx.monthlySavings > 0) {
    suggestions.push("Simuler ma retraite à 60 ans");
  } else {
    suggestions.push("Comment augmenter mon épargne mensuelle ?");
  }

  return suggestions.slice(0, 4);
}

function getContextualSuggestions(content: string): string[] {
  const lower = content.toLowerCase();
  if (lower.includes("celi") || lower.includes("reer")) {
    return ["Comment maximiser mes cotisations CELI ?", "Quelle est ma déduction REER optimale ?"];
  }
  if (lower.includes("portefeuille") || lower.includes("allocation") || lower.includes("etf")) {
    return ["Dois-je rééquilibrer mon portefeuille ?", "Quel ETF est le plus adapté à ma situation ?"];
  }
  if (lower.includes("objectif") || lower.includes("retraite")) {
    return ["À quelle date puis-je prendre ma retraite ?", "Combien faut-il épargner chaque mois ?"];
  }
  if (lower.includes("impôt") || lower.includes("fiscalité") || lower.includes("fiscal") || lower.includes("taxe")) {
    return ["Comment réduire mon impôt cette année ?", "Quelle province a le meilleur taux marginal ?"];
  }
  return ["Analyse complète de ma situation", "Quels sont mes prochains pas prioritaires ?"];
}

function MessageDate({ date }: { date: string }) {
  return (
    <div className="flex justify-center my-5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/30 px-3">
        {new Date(date).toLocaleDateString("fr-CA", { dateStyle: "long" })}
      </span>
    </div>
  );
}

interface ChatInterfaceProps {
  initialMessage?: string;
}

export function ChatInterface({ initialMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialMessage ?? "");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [userId, setUserId] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [todayMessageCount, setTodayMessageCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  // Feature 1: pagination
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Feature 2: feedback
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { isFree, isElite, limits } = useSubscription();
  const { isSimple } = useSimpleMode();

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [
        { data, count },
        { data: portfolio },
        { data: goals },
        { data: clientInfo },
      ] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("portfolios")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_selected", true)
          .maybeSingle(),
        supabase.from("goals").select("label, target_date").eq("user_id", user.id),
        supabase
          .from("client_info")
          .select("has_celi, has_reer, celi_balance, age, monthly_savings")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (data) {
        const msgs = ((data || []) as ChatMessage[]).reverse();
        setMessages(msgs);
        setHasMore((count ?? 0) > 50);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = msgs.filter(
          (m) => m.role === "user" && new Date(m.created_at) >= todayStart
        ).length;
        setTodayMessageCount(todayCount);
      }

      setSuggestions(
        buildSuggestions({
          hasPortfolio: !!portfolio,
          hasGoals: (goals ?? []).length > 0,
          hasCeli: clientInfo?.has_celi ?? false,
          hasReer: clientInfo?.has_reer ?? false,
          hasCeliBalance: Number(clientInfo?.celi_balance ?? 0) > 0,
          goals: (goals ?? []) as Array<{
            label: string;
            target_date: string | null;
          }>,
          age: (clientInfo as { age?: number | null } | null)?.age ?? null,
          monthlySavings: (clientInfo as { monthly_savings?: number | null } | null)?.monthly_savings ?? null,
        })
      );
    }
    loadHistory();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setInput(q);
      window.history.replaceState({}, "", "/chat");
    }
  }, []);

  // Scroll to bottom on initial load (instant) and on new messages (smooth)
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (!bottomRef.current) return;
    if (isInitialLoad.current && messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: "instant" });
      isInitialLoad.current = false;
    } else if (!isInitialLoad.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  async function loadMoreMessages() {
    if (!userId || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const supabase = createClient();
    const oldest = messages[0];
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .lt("created_at", oldest.created_at)
      .limit(30);
    if (data && data.length > 0) {
      const older = (data as ChatMessage[]).reverse();
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.length === 30);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }

  async function submitFeedback(msgId: string, feedback: 'up' | 'down') {
    setMessageFeedback((prev) => ({ ...prev, [msgId]: feedback }));
    // Store in Supabase (best-effort, no error shown to user)
    const supabase = createClient();
    await supabase.from("chat_messages").update({
      metadata: { feedback }
    }).eq("id", msgId);
  }

  async function clearHistory() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setMessages([]);
    setTodayMessageCount(0);
    setShowClearDialog(false);
    toast.success("Historique effacé");
  }

  async function sendMessage(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamingText("");

    // AbortController so user can cancel or navigate away cleanly
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      role: "user",
      content: messageText,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTodayMessageCount((c) => c + 1);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errorData = await res.json();
          if (errorData.upgradeRequired) {
            setShowUpgrade(true);
            toast.error("Limite de messages atteinte");
            return;
          }
          toast.error("Trop de requêtes — attendez quelques secondes.");
          return;
        }
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setStreamingText(fullText);
              }
              if (parsed.error) {
                toast.error(parsed.error, { duration: 6000 });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      if (fullText) {
        const assistantMsg: ChatMessage = {
          id: `temp-${Date.now()}-assistant`,
          user_id: userId,
          role: "assistant",
          content: fullText,
          metadata: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setFollowUpSuggestions(getContextualSuggestions(fullText));

        // Fire-and-forget memory update — updates Alex's cross-session memory
        fetch("/api/ai/update-memory", { method: "POST" }).catch(() => {});
      }
      setStreamingText("");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User navigated away or cancelled — silent
      } else {
        const msg = err?.message?.includes("Failed to fetch")
          ? "Connexion interrompue. Vérifiez votre réseau."
          : "Une erreur est survenue. Réessayez.";
        toast.error(msg, { duration: 5000 });
      }
      // Remove the optimistic user message if no response came
      if (!streamingText) {
        setMessages((prev) => prev.filter(m => m.id !== userMsg.id));
        setTodayMessageCount((c) => Math.max(0, c - 1));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const atLimit = isFree && todayMessageCount >= limits.chatPerDay;

  return (
    <div className="flex h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-none mb-0.5">Conseiller IA</h2>
            <p className="text-[10px] text-muted-foreground font-medium">
              Gemini 2.5 · Flash · Disponible 24/7
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => setShowClearDialog(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-sm flex flex-col min-h-0">
        <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 sm:px-5 scroll-smooth">
          <div className="py-6 space-y-0.5">

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadMoreMessages}
                  disabled={loadingMore}
                  className="text-xs text-primary/60 hover:text-primary flex items-center gap-1.5 transition-colors"
                >
                  {loadingMore ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span>↑</span>
                  )}
                  Charger les messages précédents
                </button>
              </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && !streaming && (
              isSimple ? (
                /* Simple mode — welcoming start screen */
                <div className="flex flex-col items-center justify-center gap-6 py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ton conseiller financier IA</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      Pose n&apos;importe quelle question sur tes finances. Je connais ton profil et ton portefeuille.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                    {[
                      { emoji: "📊", q: "Explique-moi mon portefeuille en termes simples" },
                      { emoji: "💰", q: "Combien devrais-je mettre dans mon CELI ?" },
                      { emoji: "🎯", q: "Comment atteindre mon objectif plus rapidement ?" },
                      { emoji: "🏦", q: "CELI ou REER : lequel choisir pour moi ?" },
                    ].map(({ emoji, q }) => (
                      <button key={q}
                        onClick={() => setInput(q)}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="text-xl shrink-0">{emoji}</span>
                        <span className="text-xs font-medium text-foreground leading-snug">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Advanced mode — Alex opens the conversation */
                <div className="flex flex-col py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Alex's opening bubble */}
                  <div className="flex items-start gap-3 mb-5">
                    <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 mt-5">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-muted-foreground mb-1.5">Alex · Conseiller IA</p>
                      <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3 text-sm leading-relaxed max-w-[340px]">
                        Bonjour&nbsp;!&nbsp;👋 Je suis <strong>Alex</strong>, votre conseiller financier IA.
                        <br /><br />
                        Posez-moi n&apos;importe quelle question sur vos finances — aucune n&apos;est trop simple.
                        <br /><br />
                        Par où voulez-vous commencer&nbsp;?
                      </div>
                    </div>
                  </div>

                  {/* Suggestion cards — single column, aligned with bubble */}
                  <div className="flex flex-col gap-2 w-full max-w-[380px] ml-12">
                    {suggestions.map((s, i) => {
                      const Icon = SUGGESTION_ICONS[i] ?? Sparkles;
                      return (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-background/70 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                        >
                          <div className="h-7 w-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-medium leading-snug text-foreground/80 group-hover:text-foreground transition-colors">
                            {s}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* Message list */}
            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1];
              const isNewDay =
                !prevMsg ||
                new Date(msg.created_at).toDateString() !==
                new Date(prevMsg.created_at).toDateString();
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200 group"
                >
                  {isNewDay && <MessageDate date={msg.created_at} />}

                  <div
                    className={cn(
                      "flex gap-3 py-1.5",
                      isUser ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* AI avatar */}
                    {!isUser && (
                      <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm mt-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "flex flex-col gap-1",
                        isUser
                          ? "items-end max-w-[72%]"
                          : "items-start max-w-[88%]"
                      )}
                    >
                      <div
                        className={cn(
                          "break-words",
                          isUser
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm"
                            : "rounded-2xl rounded-tl-sm"
                        )}
                      >
                        {isUser ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        ) : (
                          <ChatMarkdown content={msg.content} />
                        )}
                      </div>
                      {!isUser && i === messages.length - 1 && !streaming && followUpSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {followUpSuggestions.map((s, si) => (
                            <button
                              key={si}
                              onClick={() => sendMessage(s)}
                              className="text-[10px] font-semibold text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-full border border-primary/10 hover:border-primary/25 transition-all whitespace-nowrap"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {!isUser && !streaming && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => submitFeedback(msg.id, 'up')}
                            className={`p-1 rounded transition-colors ${messageFeedback[msg.id] === 'up' ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-500'}`}
                          >
                            <span className="text-xs">👍</span>
                          </button>
                          <button
                            onClick={() => submitFeedback(msg.id, 'down')}
                            className={`p-1 rounded transition-colors ${messageFeedback[msg.id] === 'down' ? 'text-red-400' : 'text-muted-foreground/40 hover:text-red-400'}`}
                          >
                            <span className="text-xs">👎</span>
                          </button>
                        </div>
                      )}
                      <span
                        className={cn(
                          "text-[9px] font-medium text-muted-foreground/35 px-1",
                          isUser ? "text-right" : "text-left"
                        )}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("fr-CA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming */}
            {streaming && (
              <div className="flex gap-3 py-1.5 animate-in fade-in duration-200">
                <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm mt-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                </div>
                <div className="flex flex-col gap-1 items-start max-w-[88%]">
                  {streamingText ? (
                    <div className="break-words">
                      <ChatMarkdown content={streamingText} />
                      <span className="inline-block h-3.5 w-0.5 bg-primary/70 animate-pulse ml-0.5 align-middle rounded-full" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 py-3">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-2 w-2 rounded-full bg-primary/50 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input area ── */}
        <div className="shrink-0 p-3 border-t border-border/30 bg-background/30 backdrop-blur-md">

          {/* Quick suggestions */}
          {messages.length > 0 && !streaming && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              {(isElite ? suggestions : suggestions.slice(0, 2)).map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="flex-shrink-0 text-[10px] font-semibold text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/25 transition-all whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Textarea + send */}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                atLimit
                  ? "Limite de messages atteinte..."
                  : "Posez votre question..."
              }
              className="min-h-[44px] max-h-[140px] flex-1 resize-none bg-background/60 rounded-xl border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-sm py-3 px-4 shadow-none leading-relaxed"
              rows={1}
              disabled={streaming || atLimit}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Message counter */}
          {!isElite && limits.chatPerDay > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-0.5 w-14 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    todayMessageCount >= limits.chatPerDay
                      ? "bg-destructive"
                      : "bg-primary"
                  )}
                  style={{
                    width: `${Math.min(100, (todayMessageCount / limits.chatPerDay) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[9px] font-medium text-muted-foreground/50">
                {todayMessageCount}/{limits.chatPerDay} messages aujourd&apos;hui
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer disclaimer ── */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/35 font-medium">
        <Lock className="h-2.5 w-2.5" />
        Données chiffrées · Outil d&apos;aide à la décision uniquement
      </div>

      {/* ── Dialogs ── */}
      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Messages IA illimités"
      />

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Effacer l&apos;historique</DialogTitle>
            <DialogDescription>
              Cette action supprimera définitivement tous vos messages. Cette
              opération est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={clearHistory}>
              Effacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
