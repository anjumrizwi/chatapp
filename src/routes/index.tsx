import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { sendChat } from "@/lib/chat.functions";
import { draftReply } from "@/lib/draft.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genius — Smart Chat Assistant" },
      { name: "description", content: "A clean, minimal dark chat with a smart genius assistant." },
      { property: "og:title", content: "Genius — Smart Chat Assistant" },
      { property: "og:description", content: "A clean, minimal dark chat with a smart genius assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chat,
});

type Msg = { role: "user" | "assistant"; content: string; draft?: string; drafting?: boolean };

function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [autoDraft, setAutoDraft] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function makeDraft(history: Msg[]) {
    const idx = history.length - 1;
    setMessages((m) => m.map((x, i) => (i === idx ? { ...x, drafting: true } : x)));
    try {
      const { draft, error } = await draftReply({
        data: { messages: history.slice(-20).map(({ role, content }) => ({ role, content })) },
      });
      setMessages((m) => m.map((x, i) => (i === idx ? { ...x, drafting: false, draft: draft || error || "" } : x)));
    } catch {
      setMessages((m) => m.map((x, i) => (i === idx ? { ...x, drafting: false, draft: "Couldn't draft a reply right now." } : x)));
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const withUser: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(withUser);
    setLoading(true);
    try {
      const { reply } = await sendChat({ data: { message: text, sessionId } });
      const next: Msg[] = [...withUser, { role: "assistant", content: reply }];
      setMessages(next);
      if (autoDraft) void makeDraft(next);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex w-full items-end gap-2 rounded-3xl border border-border bg-secondary px-4 py-3"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        rows={1}
        placeholder="Ask anything"
        className="max-h-48 flex-1 resize-none bg-transparent py-1.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        aria-label="Send"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition disabled:opacity-30"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </form>
  );

  return (
    <div className="dark">
      <div className="flex h-screen flex-col bg-background text-foreground">
        <header className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold">Genius</span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={autoDraft} onChange={(e) => setAutoDraft(e.target.checked)} className="accent-foreground" />
            Draft replies
          </label>
        </header>
        {empty ? (
          <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-24">
            <h1 className="text-center text-2xl font-medium sm:text-3xl">
              How can I help you today? I'm a smart genius assistant.
            </h1>
            <div className="w-full max-w-3xl">{composer}</div>
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-3xl bg-secondary px-5 py-2.5">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="whitespace-pre-wrap leading-7">{m.content}</div>
                      {(m.drafting || m.draft) && (
                        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="flex-1">
                            {m.drafting ? "Drafting a reply…" : m.draft}
                          </div>
                          {!m.drafting && m.draft && (
                            <button type="button" onClick={() => setInput(m.draft!)} className="shrink-0 text-foreground hover:underline">
                              Use
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}
                {loading && <div className="h-3 w-3 animate-pulse rounded-full bg-foreground" />}
                <div ref={endRef} />
              </div>
            </main>
            <div className="mx-auto w-full max-w-3xl px-4 pb-6">{composer}</div>
          </>
        )}
      </div>
    </div>
  );
}
