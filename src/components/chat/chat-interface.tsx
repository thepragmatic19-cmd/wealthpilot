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
  goals: Array<{ label: string; target_date: string | null }>;
}

function buildSuggestions(ctx: ClientContext): string[] {
  const suggestions: string[] = [];

  if (ctx.hasPortfolio) {
    suggestions.push("Analyse détaillée de mon portefeuille");
    suggestions.push("Comment rééquilibrer mon portefeuille ?");
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
  } else {
    suggestions.push("Comment définir mes objectifs financiers ?");
  }

  if (ctx.hasCeli && ctx.hasReer) {
    suggestions.push("Optimiser la répartition CELI vs REER");
  } else if (!ctx.hasCeli) {
    suggestions.push("Devrais-je ouvrir un CELI ?");
  } else if (!ctx.hasReer) {
    suggestions.push("Est-ce que le REER vaut le coup pour moi ?");
  } else {
    suggestions.push("Stratégie d'épargne mensuelle");
  }

  suggestions.push("Simuler ma retraite à 60 ans");
  return suggestions.slice(0, 4);
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

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [userId, setUserId] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [todayMessageCount, setTodayMessageCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isFree, isElite, limits } = useSubscription();

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [
        { data },
        { data: portfolio },
        { data: goals },
        { data: clientInfo },
      ] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
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
          .select("has_celi, has_reer")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (data) {
        setMessages(data as ChatMessage[]);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = (data as ChatMessage[]).filter(
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
          goals: (goals ?? []) as Array<{
            label: string;
            target_date: string | null;
          }>,
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
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errorData = await res.json();
          if (errorData.upgradeRequired) {
            setShowUpgrade(true);
            toast.error("Limite de messages atteinte");
            return;
          }
        }
        throw new Error("API error");
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
              if (parsed.error) toast.error(parsed.error);
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `temp-${Date.now()}-assistant`,
        user_id: userId,
        role: "assistant",
        content: fullText,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");
    } catch {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setStreaming(false);
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
    <div className="flex flex-col gap-3" style={{ height: 'calc(100dvh - 8rem)' }}>

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
              Llama 3.3 · 70B · Disponible 24/7
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
        <div ref={messagesRef} className="flex-1 overflow-y-auto scroll-touch px-4 sm:px-5 scroll-smooth">
          <div className="py-6 space-y-0.5">

            {/* Empty state */}
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center py-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative mb-7">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl scale-[2] animate-pulse" />
                  <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/30">
                    <Sparkles className="h-9 w-9 text-white" />
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-1.5 tracking-tight">
                  Bonjour, je suis votre conseiller IA
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-9 leading-relaxed">
                  Posez-moi n&apos;importe quelle question sur votre situation financière
                </p>

                <div className="grid grid-cols-2 gap-2.5 w-full max-w-[420px] px-1">
                  {suggestions.map((s, i) => {
                    const Icon = SUGGESTION_ICONS[i] ?? Sparkles;
                    return (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        className="group flex flex-col items-start gap-2.5 p-4 rounded-2xl bg-background/70 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-left shadow-sm hover:shadow-md"
                      >
                        <div className="h-8 w-8 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs font-medium leading-snug text-foreground/80 group-hover:text-foreground transition-colors">
                          {s}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
                  className="animate-in fade-in slide-in-from-bottom-1 duration-200"
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
                  className="flex-shrink-0 text-[10px] font-semibold text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-full border border-primary/10 hover:border-primary/25 transition-all whitespace-nowrap active:scale-95"
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
              inputMode="text"
              className="min-h-[44px] max-h-[140px] flex-1 resize-none bg-background/60 rounded-xl border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-sm py-3 px-4 shadow-none leading-relaxed"
              rows={1}
              disabled={streaming || atLimit}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-11 w-11 sm:h-11 sm:w-11 rounded-xl shrink-0 shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
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
