import type { Opportunity } from "@talentloop/match-engine";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score">
      <span className="score-label">{label}</span>
      <div className="score-track">
        <div className="score-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="score-value">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  return (
    <article className="card">
      <div className="card-top">
        <strong>{opp.personName ?? opp.personId}</strong>
        <span className="arrow">→</span>
        <span className="job">{opp.jdTitle}</span>
      </div>

      <ScoreBar label="Job fit" value={opp.matchScore} />
      <ScoreBar label="Offer appeal" value={opp.attractionScore} />

      <ul className="reasons">
        {opp.explain.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>

      <a className="cta" href={`/interview/${opp.personId}?jd=${opp.jdId}`}>
        Start AI pre-screening →
      </a>
    </article>
  );
}
