"use client";

import type { Embedder } from "@talentloop/core";

/**
 * Client-side embedder that delegates to the server proxy (/api/embed),
 * keeping provider API keys strictly server-side.
 *
 * Vectors are cached in-memory per text, so re-running the match only
 * embeds portraits that are new or changed — repeated runs cost zero API
 * calls. (Persistent vector storage is the pgvector roadmap item.)
 */
const vectorCache = new Map<string, number[]>();
const CACHE_CAP = 20000;

export class ProxyEmbedder implements Embedder {
  readonly dims = 2048;

  async embed(texts: string[]): Promise<number[][]> {
    const missing = [...new Set(texts.filter((t) => !vectorCache.has(t)))];

    if (missing.length > 0) {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texts: missing }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Embedding proxy error ${res.status}`);
      }
      const data = (await res.json()) as { vectors: number[][] };
      if (vectorCache.size + missing.length > CACHE_CAP) vectorCache.clear();
      missing.forEach((t, i) => vectorCache.set(t, data.vectors[i]));
    }

    return texts.map((t) => vectorCache.get(t)!);
  }
}
