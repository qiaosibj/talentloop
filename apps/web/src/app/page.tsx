import { getBoard } from "@/lib/engine";
import { OpportunityCard } from "@/components/OpportunityCard";

export const dynamic = "force-dynamic";

const TIERS = [
  {
    key: "optimal" as const,
    title: "Contact first",
    hint: "Strong fit and an offer that should genuinely interest them",
    tone: "tone-green",
  },
  {
    key: "probe" as const,
    title: "Worth a try",
    hint: "Plausible match — low-cost outreach to test interest",
    tone: "tone-amber",
  },
  {
    key: "explore" as const,
    title: "Long shot",
    hint: "Only reachable via AI-inferred career directions",
    tone: "tone-gray",
  },
];

export default async function BoardPage() {
  const board = await getBoard();

  return (
    <main className="board">
      <section className="hero">
        <h1>Reactivation board</h1>
        <p>
          {board.candidateCount} dormant candidates matched against {board.jobCount} open positions — for every
          candidate, their single best opportunity, with reasons a recruiter can verify.
        </p>
      </section>

      <div className="columns">
        {TIERS.map((tier) => (
          <section key={tier.key} className={`column ${tier.tone}`}>
            <header className="column-head">
              <h2>
                {tier.title} <span className="count">{board[tier.key].length}</span>
              </h2>
              <p>{tier.hint}</p>
            </header>
            {board[tier.key].length === 0 && <p className="empty">No candidates in this tier right now.</p>}
            {board[tier.key].map((opp) => (
              <OpportunityCard key={`${opp.personId}:${opp.jdId}`} opp={opp} />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
