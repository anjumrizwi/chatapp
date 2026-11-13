import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WEBHOOK = "https://arwatech.app.n8n.cloud/webhook-test/mychatapp";

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ message: z.string().min(1).max(8000), sessionId: z.string().max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: data.message, sessionId: data.sessionId }),
    });
    const text = await res.text();
    if (!res.ok) return { reply: `The assistant is unavailable right now (status ${res.status}).` };
    try {
      const j = JSON.parse(text);
      const o = Array.isArray(j) ? j[0] : j;
      const reply = typeof o === "string" ? o : o?.output ?? o?.reply ?? o?.response ?? o?.message ?? o?.text ?? JSON.stringify(o);
      return { reply: String(reply) };
    } catch {
      return { reply: text || "No response received." };
    }
  });
