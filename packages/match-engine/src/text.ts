import { ResumeProfile } from "@talentloop/resume-parser";
import { JdRequirement } from "@talentloop/jd-parser";

/** Word-set Jaccard similarity, language-agnostic-ish (latin words + CJK chars). */
export function tokenJaccard(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export function tokenSet(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-zà-öø-ÿ0-9+#]+|[一-鿿]/g) ?? []);
}

/**
 * Primary portrait: what the candidate wants now + most recent experience.
 * Matches against this portrait signal likely *active interest*.
 */
export function buildPrimaryPortrait(p: ResumeProfile): string {
  const parts: string[] = [];
  if (p.intention?.roles?.length) parts.push(`Target roles: ${p.intention.roles.join(", ")}`);
  if (p.intention?.industries?.length) parts.push(`Target industries: ${p.intention.industries.join(", ")}`);
  const latest = p.experiences[0];
  if (latest) parts.push(`Latest role: ${latest.title ?? ""} ${latest.company ?? ""}. ${latest.description ?? ""}`);
  if (p.derived) parts.push(`Likely roles: ${p.derived.roleTendency.join(", ")}`);
  if (p.skills.length) parts.push(`Skills: ${p.skills.slice(0, 12).join(", ")}`);
  return parts.join("\n");
}

/** Full portrait: everything we know — used for broad/secondary matching. */
export function buildFullPortrait(p: ResumeProfile): string {
  const parts: string[] = [buildPrimaryPortrait(p)];
  for (const e of p.experiences.slice(1)) {
    parts.push(`Past role: ${e.title ?? ""} ${e.company ?? ""}. ${e.description ?? ""}`);
  }
  for (const ed of p.education) {
    parts.push(`Education: ${ed.degree ?? ""} ${ed.field ?? ""} ${ed.institution ?? ""}`);
  }
  if (p.certifications?.length) parts.push(`Certifications: ${p.certifications.join(", ")}`);
  if (p.derived) parts.push(`Inferred skills: ${p.derived.skills.join(", ")} | industries: ${p.derived.industries.join(", ")}`);
  return parts.join("\n");
}

/**
 * JD portrait: requirements + responsibilities only.
 * Offer attributes (salary etc.) deliberately stay OUT of the embedding —
 * they feed the attraction score instead, so re-pricing a job never
 * requires re-embedding anything.
 */
export function buildJdPortrait(jd: JdRequirement): string {
  const parts: string[] = [`Role: ${jd.title}`, `Category: ${jd.category}`];
  if (jd.industry) parts.push(`Industry: ${jd.industry}`);
  if (jd.mustHave.length) parts.push(`Requirements: ${jd.mustHave.map((m) => m.value).join("; ")}`);
  if (jd.skills.length) parts.push(`Skills: ${jd.skills.join(", ")}`);
  if (jd.responsibilities?.length) parts.push(`Responsibilities: ${jd.responsibilities.join("; ")}`);
  if (jd.niceToHave.length) parts.push(`Nice to have: ${jd.niceToHave.join(", ")}`);
  return parts.join("\n");
}

/** Concatenated lowercase haystack of everything in a profile, for keyword checks. */
export function profileHaystack(p: ResumeProfile): string {
  return [
    p.experiences.map((e) => `${e.title ?? ""} ${e.description ?? ""}`).join(" "),
    p.education.map((e) => `${e.degree ?? ""} ${e.field ?? ""}`).join(" "),
    p.skills.join(" "),
    (p.certifications ?? []).join(" "),
    (p.basics.languages ?? []).join(" "),
    p.derived ? p.derived.skills.join(" ") : "",
  ]
    .join(" ")
    .toLowerCase();
}

/** Total years of work experience, derived from date ranges. */
export function totalExperienceYears(p: ResumeProfile): number | undefined {
  let months = 0;
  let any = false;
  const now = new Date();
  for (const e of p.experiences) {
    const start = parseYearMonth(e.startDate);
    if (!start) continue;
    const end = e.endDate === "present" || !e.endDate ? { y: now.getFullYear(), m: now.getMonth() + 1 } : parseYearMonth(e.endDate);
    if (!end) continue;
    const delta = (end.y - start.y) * 12 + (end.m - start.m);
    if (delta > 0) {
      months += delta;
      any = true;
    }
  }
  return any ? months / 12 : undefined;
}

function parseYearMonth(s?: string): { y: number; m: number } | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return undefined;
  return { y: Number(m[1]), m: m[2] ? Number(m[2]) : 6 };
}
