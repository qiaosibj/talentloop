"use client";

import { HashEmbedder } from "@talentloop/core";
import { HASH_EMBEDDER_CONFIG, MatchEngine, Opportunity } from "@talentloop/match-engine";
import type { Pool } from "./store";

/**
 * Matching runs entirely in the browser: the engine and the offline
 * embedder are plain TypeScript, so the talent pool never has to leave
 * the device to be matched. (Server-side pgvector is the scale-up path.)
 */
export interface BoardResult {
  opportunities: Opportunity[];
  byTier: { optimal: Opportunity[]; probe: Opportunity[]; explore: Opportunity[] };
  ranAt: number;
}

export async function runMatch(pool: Pool, jobId?: string): Promise<BoardResult> {
  const engine = new MatchEngine({ embedder: new HashEmbedder(), config: HASH_EMBEDDER_CONFIG });
  await engine.index({ profiles: pool.candidates, jds: pool.jobs });

  const opportunities = jobId ? engine.matchJd(jobId) : engine.reactivationBoard();

  return {
    opportunities,
    byTier: {
      optimal: opportunities.filter((o) => o.tier === "optimal"),
      probe: opportunities.filter((o) => o.tier === "probe"),
      explore: opportunities.filter((o) => o.tier === "explore"),
    },
    ranAt: Date.now(),
  };
}
