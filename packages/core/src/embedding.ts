/**
 * Embedder abstraction.
 *
 * `HashEmbedder` is a deterministic, offline embedder (token + character
 * bigram feature hashing) so the whole pipeline can run in demos and tests
 * without any API key. Similarity scores from different embedders live on
 * different scales — match thresholds are therefore configuration, not
 * constants (see @talentloop/match-engine).
 */

export interface Embedder {
  readonly dims: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** FNV-1a 32-bit hash. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class HashEmbedder implements Embedder {
  readonly dims: number;

  constructor(dims = 384) {
    this.dims = dims;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): number[] {
    const vec = new Array<number>(this.dims).fill(0);
    for (const token of this.tokens(text)) {
      const idx = fnv1a(token) % this.dims;
      const sign = fnv1a(`s:${token}`) % 2 === 0 ? 1 : -1;
      vec[idx] += sign;
    }
    return l2normalize(vec);
  }

  /** Words + character bigrams; CJK characters are treated as single tokens. */
  private tokens(text: string): string[] {
    const words = text.toLowerCase().match(/[a-zà-öø-ÿ0-9+#]+|[一-鿿]/g) ?? [];
    const out: string[] = [];
    for (const w of words) {
      out.push(w);
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
    }
    return out;
  }
}

export interface OpenAIEmbedderConfig {
  apiKey: string;
  /** e.g. "text-embedding-3-small" */
  model?: string;
  baseUrl?: string;
  dims?: number;
  /**
   * Endpoint path appended to baseUrl. Default "/v1/embeddings" (OpenAI).
   * Some providers use a different prefix — e.g. Zhipu: baseUrl
   * "https://open.bigmodel.cn/api/paas/v4" with path "/embeddings".
   */
  path?: string;
}

/** OpenAI-compatible embeddings endpoint adapter. */
export class OpenAIEmbedder implements Embedder {
  readonly dims: number;

  constructor(private cfg: OpenAIEmbedderConfig) {
    this.dims = cfg.dims ?? 1536;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.cfg.baseUrl ?? "https://api.openai.com"}${this.cfg.path ?? "/v1/embeddings"}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model ?? "text-embedding-3-small",
        input: texts,
      }),
    });
    if (!res.ok) throw new Error(`Embedding API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}

export function l2normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}
