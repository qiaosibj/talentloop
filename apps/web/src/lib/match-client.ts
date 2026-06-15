"use client";

import { HashEmbedder } from "@talentloop/core";
import {
  HASH_EMBEDDER_CONFIG,
  MatchEngine,
  NEURAL_EMBEDDER_CONFIG,
  Opportunity,
} from "@talentloop/match-engine";
import { ProxyEmbedder } from "./proxy-embedder";
import { isRetainable, type Pool } from "./store";

/**
 * Matching runs in the browser. Vectorization uses the best available
 * engine:
 *  - a real embedding provider via the server proxy (keys stay server-side),
 *    with thresholds calibrated for neural embedders
 *  - otherwise the offline HashEmbedder — zero API calls, demo-grade
 * If the proxy fails mid-run, we fall back to offline and keep working.
 */
export interface BoardResult {
  opportunities: Opportunity[];
  byTier: { optimal: Opportunity[]; probe: Opportunity[]; explore: Opportunity[] };
  ranAt: number;
  /** Which semantic engine produced this run, e.g. "zhipu embedding-3" or "offline hash". */
  embedMode: string;
  /** Candidates excluded from this run because they declined/withdrew/expired consent. */
  excludedForConsent: number;
}

let capabilityCache: Promise<string> | null = null;

function embedCapability(): Promise<string> {
  if (!capabilityCache) {
    capabilityCache = fetch("/api/embed")
      .then((r) => r.json())
      .then((d: { mode?: string }) => d.mode ?? "demo")
      .catch(() => "demo");
  }
  return capabilityCache;
}

export async function runMatch(pool: Pool, jobId?: string): Promise<BoardResult> {
  const mode = await embedCapability();

  if (mode !== "demo") {
    try {
      return await runWith(pool, jobId, new ProxyEmbedder(), NEURAL_EMBEDDER_CONFIG, mode);
    } catch (err) {
      console.warn("Server embedding failed, falling back to offline embedder:", err);
      capabilityCache = Promise.resolve("demo");
    }
  }
  return runWith(pool, jobId, new HashEmbedder(), HASH_EMBEDDER_CONFIG, "offline hash");
}

async function runWith(
  pool: Pool,
  jobId: string | undefined,
  embedder: HashEmbedder | ProxyEmbedder,
  config: typeof NEURAL_EMBEDDER_CONFIG,
  embedMode: string,
): Promise<BoardResult> {
  // Consent gate: candidates who declined, withdrew, or whose retention
  // window lapsed are excluded from matching — the lawful basis to keep
  // working with their data is gone.
  const eligible = pool.candidates.filter(isRetainable);
  const excludedForConsent = pool.candidates.length - eligible.length;

  const engine = new MatchEngine({ embedder, config });
  await engine.index({ profiles: eligible, jds: pool.jobs });
  const opportunities = jobId ? engine.matchJd(jobId) : engine.reactivationBoard();
  return {
    opportunities,
    excludedForConsent,
    byTier: {
      optimal: opportunities.filter((o) => o.tier === "optimal"),
      probe: opportunities.filter((o) => o.tier === "probe"),
      explore: opportunities.filter((o) => o.tier === "explore"),
    },
    ranAt: Date.now(),
    embedMode,
  };
}
