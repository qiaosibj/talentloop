import type { JdRequirement } from "@talentloop/jd-parser";
import { Field } from "./CandidateDetail";

export function JobDetail({ jd }: { jd: JdRequirement }) {
  const salary =
    jd.offer.salaryMin || jd.offer.salaryMax
      ? `${jd.offer.salaryMin?.toLocaleString() ?? "?"} – ${jd.offer.salaryMax?.toLocaleString() ?? "?"} ${jd.offer.currency ?? ""}/year`
      : undefined;

  return (
    <div className="detail">
      <section className="detail-section">
        <h4>Position</h4>
        <div className="detail-grid">
          <Field label="Title" value={jd.title} />
          <Field label="Company" value={jd.company} />
          <Field label="Location" value={jd.location} />
          <Field label="Category" value={jd.category} />
          <Field label="Industry" value={jd.industry} />
          <Field label="Level" value={jd.offer.level} />
        </div>
      </section>

      <section className="detail-section">
        <h4>Hard requirements (knock-out criteria)</h4>
        {jd.mustHave.length === 0 && <p className="muted">None specified.</p>}
        <ul className="req-list">
          {jd.mustHave.map((m, i) => (
            <li key={i}>
              <span className="req-type">{m.type.replace("-", " ")}</span> {m.value}
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h4>Skills</h4>
        <div className="chip-row">
          {jd.skills.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {jd.niceToHave.map((s) => (
            <span key={s} className="chip chip-soft">
              nice-to-have · {s}
            </span>
          ))}
          {jd.skills.length === 0 && jd.niceToHave.length === 0 && <p className="muted">—</p>}
        </div>
      </section>

      {jd.responsibilities && jd.responsibilities.length > 0 && (
        <section className="detail-section">
          <h4>Responsibilities</h4>
          <ul className="req-list">
            {jd.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h4>The offer</h4>
        <div className="detail-grid">
          <Field label="Salary" value={salary} />
          <Field label="Benefits" value={jd.offer.benefits?.join(", ")} />
          <Field label="Employer brand" value={jd.offer.brand} />
        </div>
      </section>
    </div>
  );
}
