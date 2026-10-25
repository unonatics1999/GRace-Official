"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Do I need an ID to book with a driver?", "How do I pay?", "How do I list my car?", "Can I cancel?"];

/** Chat with the help assistant; answers stream in as they're written. */
export function HelpAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
        bottom.current?.scrollIntoView({ block: "nearest" });
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "Something went wrong. Try again.";
      setMessages([...history, { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-stone-100 bg-brand-900 px-5 py-4 text-white">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-sm font-bold text-brand-900">AI</span>
        <div>
          <p className="font-semibold">Ask GRace</p>
          <p className="text-xs text-brand-100">Instant answers from our help articles</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-stone-600">Hi! Ask me anything about renting, drivers, payments or listing your car.</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs hover:border-brand-600 hover:text-brand-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 ${
                  m.role === "user" ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-800"
                }`}
              >
                {m.content.replace(/\*\*/g, "") || (busy ? "…" : "")}
              </p>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-stone-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Type your question…"
          className="input flex-1"
          aria-label="Your question"
        />
        <button className="btn-primary" disabled={busy || !input.trim()}>
          {busy ? "…" : "Ask"}
        </button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-stone-400">AI answers can be wrong. For a specific booking or payment, contact support.</p>
    </div>
  );
}
