import { ResumeProfile } from "@talentloop/resume-parser";
import { JdRequirement, MustHave } from "@talentloop/jd-parser";
import { AttractionScores, FitScores } from "./types";
import { profileHaystack, tokenJaccard, totalExperienceYears } from "./text";

/** Neutral value when a dimension has no data — missing data must not punish or reward. */
export const NEUTRAL = 0.5;

// ---------------------------------------------------------------------------
// Fit dimensions (semantic comes from embeddings, computed in the engine)
// ---------------------------------------------------------------------------

export function mustHaveScore(profile: ResumeProfile, jd: JdRequirement): number {
  if (jd.mustHave.length === 0) return NEUTRAL;
  const hay = profileHaystack(profile);
  let sum = 0;
  for (const req of jd.mustHave) sum += checkMustHave(req, profile, hay);
  return sum / jd.mustHave.length;
}

function checkMustHave(req: MustHave, profile: ResumeProfile, hay: string): number {
  const needle = req.value.toLowerCase();
  switch (req.type) {
    case "skill":
    case "certification":
    case "language":
      return keywordHit(hay, needle) ? 1 : 0;
    case "education": {
      const required = educationRank(needle);
      const has = Math.max(0, ...profile.education.map((e) => educationRank(`${e.degree ?? ""}`.toLowerCase())));
      if (required === 0) return NEUTRAL;
      if (has === 0) return profile.education.length === 0 ? 0 : NEUTRAL;
      return has >= required ? 1 : 0;
    }
    case "experience-years": {
      const needed = parseFloat(req.value);
      const years = totalExperienceYears(profile);
      if (profile.experiences.length === 0) return 0;
      if (isNaN(needed) || years === undefined) return NEUTRAL;
      if (years >= needed) return 1;
      return years >= needed * 0.6 ? 0.5 : 0;
    }
    default:
      return NEUTRAL;
  }
}

function keywordHit(hay: string, needle: string): boolean {
  if (hay.includes(needle)) return true;
  // Multi-word requirement: count it satisfied when most words appear.
  const words = needle.split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 2) return false;
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length >= 0.6;
}

function educationRank(text: string): number {
  if (/phd|doktor|promotion/.test(text)) return 5;
  if (/master|diplom|m\.sc|mba/.test(text)) return 4;
  if (/bachelor|b\.sc|b\.a/.test(text)) return 3;
  if (/ausbildung|vocational|apprentice|associate|technician|meister/.test(text)) return 2;
  if (/abitur|high school|secondary/.test(text)) return 1;
  return 0;
}

export function skillScore(profile: ResumeProfile, jd: JdRequirement): number {
  if (jd.skills.length === 0) return NEUTRAL;
  const candidateSkills = new Set(
    [...profile.skills, ...(profile.certifications ?? []), ...(profile.derived?.skills ?? [])].map((s) =>
      s.toLowerCase(),
    ),
  );
  if (candidateSkills.size === 0) return 0;
  let hits = 0;
  for (const want of jd.skills) {
    const w = want.toLowerCase();
    let best = 0;
    for (const have of candidateSkills) best = Math.max(best, have === w ? 1 : tokenJaccard(have, w));
    if (best >= 0.5) hits++;
  }
  return hits / jd.skills.length;
}

/** Past role titles (or AI-inferred tendency) vs. target role title. */
export function experienceFitScore(profile: ResumeProfile, jd: JdRequirement): number {
  const candidates: string[] = [
    ...profile.experiences.map((e) => e.title ?? "").filter(Boolean),
    ...(profile.derived?.roleTendency ?? []),
  ];
  if (candidates.length === 0) return profile.experiences.length === 0 ? 0 : NEUTRAL;
  let best = 0;
  for (const title of candidates) best = Math.max(best, tokenJaccard(title, jd.title));
  return best;
}

export function educationFitScore(profile: ResumeProfile, jd: JdRequirement): number {
  const eduReq = jd.mustHave.find((m) => m.type === "education");
  if (!eduReq) return NEUTRAL;
  const required = educationRank(eduReq.value.toLowerCase());
  const has = Math.max(0, ...profile.education.map((e) => educationRank(`${e.degree ?? ""}`.toLowerCase())));
  if (required === 0 || has === 0) return NEUTRAL;
  if (has >= required) return 1;
  return has === required - 1 ? 0.4 : 0;
}

/** Stated intention (target roles/industries/locations) vs. this job. */
export function intentFitScore(profile: ResumeProfile, jd: JdRequirement): number {
  const roles = [...(profile.intention?.roles ?? []), ...(profile.derived?.roleTendency ?? [])];
  if (roles.length === 0) return NEUTRAL;
  let best = 0;
  for (const role of roles) best = Math.max(best, tokenJaccard(role, jd.title));
  // Industry agreement nudges the score, never dominates it.
  const industries = profile.intention?.industries ?? [];
  if (jd.industry && industries.some((i) => tokenJaccard(i, jd.industry!) >= 0.5)) {
    best = Math.min(1, best + 0.15);
  }
  return best;
}

// ---------------------------------------------------------------------------
// Attraction dimensions (how attractive is this offer for this person)
// ---------------------------------------------------------------------------

export function attractionScores(profile: ResumeProfile, jd: JdRequirement): AttractionScores {
  return {
    salary: salaryScore(profile, jd),
    benefits: benefitsScore(jd),
    level: NEUTRAL,
    location: locationScore(profile, jd),
    brand: jd.offer.brand ? 0.7 : NEUTRAL,
    industry: industryScore(profile, jd),
  };
}

function salaryScore(profile: ResumeProfile, jd: JdRequirement): number {
  const wantMin = profile.intention?.salaryMin;
  const offerMax = jd.offer.salaryMax ?? jd.offer.salaryMin;
  if (!wantMin || !offerMax) return NEUTRAL;
  if (offerMax >= wantMin * 1.15) return 1;
  if (offerMax >= wantMin) return 0.8;
  // Below expectation: degrade proportionally, floor at 0.1.
  return Math.max(0.1, (offerMax / wantMin) * 0.6);
}

function benefitsScore(jd: JdRequirement): number {
  const n = jd.offer.benefits?.length ?? 0;
  if (n === 0) return NEUTRAL;
  return Math.min(1, 0.4 + 0.12 * n);
}

function locationScore(profile: ResumeProfile, jd: JdRequirement): number {
  const candidate = [profile.basics.location, ...(profile.intention?.locations ?? [])].filter(Boolean) as string[];
  if (!jd.location || candidate.length === 0) return NEUTRAL;
  const jdLoc = jd.location.toLowerCase();
  for (const loc of candidate) {
    const l = loc.toLowerCase();
    if (l.includes(jdLoc) || jdLoc.includes(l)) return 1;
  }
  return 0.25;
}

function industryScore(profile: ResumeProfile, jd: JdRequirement): number {
  if (!jd.industry) return NEUTRAL;
  const interests = [...(profile.intention?.industries ?? []), ...(profile.derived?.industries ?? [])];
  if (interests.length === 0) return NEUTRAL;
  for (const i of interests) if (tokenJaccard(i, jd.industry) >= 0.5) return 1;
  return 0.35;
}

// ---------------------------------------------------------------------------

export function weightedSum<T extends { [K in keyof T]: number }>(scores: T, weights: { [K in keyof T]: number }): number {
  let sum = 0;
  let wsum = 0;
  for (const key of Object.keys(scores) as Array<keyof T>) {
    sum += scores[key] * weights[key];
    wsum += weights[key];
  }
  return wsum > 0 ? sum / wsum : 0;
}

export type { FitScores };
