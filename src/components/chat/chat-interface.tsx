"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Loader2, Bot, User, Lock, Trash2, Sparkles, PlusCircle } from "lucide-react";
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
    const urgentGoal = ctx.goals.find(g => g.target_date && new Date(g.target_date) < new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000));
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
    <div className="flex justify-center my-6">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/30 px-3 py-1 rounded-full border border-border/50">
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isFree, isElite, limits } = useSubscription();

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const [{ data }, { data: portfolio }, { data: goals }, { data: clientInfo }] = await Promise.all([
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
        supabase
          .from("goals")
          .select("label, target_date")
          .eq("user_id", user.id),
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

      // Build contextual suggestions
      setSuggestions(buildSuggestions({
        hasPortfolio: !!portfolio,
        hasGoals: (goals ?? []).length > 0,
        hasCeli: clientInfo?.has_celi ?? false,
        hasReer: clientInfo?.has_reer ?? false,
        goals: (goals ?? []) as Array<{ label: string; target_date: string | null }>,
      }));
    }
    loadHistory();
  }, []);

  useEffect(() => {
    // Check for query param
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setInput(q);
      window.history.replaceState({}, "", "/chat");
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth"
        });
      }
    }
  }, [messages, streamingText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function clearHistory() {
    const supabase = createClient();
    await supabase.from("chat_messages").delete().eq("user_id", userId);
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

    // Optimistically add user message
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
              if (parsed.error) {
                toast.error(parsed.error);
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Add assistant message
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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
           </div>
           <div>
              <h2 className="text-sm font-bold tracking-tight">Conseiller IA WealthPilot</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Disponible 24/7
              </div>
           </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setShowClearDialog(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border bg-card/30 backdrop-blur-sm shadow-inner flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-2">
                <div className="relative mb-6">
                  <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                  <div className="relative h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="text-center max-w-sm px-4">
                  <h3 className="text-lg font-bold mb-2">Comment puis-je vous aider ?</h3>
                  <p className="text-sm text-muted-foreground mb-8">
                    Je suis votre expert financier personnel, prêt à analyser vos actifs et optimiser votre stratégie.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 w-full max-w-lg px-4">
                  {suggestions.map((s, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto py-3.5 px-4 justify-start items-start text-left text-xs bg-background/50 border-border/50 hover:border-primary/50 transition-all group whitespace-normal break-words"
                      onClick={() => sendMessage(s)}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-2 text-primary opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
                      <span className="flex-1">{s}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1];
              const isNewDay = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

              return (
                <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {isNewDay && <MessageDate date={msg.created_at} />}
                  <div className={cn("flex gap-3 mb-1", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-8 w-8 shrink-0 border shadow-sm mt-1", msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <AvatarFallback className="text-[10px] font-bold">
                        {msg.role === "assistant" ? "WP" : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "group relative flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm break-words overflow-hidden w-full",
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-background border rounded-tl-none"
                      )}>
                        {msg.role === "assistant" ? (
                          <ChatMarkdown content={msg.content} />
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        "text-[9px] font-medium opacity-40 px-1",
                        msg.role === "user" ? "text-right" : "text-left"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString("fr-CA", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {streaming && streamingText && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                <Avatar className="h-8 w-8 shrink-0 bg-primary text-primary-foreground border shadow-sm mt-1">
                  <AvatarFallback className="text-[10px] font-bold">WP</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] items-start">
                  <div className="rounded-2xl rounded-tl-none bg-background border px-4 py-3 shadow-sm break-words overflow-hidden w-full">
                    <ChatMarkdown content={streamingText} />
                    <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1 align-middle" />
                  </div>
                </div>
              </div>
            )}

            {streaming && !streamingText && (
              <div className="flex gap-3 animate-pulse">
                <Avatar className="h-8 w-8 shrink-0 bg-primary/20 border-dashed">
                  <AvatarFallback className="text-[10px] font-bold opacity-30">WP</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-2xl bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Le pilote analyse vos données...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-background/50 border-t backdrop-blur-md">
          <div className="relative group">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isFree && todayMessageCount >= limits.chatPerDay
                  ? "Limite de messages atteinte..."
                  : "Comment puis-je optimiser mon capital ?"
              }
              className="min-h-[52px] max-h-[160px] w-full resize-none bg-background/80 pr-12 pl-4 py-3.5 rounded-2xl border-border/60 focus-visible:ring-primary/20 shadow-sm transition-all group-hover:border-primary/30"
              rows={1}
              disabled={streaming || (isFree && todayMessageCount >= limits.chatPerDay)}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          
      {/* Message counter for non-elite users */}
      {!isElite && limits.chatPerDay > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-700",
                  todayMessageCount >= limits.chatPerDay ? "bg-destructive" : "bg-primary"
                )} 
                style={{ width: `${Math.min(100, (todayMessageCount / limits.chatPerDay) * 100)}%` }} 
              />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
              {todayMessageCount}/{limits.chatPerDay} Messages
            </span>
          </div>

          {messages.length > 0 && !streaming && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {suggestions.slice(0, 2).map((s, i) => (
                <button
                  key={i}
                  className="whitespace-normal text-[9px] font-bold text-primary hover:text-primary-foreground hover:bg-primary transition-all bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 shadow-sm max-w-[140px] text-left leading-tight"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isElite && messages.length > 0 && !streaming && (
        <div className="mt-3 flex justify-end gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              className="whitespace-normal text-[9px] font-bold text-primary hover:text-primary-foreground hover:bg-primary transition-all bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 shadow-sm max-w-[140px] text-right leading-tight"
              onClick={() => sendMessage(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
        </div>
      </div>

      {/* Security Disclaimer */}
      <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-muted-foreground opacity-60">
        <Lock className="h-3 w-3" />
        Vos données sont chiffrées et privées. WealthPilot est un outil d&apos;aide à la décision.
      </div>

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
              Cette action supprimera définitivement tous vos messages. Cette opération est irréversible.
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
