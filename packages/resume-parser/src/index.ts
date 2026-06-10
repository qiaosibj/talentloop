import { LlmClient, completeJson } from "@talentloop/core";
import { DerivedProfile, ResumeProfile } from "./types";

export * from "./types";

const PARSE_PROMPT = `You are a resume parsing engine. Convert the resume text below into JSON matching exactly this TypeScript shape (omit unknown optional fields, never invent data):

{
  "basics": { "name"?: string, "location"?: string, "workPermit"?: string, "languages"?: string[] },
  "experiences": [{ "title"?: string, "company"?: string, "startDate"?: "YYYY-MM", "endDate"?: "YYYY-MM" | "present", "description"?: string }],
  "education": [{ "degree"?: string, "field"?: string, "institution"?: string, "year"?: string }],
  "skills": string[],
  "certifications"?: string[],
  "intention"?: { "roles"?: string[], "salaryMin"?: number, "salaryMax"?: number, "currency"?: string, "locations"?: string[], "industries"?: string[] }
}

Rules:
- Keep the original language of free-text fields.
- "skills" are short normalized keywords (e.g. "cnc milling", "react", "forklift licence").
- Salary numbers are annual gross unless the text clearly says otherwise; convert "48k" to 48000.
- Return ONLY the JSON object.

Resume text:
"""
{{TEXT}}
"""`;

export interface ParseResumeOptions {
  llm: LlmClient;
  id?: string;
  /** Infer role tendency when the resume has work descriptions but no titles. Default: true. */
  inferTendency?: boolean;
}

/** Parse raw resume text into a structured profile. */
export async function parseResume(rawText: string, opts: ParseResumeOptions): Promise<ResumeProfile> {
  const parsed = await completeJson<Omit<ResumeProfile, "id">>(
    opts.llm,
    PARSE_PROMPT.replace("{{TEXT}}", rawText.slice(0, 12000)),
  );
  const profile: ResumeProfile = {
    id: opts.id ?? `resume_${Date.now().toString(36)}`,
    basics: parsed.basics ?? {},
    experiences: parsed.experiences ?? [],
    education: parsed.education ?? [],
    skills: parsed.skills ?? [],
    certifications: parsed.certifications,
    intention: parsed.intention,
  };
  if ((opts.inferTendency ?? true) && needsTendencyInference(profile)) {
    profile.derived = await inferRoleTendency(profile, opts.llm);
  }
  return profile;
}

/** True when no experience has a title but at least one has a description. */
export function needsTendencyInference(profile: ResumeProfile): boolean {
  const hasTitle = profile.experiences.some((e) => e.title && e.title.trim().length > 0);
  const hasDescription = profile.experiences.some((e) => e.description && e.description.trim().length > 0);
  return !hasTitle && hasDescription;
}

const TENDENCY_PROMPT = `A candidate's resume has work-experience descriptions but no job titles. Infer from the descriptions below what roles this person most likely held / could hold next, plus implied skills and industries.

Work descriptions:
"""
{{TEXT}}
"""

Return ONLY JSON: { "roleTendency": string[], "skills": string[], "industries": string[] }
- 2-4 concrete role names, most likely first, in the same language as the descriptions.
- Be conservative: only infer what the descriptions clearly support.`;

/** LLM inference of likely roles from untitled work descriptions. */
export async function inferRoleTendency(
  profile: ResumeProfile,
  llm: LlmClient,
): Promise<DerivedProfile> {
  const text = profile.experiences
    .map((e) => e.description)
    .filter(Boolean)
    .join("\n---\n");
  const inferred = await completeJson<Omit<DerivedProfile, "source">>(
    llm,
    TENDENCY_PROMPT.replace("{{TEXT}}", text.slice(0, 6000)),
  );
  return {
    roleTendency: inferred.roleTendency ?? [],
    skills: inferred.skills ?? [],
    industries: inferred.industries ?? [],
    source: "ai-inferred",
  };
}
