"use client";

import { useEffect, useState } from "react";
import type { Opportunity } from "@talentloop/match-engine";
import { Pool, loadPool, resetPool } from "@/lib/store";
import { BoardResult, runMatch } from "@/lib/match-client";
import { OpportunityCard } from "@/components/OpportunityCard";
import { OutreachModal } from "@/components/OutreachModal";
import { MatchDetailModal } from "@/components/MatchDetailModal";
import { findCandidate, findJob } from "@/lib/store";

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

export function BoardClient() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [outreachFor, setOutreachFor] = useState<Opportunity | null>(null);
  const [detailFor, setDetailFor] = useState<Opportunity | null>(null);

  useEffect(() => {
    void loadPool().then((p) => {
      setPool(p);
      void doMatch(p, "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doMatch(p: Pool, forJob: string) {
    setMatching(true);
    try {
      setBoard(await runMatch(p, forJob || undefined));
    } finally {
      setMatching(false);
    }
  }

  function onReset() {
    if (!confirm("Replace your current pool with the sample data?")) return;
    void resetPool().then((fresh) => {
      setPool(fresh);
      setJobId("");
      void doMatch(fresh, "");
    });
  }

  if (!pool) return <main className="board" />;

  return (
    <main className="board">
      <section className="hero">
        <h1>Reactivation board</h1>
        <p>
          {pool.candidates.length} candidates in your pool · {pool.jobs.length} open positions. Matching runs entirely
          in your browser — pool data never leaves this device.
        </p>
        <div className="toolbar">
          <label>
            Match against
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">All positions (best per candidate)</option>
              {pool.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" onClick={() => void doMatch(pool, jobId)} disabled={matching}>
            {matching ? "Matching…" : "Run matching"}
          </button>
          <a className="btn-ghost" href="/pool">
            Manage candidates ({pool.candidates.length})
          </a>
          <a className="btn-ghost" href="/jobs">
            Manage jobs ({pool.jobs.length})
          </a>
          <button className="btn-ghost danger" onClick={onReset}>
            Reset to sample data
          </button>
        </div>
        {board && (
          <p className="ran-note">
            Last run: {new Date(board.ranAt).toLocaleTimeString()} · {board.opportunities.length} opportunities scored
          </p>
        )}
      </section>

      {board && (
        <div className="columns">
          {TIERS.map((tier) => (
            <section key={tier.key} className={`column ${tier.tone}`}>
              <header className="column-head">
                <h2>
                  {tier.title} <span className="count">{board.byTier[tier.key].length}</span>
                </h2>
                <p>{tier.hint}</p>
              </header>
              {board.byTier[tier.key].length === 0 && <p className="empty">No candidates in this tier.</p>}
              {board.byTier[tier.key].map((opp) => (
                <OpportunityCard
                  key={`${opp.personId}:${opp.jdId}`}
                  opp={opp}
                  onOutreach={() => setOutreachFor(opp)}
                  onDetails={() => setDetailFor(opp)}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {outreachFor && (
        <OutreachModal
          opp={outreachFor}
          pool={pool}
          onClose={() => setOutreachFor(null)}
          onTemplatesChanged={(p) => setPool(p)}
        />
      )}

      {detailFor && findCandidate(pool, detailFor.personId) && findJob(pool, detailFor.jdId) && (
        <MatchDetailModal
          opp={detailFor}
          candidate={findCandidate(pool, detailFor.personId)!}
          jd={findJob(pool, detailFor.jdId)!}
          onClose={() => setDetailFor(null)}
        />
      )}
    </main>
  );
}
