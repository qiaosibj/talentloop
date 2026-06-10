/**
 * End-to-end reactivation demo — runs fully offline (HashEmbedder, no API key).
 *
 *   npm run demo
 *
 * Loads synthetic candidates + jobs, indexes dual portraits, and prints the
 * reactivation board: for every dormant candidate, their best opportunity,
 * classified as optimal / probe / explore.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HashEmbedder } from "@talentloop/core";
import { ResumeProfile } from "@talentloop/resume-parser";
import { JdRequirement } from "@talentloop/jd-parser";
import { HASH_EMBEDDER_CONFIG, MatchEngine, Opportunity } from "@talentloop/match-engine";

const DATA_DIR = join(__dirname, "..", "..", "data", "synthetic");

async function main(): Promise<void> {
  const profiles = JSON.parse(readFileSync(join(DATA_DIR, "resumes.sample.json"), "utf8")) as ResumeProfile[];
  const jds = JSON.parse(readFileSync(join(DATA_DIR, "jds.sample.json"), "utf8")) as JdRequirement[];

  const engine = new MatchEngine({
    embedder: new HashEmbedder(),
    // Thresholds are embedder-specific; these are calibrated for HashEmbedder.
    config: HASH_EMBEDDER_CONFIG,
  });

  await engine.index({ profiles, jds });
  console.log(`Indexed ${profiles.length} candidates × ${jds.length} open positions\n`);

  const board = engine.reactivationBoard();

  const byTier: Record<string, Opportunity[]> = { optimal: [], probe: [], explore: [] };
  for (const opp of board) byTier[opp.tier].push(opp);

  const tierLabel: Record<string, string> = {
    optimal: "🟢 OPTIMAL — contact first",
    probe: "🟡 PROBE — low-cost outreach",
    explore: "⚪ EXPLORE — via inferred direction only",
  };

  for (const tier of ["optimal", "probe", "explore"] as const) {
    console.log(`${tierLabel[tier]} (${byTier[tier].length})`);
    console.log("─".repeat(72));
    for (const opp of byTier[tier]) {
      console.log(
        `  ${(opp.personName ?? opp.personId).padEnd(18)} → ${opp.jdTitle.padEnd(42)} ` +
          `fit ${opp.matchScore.toFixed(2)} · attraction ${opp.attractionScore.toFixed(2)} · layer ${opp.layer}`,
      );
      for (const reason of opp.explain) console.log(`      · ${reason}`);
    }
    console.log();
  }

  // Job-centric view for one position.
  const jd = jds[0];
  console.log(`Top candidates for "${jd.title}":`);
  console.log("─".repeat(72));
  for (const opp of engine.matchJd(jd.id).slice(0, 3)) {
    console.log(`  ${(opp.personName ?? opp.personId).padEnd(18)} fit ${opp.matchScore.toFixed(2)} (${opp.tier})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
