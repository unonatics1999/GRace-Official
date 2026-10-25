import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { helpKnowledgeBase, searchHelp } from "@/lib/help-content";

// Help-center assistant. Answers only from the help articles, streams plain text back.
// Without Anthropic credentials (ANTHROPIC_API_KEY), it answers with the closest articles instead.

const SYSTEM_PROMPT = `You are the help assistant for GRace, a Philippine car-rental marketplace where verified owners rent out their cars, either self-drive or with the owner as driver.

Answer questions from renters and car owners using only the help articles below. Keep answers short and friendly: two to four sentences, plain words, peso amounts as ₱. If the articles don't cover the question, or it's about a specific booking, payment or account problem, say you're not sure and suggest contacting GRace support from the help page; never guess at policies, prices or legal requirements. Don't ask for or repeat passwords, ID numbers or card details. Reply in the language the user writes in (English, Filipino or Taglish).

# Help articles

${helpKnowledgeBase()}`;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(12),
});

// Per-IP limit: 20 questions per 10 minutes. In-memory, so it applies per server instance.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > LIMIT;
}

function fallbackAnswer(question: string): string {
  const matches = searchHelp(question);
  if (matches.length === 0) {
    return "I couldn't find an article about that. Please contact GRace support from the help page and we'll get back to you.";
  }
  return `Here's what I found:\n\n${matches.map((a) => `**${a.question}**\n${a.answer}`).join("\n\n")}`;
}

const client = new Anthropic();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return new Response("You're asking a lot of questions! Please wait a few minutes.", { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return new Response("Invalid request.", { status: 400 });
  }
  const { messages } = parsed.data;
  const question = messages.at(-1)!.content;

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Response(fallbackAnswer(question), { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Help-Mode": "articles" } });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 4000,
          // Short help answers don't need deep reasoning.
          output_config: { effort: "low" },
          // If the model declines, the API retries on a suitable fallback model in the same call.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          // The articles are identical on every request, so cache them.
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages,
        });
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\nI can't help with that one. Please contact GRace support."));
        }
      } catch (error) {
        console.error("help chat failed", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
        controller.enqueue(encoder.encode(fallbackAnswer(question)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Help-Mode": "ai" } });
}
