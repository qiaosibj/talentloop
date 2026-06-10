"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  hardRequirements: "Practical requirements",
  salaryExpectation: "Salary expectation",
};

export function InterviewChat({
  personId,
  jdId,
  candidateName,
}: {
  personId: string;
  jdId: string;
  candidateName: string;
}) {
  const [state, setState] = useState<ChatState>({ history: [], profile: {}, done: false });
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<string>("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedRef = useRef(false);

  const callApi = useCallback(
    async (payload: object): Promise<ChatResponse | null> => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ personId, jdId, ...payload }),
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
    [personId, jdId],
  );

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void callApi({}).then((data) => {
      if (data) {
        setState(data.state);
        setMode(data.mode);
      }
    });
  }, [callApi]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.history, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading || state.done) return;
    setInput("");
    // Optimistic render of the user turn.
    setState((s) => ({ ...s, history: [...s.history, { role: "user", text: message }] }));
    setQuickReplies([]);
    const data = await callApi({ state, message });
    if (data) {
      setState(data.state);
      setQuickReplies(data.quickReplies);
      setMode(data.mode);
    }
  }

  const filledSlots = Object.entries(state.profile);

  return (
    <div className="chat-layout">
      <section className="chat-panel">
        {mode === "demo" && (
          <div className="demo-banner">
            Demo mode — scripted conversation engine. Set <code>ANTHROPIC_API_KEY</code> for a real AI interviewer.
          </div>
        )}
        <div className="chat-scroll" ref={scrollRef}>
          {state.history.map((turn, i) => (
            <div key={i} className={`bubble ${turn.role}`}>
              {turn.text}
            </div>
          ))}
          {loading && <div className="bubble agent typing">…</div>}
          {state.done && (
            <div className="done-card">
              ✅ Pre-screening complete. Thanks, {candidateName}! A human recruiter will review your answers and get
              back to you within two working days.
            </div>
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
          {filledSlots.length}/{Object.keys(SLOT_LABELS).length} fields · conversation overrides stored data · AI never
          makes the hiring decision
        </p>
      </aside>
    </div>
  );
}
