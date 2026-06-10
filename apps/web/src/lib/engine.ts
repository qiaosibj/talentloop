import { HashEmbedder } from "@talentloop/core";
import { HASH_EMBEDDER_CONFIG, MatchEngine, Opportunity } from "@talentloop/match-engine";
import { JDS, RESUMES } from "./data";

/**
 * Engine singleton. Indexing 8 demo candidates with the offline HashEmbedder
 * takes < 5 ms, so re-initializing per serverless invocation is fine.
 */
let enginePromise: Promise<MatchEngine> | null = null;

export function getEngine(): Promise<MatchEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const engine = new MatchEngine({ embedder: new HashEmbedder(), config: HASH_EMBEDDER_CONFIG });
      await engine.index({ profiles: RESUMES, jds: JDS });
      return engine;
    })();
  }
  return enginePromise;
}

export interface BoardData {
  optimal: Opportunity[];
  probe: Opportunity[];
  explore: Opportunity[];
  candidateCount: number;
  jobCount: number;
}

export async function getBoard(): Promise<BoardData> {
  const engine = await getEngine();
  const board = engine.reactivationBoard();
  return {
    optimal: board.filter((o) => o.tier === "optimal"),
    probe: board.filter((o) => o.tier === "probe"),
    explore: board.filter((o) => o.tier === "explore"),
    candidateCount: RESUMES.length,
    jobCount: JDS.length,
  };
}
