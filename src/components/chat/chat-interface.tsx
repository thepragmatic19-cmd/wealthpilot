"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Loader2, Bot, User, AlertTriangle, Lock } from "lucide-react";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { Badge } from "@/components/ui/badge";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useSubscription } from "@/hooks/use-subscription";
import type { ChatMessage } from "@/types/database";

const SUGGESTIONS = [
  "Quel portefeuille me recommandez-vous et pourquoi?",
  "Comment optimiser mes comptes CELI et REER?",
  "Quels sont les risques de mon portefeuille actuel?",
  "Comment atteindre mes objectifs de retraite?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [userId, setUserId] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [todayMessageCount, setTodayMessageCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isFree, limits } = useSubscription();

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) {
        setMessages(data as ChatMessage[]);
        // Count today's user messages
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = (data as ChatMessage[]).filter(
          (m) => m.role === "user" && new Date(m.created_at) >= todayStart
        ).length;
        setTodayMessageCount(todayCount);
      }
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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

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
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Disclaimer */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
        <span className="text-muted-foreground">
          WealthPilot est un outil d&apos;aide à la décision et ne remplace pas un conseiller financier agréé.
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <Bot className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Conseiller IA WealthPilot</h3>
                <p className="text-sm text-muted-foreground">
                  Posez-moi vos questions sur vos investissements, votre portefeuille ou vos objectifs financiers.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="h-auto whitespace-normal text-left text-sm"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    IA
                  </AvatarFallback>
                </Avatar>
              )}
              <Card
                className={`max-w-[80%] ${msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : ""
                  }`}
              >
                <CardContent className="p-3">
                  {msg.role === "assistant" ? (
                    <ChatMarkdown content={msg.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </CardContent>
              </Card>
              {msg.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {streaming && streamingText && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  IA
                </AvatarFallback>
              </Avatar>
              <Card className="max-w-[80%]">
                <CardContent className="p-3">
                  <ChatMarkdown content={streamingText} />
                  <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-0.5" />
                </CardContent>
              </Card>
            </div>
          )}

          {streaming && !streamingText && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  IA
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                En train de réfléchir...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message counter for free users */}
      {isFree && limits.chatPerDay > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={todayMessageCount >= limits.chatPerDay ? "destructive" : "secondary"} className="text-xs">
            {todayMessageCount}/{limits.chatPerDay} messages aujourd&apos;hui
          </Badge>
          {todayMessageCount >= limits.chatPerDay && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Limite atteinte
            </span>
          )}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isFree && todayMessageCount >= limits.chatPerDay
              ? "Limite de messages atteinte..."
              : "Posez votre question..."
          }
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={streaming || (isFree && todayMessageCount >= limits.chatPerDay)}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || streaming}
          size="icon"
          className="h-[44px] w-[44px] shrink-0"
        >
          {streaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Quick suggestions when there are messages */}
      {messages.length > 0 && !streaming && (
        <div className="mt-2 flex flex-wrap gap-1">
          {SUGGESTIONS.slice(0, 2).map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="h-auto text-xs px-2 py-1"
              onClick={() => sendMessage(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      <UpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Messages IA illimités"
      />
    </div>
  );
}
