"use client";

import { useEffect, useState } from "react";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { findCandidate, findJob, loadPool } from "@/lib/store";
import { InterviewChat } from "@/components/InterviewChat";

/** Resolves candidate + job from the local-first pool (browser storage). */
export function InterviewClient({ personId, jdId }: { personId: string; jdId: string }) {
  const [resolved, setResolved] = useState<{ candidate?: ResumeProfile; jd?: JdRequirement } | null>(null);

  useEffect(() => {
    const pool = loadPool();
    setResolved({ candidate: findCandidate(pool, personId), jd: findJob(pool, jdId) });
  }, [personId, jdId]);

  if (!resolved) return <main className="interview" />;

  const { candidate, jd } = resolved;
  if (!candidate || !jd) {
    return (
      <main className="interview">
        <p className="empty">
          Unknown candidate or job in this browser's pool. Go back to the <a href="/">board</a> and pick an
          opportunity.
        </p>
      </main>
    );
  }

  return (
    <main className="interview">
      <section className="interview-head">
        <h1>AI pre-screening — {jd.title}</h1>
        <p>
          Candidate view: this is what <strong>{candidate.basics.name}</strong> sees after tapping the outreach link.
          The conversation fills a structured profile on the right; a human recruiter reviews everything.
        </p>
      </section>
      <InterviewChat candidate={candidate} jd={jd} />
    </main>
  );
}
