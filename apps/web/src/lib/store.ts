"use client";

import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { JDS, RESUMES } from "./data";
import { idbGet, idbSet } from "./idb";

/**
 * Local-first storage: the entire talent pool lives in the browser
 * (IndexedDB — hundreds of MB of headroom, enough for tens of thousands of
 * candidates). Candidate data never leaves the user's device unless an AI
 * feature is explicitly invoked — a deliberate privacy posture for an HR
 * tool, not a shortcut.
 */

export interface OutreachTemplate {
  id: string;
  name: string;
  tier: "optimal" | "probe" | "explore";
  body: string;
}

/**
 * What came back from the candidate conversation. Conversation data
 * overrides stored resume data — the person talking now outranks a stale
 * document — and the freshness is surfaced across the app.
 */
export interface CandidateEngagement {
  status: "engaged" | "applied";
  at: number;
  jdId: string;
  jdTitle: string;
  answers: Record<string, string>;
}

export type PoolCandidate = ResumeProfile & { engagement?: CandidateEngagement };

export interface Pool {
  candidates: PoolCandidate[];
  jobs: JdRequirement[];
  templates: OutreachTemplate[];
}

const KEY = "talentloop:pool:v1";

export const DEFAULT_TEMPLATES: OutreachTemplate[] = [
  {
    id: "tpl-optimal",
    name: "Strong match — direct invite",
    tier: "optimal",
    body:
      "Hi {name}, you were in touch with {company} a while back — and a role just opened that genuinely fits your background: {jobTitle} in {location}. {topReason}. " +
      "If you're open to a quick, no-pressure chat, just tap here: {link}\n\nReply STOP to opt out.",
  },
  {
    id: "tpl-probe",
    name: "Possible match — soft check-in",
    tier: "probe",
    body:
      "Hi {name}, we spoke some time ago about opportunities at {company}. We now have a {jobTitle} opening in {location} that might interest you. {topReason}. " +
      "Curious? You can answer four quick questions whenever it suits you: {link}\n\nReply STOP to opt out.",
  },
  {
    id: "tpl-explore",
    name: "New direction — exploratory note",
    tier: "explore",
    body:
      "Hi {name}, based on what you told us earlier, a different kind of role could suit you: {jobTitle} at {company} in {location}. It may be outside your usual path — that's exactly why we thought of you. " +
      "Take a look when you have a minute: {link}\n\nReply STOP to opt out.",
  },
];

function seed(): Pool {
  return {
    candidates: RESUMES,
    jobs: JDS,
    templates: DEFAULT_TEMPLATES,
  };
}

export async function loadPool(): Promise<Pool> {
  if (typeof window === "undefined") return seed();
  try {
    const fromIdb = await idbGet<Pool>(KEY);
    if (fromIdb) {
      if (!fromIdb.templates?.length) fromIdb.templates = DEFAULT_TEMPLATES;
      return fromIdb;
    }
    // One-time migration from the earlier localStorage version.
    const legacy = window.localStorage.getItem(KEY);
    if (legacy) {
      const pool = JSON.parse(legacy) as Pool;
      if (!pool.templates?.length) pool.templates = DEFAULT_TEMPLATES;
      await idbSet(KEY, pool);
      window.localStorage.removeItem(KEY);
      return pool;
    }
    const fresh = seed();
    await idbSet(KEY, fresh);
    return fresh;
  } catch {
    return seed();
  }
}

export async function savePool(pool: Pool): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbSet(KEY, pool);
  } catch (err) {
    console.error("savePool failed", err);
  }
}

export async function resetPool(): Promise<Pool> {
  const fresh = seed();
  await savePool(fresh);
  return fresh;
}

export function findCandidate(pool: Pool, id: string): PoolCandidate | undefined {
  return pool.candidates.find((c) => c.id === id);
}

/**
 * Write conversation results back into the pool (the "loop" in TalentLoop):
 * - engagement status + extracted answers stored on the candidate
 * - a parseable salary expectation updates the matching input directly,
 *   so the next "Run matching" reflects what the person just said
 * - "applied" never downgrades to "engaged"
 */
export async function recordEngagement(
  candidateId: string,
  engagement: CandidateEngagement,
): Promise<void> {
  const pool = await loadPool();
  const candidate = pool.candidates.find((c) => c.id === candidateId);
  if (!candidate) return;
  if (candidate.engagement?.status === "applied" && engagement.status === "engaged") {
    candidate.engagement = { ...engagement, status: "applied" };
  } else {
    candidate.engagement = engagement;
  }
  const salary = parseSalaryText(engagement.answers.salaryExpectation);
  if (salary) {
    candidate.intention = { ...candidate.intention, salaryMin: salary };
  }
  await savePool(pool);
}

/** "around 48k", "48.000 €", "55000-60000" → annual number (lower bound). */
export function parseSalaryText(s?: string): number | undefined {
  if (!s) return undefined;
  const cleaned = s.toLowerCase().replace(/[€$£\s,]/g, (m) => (m === "," ? "." : ""));
  const m = cleaned.match(/(\d+(?:\.\d+)?)(k)?/);
  if (!m) return undefined;
  let value = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, ""));
  if (isNaN(value)) return undefined;
  if (m[2] === "k" || value < 1000) value *= 1000;
  if (value < 5000 || value > 2_000_000) return undefined;
  return Math.round(value);
}

export function findJob(pool: Pool, id: string): JdRequirement | undefined {
  return pool.jobs.find((j) => j.id === id);
}

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
