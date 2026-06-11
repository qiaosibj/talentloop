"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { INITIAL_QUICK_REPLIES, UNLOCK_AT } from "@/lib/interview";
import { recordEngagement } from "@/lib/store";

interface ChatTurn {
  role: "agent" | "user";
  text: string;
}

interface ChatState {
  history: ChatTurn[];
  profile: Record<string, string>;
  done: boolean;
}

interface ChatResponse {
  reply: string;
  quickReplies: string[];
  state: ChatState;
  mode: "anthropic" | "openai-compatible" | "demo";
  error?: string;
}

const SLOT_LABELS: Record<string, string> = {
  jobStatus: "Job-search status",
  currentWork: "Current role",
  experienceHighlight: "Recent highlight",
  hardRequirements: "Practical requirements",
  salaryExpectation: "Salary expectation",
};

const SLOT_COUNT = Object.keys(SLOT_LABELS).length;

export function InterviewChat({ candidate, jd }: { candidate: ResumeProfile; jd: JdRequirement }) {
  const candidateName = candidate.basics.name ?? candidate.id;
  const [state, setState] = useState<ChatState>({ history: [], profile: {}, done: false });
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<string>("");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);
  const recordedRef = useRef(false);

  const filled = Object.keys(state.profile).filter((k) => k in SLOT_LABELS).length;
  const unlocked = filled >= UNLOCK_AT || state.done;

  const callApi = useCallback(
    async (payload: object): Promise<ChatResponse | null> => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ candidate, jd, ...payload }),
        });
        const data = (await res.json()) as ChatResponse;
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [candidate, jd],
  );

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void callApi({}).then((data) => {
      if (data) {
        setState(data.state);
        setMode(data.mode);
        setQuickReplies(INITIAL_QUICK_REPLIES);
      }
    });
  }, [callApi]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.history, loading, unlocked]);

  // The loop closes here: once enough is learned (or the chat finishes),
  // conversation results flow back into the talent pool.
  useEffect(() => {
    if (!state.done || recordedRef.current) return;
    recordedRef.current = true;
    void recordEngagement(candidate.id, {
      status: applied ? "applied" : "engaged",
      at: Date.now(),
      jdId: jd.id,
      jdTitle: jd.title,
      answers: state.profile,
    });
  }, [state.done, applied, candidate.id, jd.id, jd.title, state.profile]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading || state.done) return;
    setInput("");
    setState((s) => ({ ...s, history: [...s.history, { role: "user", text: message }] }));
    setQuickReplies([]);
    const data = await callApi({ state, message });
    if (data) {
      setState(data.state);
      setQuickReplies(data.quickReplies);
      setMode(data.mode);
    }
  }

  function onApply() {
    setApplied(true);
    void recordEngagement(candidate.id, {
      status: "applied",
      at: Date.now(),
      jdId: jd.id,
      jdTitle: jd.title,
      answers: state.profile,
    });
  }

  const salary =
    jd.offer.salaryMin || jd.offer.salaryMax
      ? `${jd.offer.salaryMin?.toLocaleString() ?? "?"}–${jd.offer.salaryMax?.toLocaleString() ?? "?"} ${jd.offer.currency ?? "EUR"}/yr`
      : null;

  return (
    <div className="chat-layout">
      <section className="chat-panel">
        {mode === "demo" && (
          <div className="demo-banner">
            Demo mode — scripted conversation engine. Set <code>ANTHROPIC_API_KEY</code> for a real AI interviewer.
          </div>
        )}

        <div className="chat-progress">
          <span>
            {filled}/{SLOT_COUNT} answered
          </span>
          <div className="progress-dots">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <span key={i} className={`dot ${i < filled ? "on" : ""}`} />
            ))}
          </div>
          <span className="muted-inline">{unlocked ? "position unlocked 🎉" : `${Math.max(0, UNLOCK_AT - filled)} more to unlock the position`}</span>
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {state.history.map((turn, i) => (
            <div key={i} className={`bubble ${turn.role}`}>
              {turn.text}
            </div>
          ))}
          {loading && <div className="bubble agent typing">…</div>}
          {state.done && !applied && (
            <div className="done-card">
              ✅ All done — thanks, {candidateName}! A human recruiter will review your answers and get back to you
              within two working days. Interested already? Apply directly below.
            </div>
          )}
          {applied && (
            <div className="done-card">
              🎉 Application sent! The recruiter sees your conversation summary alongside it — no forms to fill twice.
            </div>
          )}
        </div>

        {/* Job reveal capsule — locked until enough answers, then tappable. */}
        <div className={`job-capsule ${unlocked ? "unlocked" : ""} ${applied ? "applied" : ""}`}>
          {!unlocked ? (
            <>
              <span className="capsule-lock">🔒</span>
              <div>
                <strong>A matching position at {jd.company ?? "a hiring company"}</strong>
                <span className="capsule-sub">Answer {Math.max(0, UNLOCK_AT - filled)} more question{UNLOCK_AT - filled === 1 ? "" : "s"} to see the full details</span>
              </div>
              <span className="badge-new">NEW</span>
            </>
          ) : (
            <>
              <span className="capsule-lock">{applied ? "✅" : "✨"}</span>
              <div>
                <strong>
                  {jd.title} · {jd.company ?? ""}
                </strong>
                <span className="capsule-sub">
                  {[jd.location, salary, ...(jd.offer.benefits?.slice(0, 2) ?? [])].filter(Boolean).join(" · ")}
                </span>
              </div>
              {!applied ? (
                <button className="btn-primary" onClick={onApply}>
                  Apply now
                </button>
              ) : (
                <span className="badge-applied">applied</span>
              )}
            </>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        {!state.done && (
          <>
            {quickReplies.length > 0 && (
              <div className="quick-replies">
                {quickReplies.map((qr) => (
                  <button key={qr} onClick={() => void send(qr)} disabled={loading}>
                    {qr}
                  </button>
                ))}
              </div>
            )}
            <form
              className="chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer…"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </section>

      <aside className="profile-panel">
        <h3>Structured profile</h3>
        <p className="muted">Fills live as the conversation progresses — this is what the recruiter receives.</p>
        {Object.keys(SLOT_LABELS).map((key) => {
          const value = state.profile[key];
          return (
            <div key={key} className={`slot ${value ? "filled" : ""}`}>
              <span className="slot-label">{SLOT_LABELS[key]}</span>
              <span className="slot-value">{value ?? "—"}</span>
            </div>
          );
        })}
        <p className="muted small">
          {filled}/{SLOT_COUNT} fields · conversation overrides stored data · answers flow back into the talent pool ·
          AI never makes the hiring decision
        </p>
      </aside>
    </div>
  );
}
