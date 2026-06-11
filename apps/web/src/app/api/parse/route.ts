import { NextResponse } from "next/server";
import { parseResume } from "@talentloop/resume-parser";
import { parseJd } from "@talentloop/jd-parser";
import { selectLlm } from "@/lib/llm";
import { guard } from "@/lib/ratelimit";

/**
 * AI parsing endpoint: raw resume / JD text → structured object.
 * Requires a real LLM; in demo mode we say so honestly instead of
 * pretending a scripted engine can parse arbitrary text.
 *
 * POST { kind: "resume" | "jd", text: string, id?: string }
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { kind?: string; text?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text || (body.kind !== "resume" && body.kind !== "jd")) {
    return NextResponse.json({ error: "Provide { kind: 'resume' | 'jd', text }" }, { status: 400 });
  }

  const limited = guard(req, { name: "parse", perIp: 15, windowMs: 10 * 60_000, dailyMax: 500 });
  if (limited) return limited;

  const { llm, mode } = selectLlm();
  if (mode === "demo") {
    return NextResponse.json(
      {
        error:
          "AI parsing needs a real model. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) on the server, or use the structured form instead.",
        mode,
      },
      { status: 422 },
    );
  }

  try {
    if (body.kind === "resume") {
      const profile = await parseResume(text, { llm, id: body.id });
      return NextResponse.json({ profile, mode });
    }
    const jd = await parseJd(text, { llm, id: body.id });
    return NextResponse.json({ jd, mode });
  } catch (err) {
    console.error("parse error", err);
    return NextResponse.json({ error: "Parsing failed, please retry" }, { status: 500 });
  }
}
