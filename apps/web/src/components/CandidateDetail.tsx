import type { ResumeProfile } from "@talentloop/resume-parser";

function fmtRange(start?: string, end?: string): string {
  if (!start && !end) return "";
  return `${start ?? "?"} – ${end === "present" ? "now" : (end ?? "?")}`;
}

export function CandidateDetail({ candidate }: { candidate: ResumeProfile }) {
  const b = candidate.basics;
  return (
    <div className="detail">
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
