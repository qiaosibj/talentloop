import { JobCategory } from "@talentloop/jd-parser";

/** Candidate-fit dimensions (how well the person fits the job). */
export interface FitScores {
  /** Embedding similarity between candidate portrait and JD text. */
  semantic: number;
  /** Fraction of hard requirements satisfied. */
  mustHave: number;
  /** Skill / certification overlap. */
  skills: number;
  /** Past roles vs. target role. */
  experienceFit: number;
  /** Education level vs. requirement. */
  educationFit: number;
  /** Candidate's stated intention vs. this job. */
  intentFit: number;
}

/** Job-attraction dimensions (how attractive the job is for the person). */
export interface AttractionScores {
  salary: number;
  benefits: number;
  level: number;
  location: number;
  brand: number;
  industry: number;
}

export interface DimensionWeights<T> {
  weights: { [K in keyof T]: number };
}

export interface WeightProfile {
  fit: { [K in keyof FitScores]: number };
  attraction: { [K in keyof AttractionScores]: number };
}

export type WeightProfiles = Record<JobCategory, WeightProfile>;

/**
 * Which portrait produced the match:
 *  - intent: primary portrait (intention + latest experience) — candidate is likely actively interested
 *  - broad:  full portrait (entire history) — plausible but less certain
 *  - explore: below floor — only reachable via inferred directions
 */
export type MatchLayer = "intent" | "broad" | "explore";

/**
 * Opportunity tier:
 *  - optimal: strong fit signal + attractive offer → contact first
 *  - probe:   plausible → low-cost outreach to test interest
 *  - explore: weak direct match → only via AI-inferred career directions
 */
export type OpportunityTier = "optimal" | "probe" | "explore";

export interface Opportunity {
  personId: string;
  personName?: string;
  jdId: string;
  jdTitle: string;
  layer: MatchLayer;
  tier: OpportunityTier;
  /** Weighted fit score in [0,1]. */
  matchScore: number;
  /** Weighted attraction score in [0,1]. */
  attractionScore: number;
  fit: FitScores;
  attraction: AttractionScores;
  /** Human-readable reasons — business language only, no internal jargon. */
  explain: string[];
}

/**
 * All thresholds are configuration because semantic-similarity scales differ
 * per embedder (a hash embedder and a neural embedder produce very different
 * cosine ranges). Calibrate once per embedder.
 */
export interface MatchConfig {
  /** Min weighted fit score for a direct (intent/broad) match. */
  matchFloor: number;
  /** Min weighted fit score for a probe; below this → explore. */
  probeFloor: number;
  /** Optimal needs at least one strong fit signal: max(semantic, experienceFit, intentFit) ≥ this. */
  optimalFitFloor: number;
  /** Optimal needs the offer to actually be attractive. */
  optimalAttractionFloor: number;
  /** Semantic floor for counting a primary-portrait hit as the "intent" layer. */
  intentSemanticFloor: number;
}
