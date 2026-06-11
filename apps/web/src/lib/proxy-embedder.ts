"use client";

import type { Embedder } from "@talentloop/core";

/**
 * Client-side embedder that delegates to the server proxy (/api/embed),
 * keeping provider API keys strictly server-side. The match engine never
 * reads `dims`, so it is informational only.
 */
export class ProxyEmbedder implements Embedder {
  readonly dims = 2048;

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("/api/embed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Embedding proxy error ${res.status}`);
    }
    const data = (await res.json()) as { vectors: number[][] };
    return data.vectors;
  }
}
