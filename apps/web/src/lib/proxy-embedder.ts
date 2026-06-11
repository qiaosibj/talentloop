"use client";

import type { Embedder } from "@talentloop/core";
import { idbGet, idbSet } from "./idb";

/**
 * Client-side embedder that delegates to the server proxy (/api/embed),
 * keeping provider API keys strictly server-side.
 *
 * Vectors are cached per portrait text and persisted to IndexedDB, so
 * re-running the match — even after a page refresh — only embeds portraits
 * that are new or changed. (pgvector is the server-side scale-up path.)
 */
const VEC_KEY = "talentloop:vectors:v1";
const CACHE_CAP = 5000;

const vectorCache = new Map<string, number[]>();
let cacheLoaded = false;

async function ensureCacheLoaded(): Promise<void> {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const stored = await idbGet<Record<string, number[]>>(VEC_KEY);
    if (stored) for (const [k, v] of Object.entries(stored)) vectorCache.set(k, v);
  } catch {
    /* cold cache is fine */
  }
}

async function persistCache(): Promise<void> {
  try {
    await idbSet(VEC_KEY, Object.fromEntries(vectorCache));
  } catch (err) {
    console.warn("vector cache persist failed", err);
  }
}

export class ProxyEmbedder implements Embedder {
  readonly dims = 2048;

  async embed(texts: string[]): Promise<number[][]> {
    await ensureCacheLoaded();
    const missing = [...new Set(texts.filter((t) => !vectorCache.has(t)))];

    if (missing.length > 0) {
      // Chunk to respect the server's per-request cap.
      const CHUNK = 250;
      const vectors: number[][] = [];
      for (let i = 0; i < missing.length; i += CHUNK) {
        const res = await fetch("/api/embed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texts: missing.slice(i, i + CHUNK) }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Embedding proxy error ${res.status}`);
        }
        const data = (await res.json()) as { vectors: number[][] };
        vectors.push(...data.vectors);
      }
      if (vectorCache.size + missing.length > CACHE_CAP) vectorCache.clear();
      missing.forEach((t, i) => vectorCache.set(t, vectors[i]));
      void persistCache();
    }

    return texts.map((t) => vectorCache.get(t)!);
  }
}
