"use client";

import { useState } from "react";
import type { Opportunity } from "@talentloop/match-engine";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { CandidateDetail } from "./CandidateDetail";
import { JobDetail } from "./JobDetail";

const FIT_LABELS: Array<{ key: keyof Opportunity["fit"]; label: string; hint: string }> = [
  { key: "experienceFit", label: "Role history match", hint: "How closely past job titles match this role" },
  { key: "intentFit", label: "Stated goal match", hint: "Whether the candidate's own target roles point here" },
  { key: "mustHave", label: "Hard requirements met", hint: "Share of knock-out criteria satisfied" },
  { key: "skills", label: "Skill overlap", hint: "Required skills the candidate covers" },
  { key: "semantic", label: "Content similarity", hint: "Overall profile ↔ job text similarity" },
  { key: "educationFit", label: "Education level", hint: "Degree level vs. requirement" },
];

const ATTR_LABELS: Array<{ key: keyof Opportunity["attraction"]; label: string; hint: string }> = [
  { key: "salary", label: "Salary vs. expectation", hint: "Offer range against what they want" },
  { key: "location", label: "Location", hint: "Job location vs. where they live / want to work" },
  { key: "benefits", label: "Benefits", hint: "Richness of the benefits package" },
  { key: "industry", label: "Industry preference", hint: "Job industry vs. their stated interests" },
  { key: "level", label: "Seniority", hint: "Role level vs. their trajectory" },
  { key: "brand", label: "Employer brand", hint: "Pull of the employer name" },
];

const TIER_RULES: Record<Opportunity["tier"], string> = {
  optimal:
    "Contact first = good overall fit AND an appealing offer AND real work history AND at least one strong specific signal (role history, stated goal, or content similarity).",
  probe: "Worth a try = plausible overall fit. Cheap outreach to test interest before investing recruiter time.",
  explore: "Long shot = weak direct match. Only reachable via the AI-inferred career direction, not the resume as-is.",
};

const LAYER_NOTES: Record<Opportunity["layer"], string> = {
  intent: "Matched on the candidate's primary portrait (current intention + latest role) — likely active interest.",
  broad: "Matched only on the full history portrait — plausible, but approach more softly.",
  explore: "Below the direct-match floor — surfaced via inferred directions only.",
};

function DimBar({ label, hint, value }: { label: string; hint: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="dim" title={hint}>
      <span className="dim-label">{label}</span>
      <div className="score-track">
        <div className={`score-fill ${pct >= 70 ? "fill-good" : pct <= 35 ? "fill-low" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="score-value">{pct}%</span>
      <span className="dim-hint">{hint}</span>
    </div>
  );
}

export function MatchDetailModal({
  opp,
  candidate,
  jd,
  onClose,
}: {
  opp: Opportunity;
  candidate: ResumeProfile;
  jd: JdRequirement;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"evidence" | "candidate" | "job">("evidence");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>
            {candidate.basics.name} → {jd.title}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="tabs">
          <button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}>
            Match evidence
          </button>
          <button className={tab === "candidate" ? "active" : ""} onClick={() => setTab("candidate")}>
            Candidate
          </button>
          <button className={tab === "job" ? "active" : ""} onClick={() => setTab("job")}>
            Job
          </button>
        </div>

        {tab === "evidence" && (
          <div className="detail">
            <section className="detail-section">
              <h4>
                Job fit — {Math.round(opp.matchScore * 100)}% <span className="muted-inline">(can they do it?)</span>
              </h4>
              {FIT_LABELS.map((d) => (
                <DimBar key={d.key} label={d.label} hint={d.hint} value={opp.fit[d.key]} />
              ))}
            </section>

            <section className="detail-section">
              <h4>
                Offer appeal — {Math.round(opp.attractionScore * 100)}%{" "}
                <span className="muted-inline">(would they want it?)</span>
              </h4>
              {ATTR_LABELS.map((d) => (
                <DimBar key={d.key} label={d.label} hint={d.hint} value={opp.attraction[d.key]} />
              ))}
              <p className="muted small">50% can mean "no data" — missing information scores neutral, never for or against.</p>
            </section>

            <section className="detail-section">
              <h4>Why this tier</h4>
              <p className="rule-note">{TIER_RULES[opp.tier]}</p>
              <p className="rule-note">{LAYER_NOTES[opp.layer]}</p>
              <ul className="reasons" style={{ marginTop: 10 }}>
                {opp.explain.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "candidate" && <CandidateDetail candidate={candidate} />}
        {tab === "job" && <JobDetail jd={jd} />}
      </div>
    </div>
  );
}
