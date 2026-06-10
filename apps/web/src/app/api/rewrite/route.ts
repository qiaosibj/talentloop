import { NextResponse } from "next/server";
import { selectLlm } from "@/lib/llm";

/**
 * AI rewrite for outreach messages: keeps facts and the link, improves tone.
 * POST { text: string, instructions?: string }
 * Demo mode returns the original text untouched, flagged as such.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { text?: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Provide { text }" }, { status: 400 });

  const { llm, mode } = selectLlm();
  if (mode === "demo") {
    return NextResponse.json({ text, mode, note: "Demo mode — set an API key to enable AI rewriting." });
  }

  try {
    const rewritten = await llm.complete(
      [
        "Rewrite this candidate outreach message. Keep every fact, name and URL exactly as they are. Make it warm, concise and professional. Keep the opt-out line.",
        body.instructions ? `Extra instructions: ${body.instructions}` : "",
        `Message:\n"""\n${text}\n"""`,
        "Return only the rewritten message, no commentary.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      { temperature: 0.6 },
    );
    return NextResponse.json({ text: rewritten.trim(), mode });
  } catch (err) {
    console.error("rewrite error", err);
    return NextResponse.json({ error: "Rewrite failed, please retry" }, { status: 500 });
  }
}
