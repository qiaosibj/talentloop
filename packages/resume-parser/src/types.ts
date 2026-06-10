/** Structured candidate profile — the single schema all other packages consume. */

export interface ExperienceEntry {
  /** Job title; may be missing in low-quality resumes (see `derived`). */
  title?: string;
  company?: string;
  /** "YYYY" or "YYYY-MM" */
  startDate?: string;
  /** "YYYY", "YYYY-MM" or "present" */
  endDate?: string;
  description?: string;
}

export interface EducationEntry {
  degree?: string;
  field?: string;
  institution?: string;
  year?: string;
}

export interface JobIntention {
  roles?: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  locations?: string[];
  industries?: string[];
}

/**
 * Role tendency inferred by an LLM from work descriptions when the resume
 * has no usable job titles. Kept strictly separate from source data so the
 * provenance is always visible (relevant for GDPR Art. 15 access requests
 * and for explainability under the EU AI Act).
 */
export interface DerivedProfile {
  roleTendency: string[];
  skills: string[];
  industries: string[];
  source: "ai-inferred";
}

export interface ResumeProfile {
  id: string;
  basics: {
    name?: string;
    location?: string;
    /** Work-permit status — a first-class field when hiring international talent in Germany. */
    workPermit?: string;
    languages?: string[];
  };
  experiences: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications?: string[];
  intention?: JobIntention;
  derived?: DerivedProfile;
}
