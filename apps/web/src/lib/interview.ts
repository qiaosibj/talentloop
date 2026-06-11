import { SlotDef, TwoStageExtractor } from "@talentloop/chat-extractor";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { selectLlm } from "./llm";

/** Pre-screening slots, ordered easy → sensitive. */
export const INTERVIEW_SLOTS: SlotDef[] = [
  {
    key: "jobStatus",
    label: "current job-search status",
    description: "Whether the candidate is actively looking, open to offers, or not interested right now",
  },
  {
    key: "currentWork",
    label: "current role and main responsibilities",
    description: "What the candidate currently does (role, employer type, main tasks)",
  },
  {
    key: "experienceHighlight",
    label: "a recent achievement or project they're proud of",
    description: "A concrete recent achievement, project or result the candidate mentions",
  },
  {
    key: "hardRequirements",
    label: "practical requirements (start date, working hours, commute or remote needs)",
    description: "Hard constraints: earliest start date, full/part-time, location or remote preferences, work-permit notes",
  },
  {
    key: "salaryExpectation",
    label: "salary expectation",
    description: "Expected salary or salary range, with currency and period if mentioned",
  },
];

/** Quick replies for the opening question, shown before the first user turn. */
export const INITIAL_QUICK_REPLIES = ["Actively looking", "Open to opportunities", "Happy where I am, but curious"];

/** How many answered questions unlock the job reveal capsule. */
export const UNLOCK_AT = 3;

export function buildInterviewer(candidate: ResumeProfile, jd: JdRequirement) {
  const { llm, mode } = selectLlm();
  const extractor = new TwoStageExtractor(llm, {
    persona:
      `You are Mia, a friendly, professional recruiter at ${jd.company ?? "the hiring company"}. ` +
      `You are reaching out about the "${jd.title}" position in ${jd.location ?? "our office"}. ` +
      `Be warm and concise (2-3 sentences per turn), never pushy, and respect that the candidate spoke with the company before. ` +
      `A human recruiter reviews everything; you never make hiring decisions.`,
    goal: "Reconnect with a past applicant and understand their current status and expectations for this specific role.",
    slots: INTERVIEW_SLOTS,
  });
  const context =
    `Candidate: ${candidate.basics.name ?? candidate.id}, based in ${candidate.basics.location ?? "unknown"}. ` +
    `Background: ${candidate.experiences[0]?.title ?? candidate.derived?.roleTendency?.[0] ?? "see resume"}.`;
  return { extractor, context, mode };
}
