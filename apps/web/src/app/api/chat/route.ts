import { NextResponse } from "next/server";
import { ChatState } from "@talentloop/chat-extractor";
import { findJd, findResume } from "@/lib/data";
import { buildInterviewer } from "@/lib/interview";

/**
 * Stateless chat endpoint: the client holds the conversation state and sends
 * it with every turn, so this works on serverless without any session store.
 *
 * POST { personId, jdId }                  → opening message + fresh state
 * POST { personId, jdId, state, message }  → next turn
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: { personId?: string; jdId?: string; state?: ChatState; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidate = body.personId ? findResume(body.personId) : undefined;
  const jd = body.jdId ? findJd(body.jdId) : undefined;
  if (!candidate || !jd) {
    return NextResponse.json({ error: "Unknown candidate or job" }, { status: 404 });
  }

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
