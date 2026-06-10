import { LlmClient, completeJson } from "@talentloop/core";

/** Job category drives which scoring weight profile the match engine applies. */
export type JobCategory = "blue-collar" | "sales" | "technical" | "general";

export type MustHaveType =
  | "education"
  | "experience-years"
  | "certification"
  | "language"
  | "skill"
  | "other";

export interface MustHave {
  type: MustHaveType;
  /** e.g. "3" for experience-years, "German C1" for language, "forklift licence" for certification */
  value: string;
}

export interface JdRequirement {
  id: string;
  title: string;
  company?: string;
  category: JobCategory;
  location?: string;
  industry?: string;
  mustHave: MustHave[];
  niceToHave: string[];
  skills: string[];
  responsibilities?: string[];
  offer: {
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    benefits?: string[];
    level?: string;
    brand?: string;
  };
}

const PARSE_PROMPT = `You are a job-description parsing engine. Convert the JD below into JSON matching exactly this TypeScript shape (omit unknown optional fields, never invent data):

{
  "title": string,
  "company"?: string,
  "category": "blue-collar" | "sales" | "technical" | "general",
  "location"?: string,
  "industry"?: string,
  "mustHave": [{ "type": "education" | "experience-years" | "certification" | "language" | "skill" | "other", "value": string }],
  "niceToHave": string[],
  "skills": string[],
  "responsibilities"?: string[],
  "offer": { "salaryMin"?: number, "salaryMax"?: number, "currency"?: string, "benefits"?: string[], "level"?: string, "brand"?: string }
}

Rules:
- "mustHave" = hard requirements only (knock-out criteria). Soft preferences go to "niceToHave".
- For experience-years, "value" is the number of years as a string, e.g. "3".
- Salary numbers are annual gross; convert "52k" to 52000.
- Keep the original language of free-text fields.
- Return ONLY the JSON object.

Job description:
"""
{{TEXT}}
"""`;

export interface ParseJdOptions {
  llm: LlmClient;
  id?: string;
}

/** Parse raw JD text into structured requirements. Cache the result keyed by a hash of the input — JDs rarely change. */
export async function parseJd(rawText: string, opts: ParseJdOptions): Promise<JdRequirement> {
  const parsed = await completeJson<Omit<JdRequirement, "id">>(
    opts.llm,
    PARSE_PROMPT.replace("{{TEXT}}", rawText.slice(0, 12000)),
  );
  return {
    id: opts.id ?? `jd_${Date.now().toString(36)}`,
    title: parsed.title ?? "Unknown role",
    company: parsed.company,
    category: parsed.category ?? "general",
    location: parsed.location,
    industry: parsed.industry,
    mustHave: parsed.mustHave ?? [],
    niceToHave: parsed.niceToHave ?? [],
    skills: parsed.skills ?? [],
    responsibilities: parsed.responsibilities,
    offer: parsed.offer ?? {},
  };
}
