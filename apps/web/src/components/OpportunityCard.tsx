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

export function OpportunityCard({
  opp,
  onOutreach,
  onDetails,
  engagementStatus,
}: {
  opp: Opportunity;
  onOutreach?: () => void;
  onDetails?: () => void;
  engagementStatus?: "engaged" | "applied";
}) {
  return (
    <article className="card">
      <div className={`card-top ${onDetails ? "clickable" : ""}`} onClick={onDetails} title="Open match details">
        <strong>{opp.personName ?? opp.personId}</strong>
        <span className="arrow">→</span>
        <span className="job">{opp.jdTitle}</span>
        {engagementStatus && <span className={`badge-fresh ${engagementStatus}`}>● {engagementStatus}</span>}
        {onDetails && <span className="details-hint">details ›</span>}
      </div>

      <ScoreBar label="Job fit" value={opp.matchScore} />
      <ScoreBar label="Offer appeal" value={opp.attractionScore} />

      <ul className="reasons">
        {opp.explain.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>

      <div className="card-actions">
        {onOutreach && (
          <button className="cta" onClick={onOutreach}>
            ✉ Outreach message
          </button>
        )}
        <a className="cta secondary" href={`/interview/${opp.personId}?jd=${opp.jdId}`}>
          AI pre-screening →
        </a>
      </div>
    </article>
  );
}
