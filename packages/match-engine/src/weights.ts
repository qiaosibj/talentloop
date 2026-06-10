import { MatchConfig, WeightProfiles } from "./types";

/**
 * Per-category weight profiles. Rationale:
 *  - blue-collar: certifications/hard requirements and pay/commute dominate
 *  - sales: track record and intent matter more than formal education
 *  - technical: skills and semantic similarity dominate, education matters
 *  - general: balanced default
 *
 * v0 numbers are reasoned priors, meant to be tuned against labeled
 * outcomes (interview-accept rate per tier) once real feedback exists.
 */
export const DEFAULT_WEIGHTS: WeightProfiles = {
  "blue-collar": {
    fit: { semantic: 0.15, mustHave: 0.3, skills: 0.2, experienceFit: 0.2, educationFit: 0.05, intentFit: 0.1 },
    attraction: { salary: 0.35, benefits: 0.15, level: 0.05, location: 0.3, brand: 0.05, industry: 0.1 },
  },
  sales: {
    fit: { semantic: 0.2, mustHave: 0.15, skills: 0.15, experienceFit: 0.3, educationFit: 0.05, intentFit: 0.15 },
    attraction: { salary: 0.35, benefits: 0.1, level: 0.15, location: 0.15, brand: 0.15, industry: 0.1 },
  },
  technical: {
    fit: { semantic: 0.25, mustHave: 0.15, skills: 0.3, experienceFit: 0.15, educationFit: 0.1, intentFit: 0.05 },
    attraction: { salary: 0.3, benefits: 0.15, level: 0.15, location: 0.15, brand: 0.1, industry: 0.15 },
  },
  general: {
    fit: { semantic: 0.2, mustHave: 0.2, skills: 0.2, experienceFit: 0.15, educationFit: 0.1, intentFit: 0.15 },
    attraction: { salary: 0.3, benefits: 0.15, level: 0.1, location: 0.2, brand: 0.1, industry: 0.15 },
  },
};

/** Calibrated for neural embedders (cosine ≈ 0.3–0.9 range). */
export const NEURAL_EMBEDDER_CONFIG: MatchConfig = {
  matchFloor: 0.5,
  probeFloor: 0.4,
  optimalFitFloor: 0.6,
  optimalAttractionFloor: 0.62,
  intentSemanticFloor: 0.5,
};

/** Calibrated for the offline HashEmbedder (much lower cosine range). */
export const HASH_EMBEDDER_CONFIG: MatchConfig = {
  matchFloor: 0.32,
  probeFloor: 0.24,
  optimalFitFloor: 0.35,
  optimalAttractionFloor: 0.6,
  intentSemanticFloor: 0.12,
};
