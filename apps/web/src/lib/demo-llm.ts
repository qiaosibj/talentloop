import type { LlmClient, LlmOptions } from "@talentloop/core";

/**
 * Deterministic offline stand-in for a real LLM so the public demo runs
 * without any API key. It understands the two prompt shapes produced by
 * @talentloop/chat-extractor:
 *
 *  - dialogue prompts → a friendly canned reply asking the next open question
 *  - extraction prompts ("Return ONLY JSON") → maps user turns to slots in
 *    asking order, which is exactly what a real extractor would conclude for
 *    a cooperative conversation
 *
 * Set ANTHROPIC_API_KEY or OPENAI_API_KEY to switch to a real model.
 */
export class DemoLlm implements LlmClient {
  async complete(prompt: string, _opts?: LlmOptions): Promise<string> {
    if (prompt.includes("Return ONLY JSON")) return this.extract(prompt);
    if (prompt.includes("Open the conversation")) return this.opening(prompt);
    return this.dialogue(prompt);
  }

  private opening(prompt: string): string {
    const firstQuestion = prompt.match(/ask the FIRST question only \("([^"]+)"\)/)?.[1] ?? "your current situation";
    const background = prompt.match(/Background: ([^.\n]+)/)?.[1]?.trim();
    return (
      `Hi! Thanks for taking a moment. You were in touch with us a while back, and a position just opened up that looks like a genuinely strong match` +
      (background ? ` for someone with your background as ${background}` : ` for your background`) +
      ` — I'd love to tell you more about it as we chat. No pressure at all. To start: how would you describe ${lower(firstQuestion)} right now?`
    );
  }

  private dialogue(prompt: string): string {
    const stillToLearn = prompt.match(/Still to learn \(ask at most ONE per turn, in this order\): ([^\n]+)/)?.[1] ?? "";
    const next = stillToLearn.split(";")[0]?.trim();
    if (!next || stillToLearn.startsWith("nothing")) {
      return "That's everything I needed — thank you! I'll pass this along to the hiring team and you'll hear back within two working days. Have a great day!";
    }
    const userTurns = (prompt.match(/^User: /gm) ?? []).length;
    const ack = ACKS[(userTurns - 1 + ACKS.length) % ACKS.length];
    const ask = ASK_PHRASES[userTurns % ASK_PHRASES.length];
    return `${ack} ${ask} ${lower(next)}?`;
  }

  private extract(prompt: string): string {
    // Slots in asking order, as embedded in the extraction prompt.
    const slotsJson = prompt.match(/Slots: (\[.*?\])\n/s)?.[1] ?? "[]";
    let keys: string[] = [];
    try {
      keys = (JSON.parse(slotsJson) as Array<{ key: string }>).map((s) => s.key);
    } catch {
      keys = [];
    }
    // User turns in order: turn N answers slot N (cooperative-conversation assumption).
    const userTurns = [...prompt.matchAll(/^User: (.+)$/gm)].map((m) => m[1].trim());
    const slots: Record<string, string> = {};
    userTurns.forEach((answer, i) => {
      if (keys[i] && answer) slots[keys[i]] = answer;
    });
    const done = userTurns.length >= keys.length && keys.length > 0;
    const quickReplies = done ? [] : QUICK_REPLIES[Math.min(userTurns.length, QUICK_REPLIES.length - 1)];
    return JSON.stringify({ slots, quickReplies, done });
  }
}

const QUICK_REPLIES: string[][] = [
  ["Open to opportunities", "Happily employed, but curious", "Actively looking"],
  ["Same role as before", "I've changed roles since", "Currently between jobs"],
  ["A project I led recently", "Hit my targets this year", "Rather keep that for later"],
  ["Full-time only", "Open to flexible hours", "Remote would be ideal"],
  ["Similar to my last salary", "Looking for a step up", "Depends on the package"],
];

const ACKS = [
  "Got it — that's really helpful, thanks.",
  "That makes sense, appreciate the detail.",
  "Nice — that's genuinely impressive.",
  "Understood, good to know.",
  "Perfect, thanks for being open about that.",
];

const ASK_PHRASES = [
  "One more thing: could you tell me about",
  "Next up — what about",
  "I'd also love to hear about",
  "And lastly, may I ask about",
  "Could you also share",
];

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
