import { Embedder, InMemoryVectorStore, VectorStore, cosine } from "@talentloop/core";
import { ResumeProfile } from "@talentloop/resume-parser";
import { JdRequirement } from "@talentloop/jd-parser";
import {
  attractionScores,
  educationFitScore,
  experienceFitScore,
  intentFitScore,
  mustHaveScore,
  skillScore,
  weightedSum,
} from "./features";
import { buildFullPortrait, buildJdPortrait, buildPrimaryPortrait } from "./text";
import { DEFAULT_WEIGHTS, NEURAL_EMBEDDER_CONFIG } from "./weights";
import { FitScores, MatchConfig, MatchLayer, Opportunity, OpportunityTier, WeightProfiles } from "./types";

const NS_PRIMARY = "portrait:primary";
const NS_FULL = "portrait:full";
const NS_JD = "jd";

export interface MatchEngineOptions {
  embedder: Embedder;
  store?: VectorStore;
  weights?: WeightProfiles;
  config?: MatchConfig;
}

/**
 * Reverse talent-pool matcher.
 *
 * Design decisions carried over from a production system I built previously
 * (re-implemented from scratch here):
 *  - Dual portraits per candidate: "primary" (intention + latest role) vs.
 *    "full" (entire history). A primary hit means likely active interest;
 *    a full-only hit is a broader, more speculative match.
 *  - Fit (M) and attraction (A) are scored separately: M decides whether the
 *    person can do the job, A decides whether the job can win the person.
 *  - "Optimal" requires at least one STRONG fit signal —
 *    max(semantic, experienceFit, intentFit) — never the weighted average
 *    alone. A pure semantic floor mis-kills true matches whose semantic
 *    score is low but whose role history matches exactly, and a pure
 *    average lets keyword-only lookalikes through.
 *  - Offer attributes never enter embeddings, so re-pricing a job requires
 *    re-scoring (cheap) but never re-embedding (expensive).
 */
export class MatchEngine {
  private embedder: Embedder;
  private store: VectorStore;
  private weights: WeightProfiles;
  private config: MatchConfig;
  private profiles = new Map<string, ResumeProfile>();
  private jds = new Map<string, JdRequirement>();

  constructor(opts: MatchEngineOptions) {
    this.embedder = opts.embedder;
    this.store = opts.store ?? new InMemoryVectorStore();
    this.weights = opts.weights ?? DEFAULT_WEIGHTS;
    this.config = opts.config ?? NEURAL_EMBEDDER_CONFIG;
  }

  /** Embed and index candidates and jobs. Embeds in one batch per kind. */
  async index(input: { profiles?: ResumeProfile[]; jds?: JdRequirement[] }): Promise<void> {
    const profiles = input.profiles ?? [];
    const jds = input.jds ?? [];

    if (profiles.length > 0) {
      const primaryVecs = await this.embedder.embed(profiles.map(buildPrimaryPortrait));
      const fullVecs = await this.embedder.embed(profiles.map(buildFullPortrait));
      profiles.forEach((p, i) => {
        this.profiles.set(p.id, p);
        this.store.upsert(NS_PRIMARY, p.id, primaryVecs[i]);
        this.store.upsert(NS_FULL, p.id, fullVecs[i]);
      });
    }
    if (jds.length > 0) {
      const jdVecs = await this.embedder.embed(jds.map(buildJdPortrait));
      jds.forEach((jd, i) => {
        this.jds.set(jd.id, jd);
        this.store.upsert(NS_JD, jd.id, jdVecs[i]);
      });
    }
  }

  /** Match every indexed candidate against one job. */
  matchJd(jdId: string): Opportunity[] {
    const jd = this.jds.get(jdId);
    if (!jd) throw new Error(`Unknown jd: ${jdId}`);
    const out: Opportunity[] = [];
    for (const profile of this.profiles.values()) out.push(this.scorePair(profile, jd));
    return out.sort((a, b) => b.matchScore - a.matchScore);
  }

  /** For one candidate, find their best opportunities across all indexed jobs. */
  matchPerson(personId: string): Opportunity[] {
    const profile = this.profiles.get(personId);
    if (!profile) throw new Error(`Unknown person: ${personId}`);
    const out: Opportunity[] = [];
    for (const jd of this.jds.values()) out.push(this.scorePair(profile, jd));
    return out.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Reactivation sweep: for every candidate keep their best opportunity.
   * This is the "wake up the dormant pool" view — person-centric, not job-centric.
   */
  reactivationBoard(): Opportunity[] {
    const out: Opportunity[] = [];
    for (const personId of this.profiles.keys()) {
      const best = this.matchPerson(personId)[0];
      if (best) out.push(best);
    }
    const tierOrder: Record<OpportunityTier, number> = { optimal: 0, probe: 1, explore: 2 };
    return out.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || b.matchScore - a.matchScore);
  }

  private scorePair(profile: ResumeProfile, jd: JdRequirement): Opportunity {
    const jdVec = this.store.get(NS_JD, jd.id)!;
    const primaryVec = this.store.get(NS_PRIMARY, profile.id)!;
    const fullVec = this.store.get(NS_FULL, profile.id)!;

    const intentSemantic = cosine(primaryVec, jdVec);
    const broadSemantic = cosine(fullVec, jdVec);
    const semantic = Math.max(intentSemantic, broadSemantic);

    const fit: FitScores = {
      semantic,
      mustHave: mustHaveScore(profile, jd),
      skills: skillScore(profile, jd),
      experienceFit: experienceFitScore(profile, jd),
      educationFit: educationFitScore(profile, jd),
      intentFit: intentFitScore(profile, jd),
    };
    const attraction = attractionScores(profile, jd);

    const w = this.weights[jd.category];
    const matchScore = weightedSum(fit, w.fit);
    const attractionScore = weightedSum(attraction, w.attraction);

    const layer = this.classifyLayer(matchScore, intentSemantic);
    const tier = this.classifyTier(profile, fit, matchScore, attractionScore);

    return {
      personId: profile.id,
      personName: profile.basics.name,
      jdId: jd.id,
      jdTitle: jd.title,
      layer,
      tier,
      matchScore: round(matchScore),
      attractionScore: round(attractionScore),
      fit: roundAll(fit),
      attraction: roundAll(attraction),
      explain: explain(profile, jd, fit, attraction, tier),
    };
  }

  private classifyLayer(matchScore: number, intentSemantic: number): MatchLayer {
    const c = this.config;
    if (matchScore < c.probeFloor) return "explore";
    return intentSemantic >= c.intentSemanticFloor ? "intent" : "broad";
  }

  private classifyTier(
    profile: ResumeProfile,
    fit: FitScores,
    matchScore: number,
    attractionScore: number,
  ): OpportunityTier {
    const c = this.config;
    const strongFitSignal = Math.max(fit.semantic, fit.experienceFit, fit.intentFit);
    const hasWorkHistory = profile.experiences.length > 0;
    if (
      matchScore >= c.matchFloor &&
      attractionScore >= c.optimalAttractionFloor &&
      hasWorkHistory &&
      strongFitSignal >= c.optimalFitFloor
    ) {
      return "optimal";
    }
    return matchScore >= c.probeFloor ? "probe" : "explore";
  }
}

function explain(
  profile: ResumeProfile,
  jd: JdRequirement,
  fit: FitScores,
  attraction: ReturnType<typeof attractionScores>,
  tier: OpportunityTier,
): string[] {
  const out: string[] = [];
  if (fit.experienceFit >= 0.6) out.push(`Recent role closely matches "${jd.title}"`);
  else if (fit.experienceFit >= 0.3) out.push(`Related work history for "${jd.title}"`);
  if (fit.intentFit >= 0.6) out.push("Stated job intention points at this role");
  if (fit.mustHave >= 0.99) out.push("All hard requirements satisfied");
  else if (fit.mustHave < 0.5 && jd.mustHave.length > 0) out.push("Some hard requirements unmet — verify before outreach");
  if (fit.skills >= 0.6) out.push("Strong skill overlap");
  if (attraction.salary >= 0.8) out.push("Offer meets or beats salary expectation");
  else if (attraction.salary <= 0.3) out.push("Offer is below stated salary expectation");
  if (attraction.location >= 0.99) out.push("Same location");
  if (profile.derived) out.push("Profile enriched by AI role inference (no job titles on resume)");
  if (tier === "explore") out.push("Weak direct match — reach via inferred career direction only");
  return out;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function roundAll<T extends { [K in keyof T]: number }>(scores: T): T {
  const out = {} as T;
  for (const k of Object.keys(scores) as Array<keyof T>) out[k] = round(scores[k]) as T[keyof T];
  return out;
}
