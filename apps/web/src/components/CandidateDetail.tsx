import { consentRemainingMs, type PoolCandidate } from "@/lib/store";

function fmtRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  return `${start ?? "?"} – ${end === "present" ? "now" : (end ?? "?")}`;
}

function ConsentSection({ candidate, onWithdraw }: { candidate: PoolCandidate; onWithdraw?: () => void }) {
  const c = candidate.consent;
  if (!c) return null;
  const remaining = consentRemainingMs(c);
  const months = remaining !== undefined ? Math.max(0, Math.round(remaining / (30 * 24 * 60 * 60 * 1000))) : null;
  const expiry = new Date(c.at + c.retentionMonths * 30 * 24 * 60 * 60 * 1000);

  return (
    <section className="detail-section consent-box">
      <h4>Talent-pool consent</h4>
      {c.status === "granted" && (
        <>
          <p>
            <strong>✓ Consented</strong> to {c.retentionMonths}-month retention on {new Date(c.at).toLocaleDateString()}.
            {months !== null && months > 0 ? ` Expires in ~${months} month${months === 1 ? "" : "s"} (${expiry.toLocaleDateString()}).` : ` Retention window has lapsed (${expiry.toLocaleDateString()}) — delete or re-consent.`}
          </p>
          {onWithdraw && (
            <button className="btn-ghost danger" onClick={onWithdraw}>
              Record withdrawal & remove from future matching
            </button>
          )}
        </>
      )}
      {c.status === "declined" && (
        <p>
          <strong>Declined</strong> talent-pool retention on {new Date(c.at).toLocaleDateString()} — kept only for the
          original application, excluded from future matching.
        </p>
      )}
      {c.status === "withdrawn" && (
        <p>
          <strong>Withdrawn</strong> on {new Date(c.at).toLocaleDateString()} — excluded from future matching.
        </p>
      )}
    </section>
  );
}

const ANSWER_LABELS: Record<string, string> = {
  jobStatus: "Job-search status",
  currentWork: "Current role",
  experienceHighlight: "Recent highlight",
  hardRequirements: "Practical requirements",
  salaryExpectation: "Salary expectation",
};

export function CandidateDetail({
  candidate,
  onWithdraw,
}: {
  candidate: PoolCandidate;
  onWithdraw?: () => void;
}) {
  const b = candidate.basics;
  return (
    <div className="detail">
      <ConsentSection candidate={candidate} onWithdraw={onWithdraw} />
      {candidate.engagement && (
        <section className="detail-section engagement-box">
          <h4>
            {candidate.engagement.status === "applied" ? "🎉 Applied" : "💬 Engaged via conversation"}
            <span className="muted-inline">
              {" "}
              · {candidate.engagement.jdTitle} · {new Date(candidate.engagement.at).toLocaleString()}
            </span>
          </h4>
          <div className="detail-grid">
            {Object.entries(candidate.engagement.answers).map(([k, v]) => (
              <Field key={k} label={ANSWER_LABELS[k] ?? k} value={v} />
            ))}
          </div>
          {candidate.engagement.resumeUpdated && (
            <p className="muted small">
              📄 Resume refreshed during application
              {candidate.resumeUpdatedAt ? ` (${new Date(candidate.resumeUpdatedAt).toLocaleString()})` : ""}.
              {candidate.rawResumeText ? " Raw text attached — awaiting AI parsing." : " Profile fields updated from the new resume."}
            </p>
          )}
          <p className="muted small">Conversation data overrides resume data in matching (e.g. salary expectation).</p>
        </section>
      )}

      {candidate.rawResumeText && (
        <section className="detail-section">
          <h4>Submitted resume text (unparsed)</h4>
          <p className="exp-desc raw-resume">{candidate.rawResumeText.slice(0, 600)}{candidate.rawResumeText.length > 600 ? "…" : ""}</p>
        </section>
      )}
      <section className="detail-section">
        <h4>Basics</h4>
        <div className="detail-grid">
          <Field label="Name" value={b.name} />
          <Field label="Location" value={b.location} />
          <Field label="Languages" value={b.languages?.join(", ")} />
          <Field label="Work permit" value={b.workPermit} />
        </div>
      </section>

      <section className="detail-section">
        <h4>Experience</h4>
        {candidate.experiences.length === 0 && <p className="muted">No work history on record.</p>}
        {candidate.experiences.map((e, i) => (
          <div key={i} className="exp-item">
            <div className="exp-head">
              <strong>{e.title ?? <em className="muted-inline">no title</em>}</strong>
              <span className="muted-inline">
                {e.company ? ` · ${e.company}` : ""} {fmtRange(e.startDate, e.endDate) && ` · ${fmtRange(e.startDate, e.endDate)}`}
              </span>
            </div>
            {e.description && <p className="exp-desc">{e.description}</p>}
          </div>
        ))}
      </section>

      {candidate.derived && (
        <section className="detail-section ai-derived">
          <h4>
            AI-inferred direction <span className="badge-ai">ai-inferred · kept separate from source data</span>
          </h4>
          <div className="detail-grid">
            <Field label="Likely roles" value={candidate.derived.roleTendency.join(", ")} />
            <Field label="Implied skills" value={candidate.derived.skills.join(", ")} />
            <Field label="Industries" value={candidate.derived.industries.join(", ")} />
          </div>
        </section>
      )}

      <section className="detail-section">
        <h4>Skills & certifications</h4>
        <div className="chip-row">
          {candidate.skills.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {(candidate.certifications ?? []).map((c) => (
            <span key={c} className="chip chip-cert">
              📜 {c}
            </span>
          ))}
          {candidate.skills.length === 0 && !(candidate.certifications ?? []).length && <p className="muted">—</p>}
        </div>
      </section>

      {candidate.education.length > 0 && (
        <section className="detail-section">
          <h4>Education</h4>
          {candidate.education.map((ed, i) => (
            <p key={i} className="exp-desc">
              {[ed.degree, ed.field, ed.institution, ed.year].filter(Boolean).join(" · ")}
            </p>
          ))}
        </section>
      )}

      <section className="detail-section">
        <h4>What they want</h4>
        <div className="detail-grid">
          <Field label="Target roles" value={candidate.intention?.roles?.join(", ")} />
          <Field
            label="Salary expectation"
            value={
              candidate.intention?.salaryMin
                ? `from ${candidate.intention.salaryMin.toLocaleString()} ${candidate.intention.currency ?? ""}/year`
                : undefined
            }
          />
          <Field label="Preferred locations" value={candidate.intention?.locations?.join(", ")} />
          <Field label="Industries" value={candidate.intention?.industries?.join(", ")} />
        </div>
      </section>
    </div>
  );
}

export function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value || "—"}</span>
    </div>
  );
}
