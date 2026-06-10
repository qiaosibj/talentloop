"use client";

import type { Opportunity } from "@talentloop/match-engine";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import type { OutreachTemplate, Pool } from "./store";

/** Fill an outreach template with real values from one opportunity. */
export function fillTemplate(
  template: OutreachTemplate,
  opp: Opportunity,
  candidate: ResumeProfile,
  jd: JdRequirement,
): string {
  const firstName = (candidate.basics.name ?? "there").split(" ")[0];
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/interview/${candidate.id}?jd=${jd.id}`
      : `/interview/${candidate.id}?jd=${jd.id}`;
  const values: Record<string, string> = {
    name: firstName,
    jobTitle: jd.title,
    company: jd.company ?? "our client",
    location: jd.location ?? "your area",
    topReason: opp.explain[0] ?? "Your background stood out to us",
    link,
  };
  let text = template.body;
  for (const [key, value] of Object.entries(values)) {
    text = text.split(`{${key}}`).join(value);
  }
  // Strip any leftover placeholders defensively.
  return text.replace(/\{[a-zA-Z]+\}/g, "").replace(/ {2,}/g, " ");
}

export function templateForTier(pool: Pool, tier: Opportunity["tier"]): OutreachTemplate {
  return pool.templates.find((t) => t.tier === tier) ?? pool.templates[0];
}
