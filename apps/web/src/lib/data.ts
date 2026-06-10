import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import resumesJson from "../../../../data/synthetic/resumes.sample.json";
import jdsJson from "../../../../data/synthetic/jds.sample.json";

/** Synthetic demo data, bundled at build time. All fictional. */
export const RESUMES = resumesJson as unknown as ResumeProfile[];
export const JDS = jdsJson as unknown as JdRequirement[];

export function findResume(id: string): ResumeProfile | undefined {
  return RESUMES.find((r) => r.id === id);
}

export function findJd(id: string): JdRequirement | undefined {
  return JDS.find((j) => j.id === id);
}
