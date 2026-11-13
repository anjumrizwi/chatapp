import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) });

export const draftReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ messages: z.array(Msg).min(1).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "Me" : "Assistant"}: ${m.content}`)
      .join("\n");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You draft the user's next reply in a chat. Using the conversation context, write one concise, natural reply (1-2 sentences) the user could send in response to the assistant's latest message. Output only the reply text.",
        input: transcript,
      });
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      return { draft: text, error: null as string | null };
    } catch (e) {
      console.error("draftReply failed", e instanceof GatewayError ? e.code : e);
      return { draft: "", error: "Couldn't draft a reply right now." };
    }
  });
