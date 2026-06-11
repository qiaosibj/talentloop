import { NextResponse } from "next/server";
import { ChatState } from "@talentloop/chat-extractor";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { buildInterviewer } from "@/lib/interview";
import { guard } from "@/lib/ratelimit";

const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_TURNS = 60;

/**
 * Stateless chat endpoint: the client owns the talent pool (local-first)
 * and the conversation state, and sends both with every turn — works on
 * serverless with no session store and no server-side candidate database.
 *
 * POST { candidate, jd }                  → opening message + fresh state
 * POST { candidate, jd, state, message }  → next turn
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: {
    candidate?: ResumeProfile;
    jd?: JdRequirement;
    state?: ChatState;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { candidate, jd } = body;
  if (!candidate?.id || !jd?.id || !jd.title) {
    return NextResponse.json({ error: "Provide { candidate, jd }" }, { status: 400 });
  }
  if (body.message && body.message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` }, { status: 400 });
  }
  if (body.state && body.state.history.length > MAX_HISTORY_TURNS) {
    return NextResponse.json({ error: "This conversation is too long — please start over." }, { status: 400 });
  }

  // Abuse protection: each turn costs two LLM calls.
  const limited = guard(req, { name: "chat", perIp: 40, windowMs: 10 * 60_000, dailyMax: 2_000 });
  if (limited) return limited;

  const { extractor, context, mode } = buildInterviewer(candidate, jd);

  try {
    if (!body.state || !body.message) {
      const step = await extractor.open(context);
      return NextResponse.json({ ...step, mode });
    }
    const step = await extractor.chat(body.state, body.message);
    return NextResponse.json({ ...step, mode });
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json({ error: "Conversation engine error, please retry" }, { status: 500 });
  }
}
