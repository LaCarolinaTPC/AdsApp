"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { ErrorBanner } from "@/components/ui/States";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Cómo va esta campaña?",
  "¿Qué debería mejorar?",
  "¿Por qué no tiene conversiones?",
  "Dame 3 consejos accionables",
];

export function CampaignChat({
  campaignCacheId,
  campaignName,
}: {
  campaignCacheId: string;
  campaignName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carga el historial de ESTA campaña al montar / cambiar de campaña
  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    fetch(`/api/ai/chat?campaignCacheId=${campaignCacheId}`)
      .then((r) => r.json())
      .then((j) => {
        if (active && j.messages) {
          setMessages(
            j.messages.map((m: Msg) => ({
              role: m.role,
              content: m.content,
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => active && setLoadingHistory(false));
    return () => {
      active = false;
    };
  }, [campaignCacheId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignCacheId, message: q }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error en el chat");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: json.reply },
      ]);
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => m.slice(0, -1)); // revierte el optimista
      setInput(q);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[520px] flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-lg bg-slate-50 p-4"
      >
        {loadingHistory ? (
          <p className="text-center text-sm text-slate-400">
            Cargando conversación…
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="mb-2 h-8 w-8 text-brand-500" />
            <p className="font-medium text-slate-700">
              Pregúntale a la IA sobre «{campaignName}»
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Solo responde sobre esta campaña. Prueba con una de estas:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                m.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-brand-600 ring-1 ring-slate-200"
                }`}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-600 ring-1 ring-slate-200">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pregunta algo sobre «${campaignName}»…`}
          disabled={sending}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Enviar
        </button>
      </form>
    </div>
  );
}
