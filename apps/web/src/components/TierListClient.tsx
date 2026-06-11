"use client";

import { useEffect, useState } from "react";
import type { Opportunity } from "@talentloop/match-engine";
import { Pool, findCandidate, findJob, loadBoardSnapshot, loadPool } from "@/lib/store";
import type { BoardResult } from "@/lib/match-client";
import { MatchDetailModal } from "@/components/MatchDetailModal";
import { OutreachModal } from "@/components/OutreachModal";

type StoredBoard = BoardResult & { poolVersion?: number };

const TIER_META: Record<string, { title: string; hint: string }> = {
  optimal: { title: "Contact first", hint: "Strong fit and an offer that should genuinely interest them" },
  probe: { title: "Worth a try", hint: "Plausible match — low-cost outreach to test interest" },
  explore: { title: "Long shot", hint: "Only reachable via AI-inferred career directions" },
};

/** Full list view for one tier — the board shows only a preview. */
export function TierListClient({ tier }: { tier: string }) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [board, setBoard] = useState<StoredBoard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [detailFor, setDetailFor] = useState<Opportunity | null>(null);
  const [outreachFor, setOutreachFor] = useState<Opportunity | null>(null);

  useEffect(() => {
    void Promise.all([loadPool(), loadBoardSnapshot<StoredBoard>()]).then(([p, snapshot]) => {
      setPool(p);
      if (snapshot) setBoard(snapshot);
      setLoaded(true);
    });
  }, []);

  const meta = TIER_META[tier];
  if (!meta) {
    return (
      <main className="board">
        <p className="empty">
          Unknown tier. Back to the <a href="/board">board</a>.
        </p>
      </main>
    );
  }
  if (!loaded || !pool) return <main className="board" />;

  const opportunities = board?.byTier[tier as keyof BoardResult["byTier"]] ?? [];

  return (
    <main className="board">
      <section className="hero">
        <p className="crumb">
          <a href="/board">← Board</a>
        </p>
        <h1>
          {meta.title} <span className="count">{opportunities.length}</span>
        </h1>
        <p>
          {meta.hint}.
          {board && <> From the run at {new Date(board.ranAt).toLocaleString()} · semantic engine: {board.embedMode}.</>}
        </p>
      </section>

      {!board && (
        <div className="board-empty">
          <p className="muted">No match run stored yet — go to the <a href="/board">board</a> and hit "Run matching".</p>
        </div>
      )}

      {board && opportunities.length === 0 && <p className="empty">No candidates in this tier in the last run.</p>}

      {opportunities.length > 0 && (
        <div className="opp-list">
          {opportunities.map((opp) => {
            const engagement = findCandidate(pool, opp.personId)?.engagement?.status;
            return (
              <div key={`${opp.personId}:${opp.jdId}`} className="opp-row">
                <div className="opp-who clickable" onClick={() => setDetailFor(opp)} title="Open match details">
                  <strong>{opp.personName ?? opp.personId}</strong>
                  <span className="muted-inline"> → {opp.jdTitle}</span>
                  {engagement && <span className={`badge-fresh ${engagement}`}>● {engagement}</span>}
                </div>
                <div className="opp-scores">
                  <span title="Job fit">fit {Math.round(opp.matchScore * 100)}%</span>
                  <span title="Offer appeal">appeal {Math.round(opp.attractionScore * 100)}%</span>
                </div>
                <div className="opp-reason muted-inline">{opp.explain[0] ?? ""}</div>
                <div className="opp-actions">
                  <button className="btn-ghost" onClick={() => setDetailFor(opp)}>
                    Details
                  </button>
                  <button className="btn-ghost" onClick={() => setOutreachFor(opp)}>
                    ✉ Outreach
                  </button>
                  <a className="btn-ghost" href={`/interview/${opp.personId}?jd=${opp.jdId}`}>
                    Chat →
                  </a>
                </div>
              </div>
            );
          })}
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
