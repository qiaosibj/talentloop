import { NextResponse } from "next/server";
import { Embedder, OpenAIEmbedder } from "@talentloop/core";

/**
 * Server-side embedding proxy: the matching engine runs in the browser,
 * but API keys must never reach the client — so vectorization calls come
 * through here. Provider chosen by env:
 *
 *  - ZHIPU_API_KEY                → Zhipu embedding-3 (multilingual, 2048-dim)
 *  - EMBEDDING_API_KEY (+ _BASE_URL/_MODEL) → any OpenAI-compatible endpoint
 *  - neither                      → "demo": client falls back to the offline HashEmbedder
 */
function serverEmbedder(): { embedder: Embedder | null; mode: string } {
  if (process.env.ZHIPU_API_KEY) {
    return {
      embedder: new OpenAIEmbedder({
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        path: "/embeddings",
        model: process.env.ZHIPU_EMBED_MODEL ?? "embedding-3",
        dims: 2048,
      }),
      mode: "zhipu embedding-3",
    };
  }
  if (process.env.EMBEDDING_API_KEY) {
    return {
      embedder: new OpenAIEmbedder({
        apiKey: process.env.EMBEDDING_API_KEY,
        baseUrl: process.env.EMBEDDING_BASE_URL,
        model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
      }),
      mode: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    };
  }
  return { embedder: null, mode: "demo" };
}

/** Capability probe — the client decides which engine + thresholds to use. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ mode: serverEmbedder().mode });
}

const BATCH_SIZE = 16; // stay under provider batch limits (Zhipu: 64)
const MAX_TEXTS = 2048;
const MAX_CHARS = 3000; // keep well under embedding token limits

export async function POST(req: Request): Promise<NextResponse> {
  let body: { texts?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const texts = body.texts;
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS) {
    return NextResponse.json({ error: `Provide { texts: string[] } (1–${MAX_TEXTS} items)` }, { status: 400 });
  }

  const { embedder, mode } = serverEmbedder();
  if (!embedder) {
    return NextResponse.json(
      { error: "No embedding provider configured — set ZHIPU_API_KEY (or EMBEDDING_API_KEY).", mode },
      { status: 422 },
    );
  }

  try {
    const clipped = texts.map((t) => String(t).slice(0, MAX_CHARS));
    const vectors: number[][] = [];
    for (let i = 0; i < clipped.length; i += BATCH_SIZE) {
      vectors.push(...(await embedder.embed(clipped.slice(i, i + BATCH_SIZE))));
    }
    return NextResponse.json({ vectors, mode });
  } catch (err) {
    console.error("embed error", err);
    return NextResponse.json({ error: "Embedding provider error, please retry" }, { status: 502 });
  }
}
