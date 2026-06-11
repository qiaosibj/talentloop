export default function LandingPage() {
  return (
    <main className="landing">
      {/* ---------- Hero ---------- */}
      <section className="landing-hero">
        <span className="hero-eyebrow">Demo · synthetic data · local-first</span>
        <h1>
          Every resume your company ever received
          <br />
          is a <span className="hl">living talent asset</span> — not an archive.
        </h1>
        <p className="hero-sub">
          TalentLoop matches your dormant candidate pool against the jobs you have open <em>today</em>, explains every
          match in plain language, drafts the outreach, and lets candidates update their profile through an AI
          conversation — so the pool gets more valuable with every contact.
        </p>
        <div className="hero-ctas">
          <a className="btn-primary btn-lg" href="/board">
            Open the board — sample data preloaded
          </a>
          <a className="btn-ghost btn-lg" href="#how-it-works">
            How it works
          </a>
        </div>
      </section>

      {/* ---------- Problem ---------- */}
      <section className="landing-section">
        <h2>The problem</h2>
        <div className="landing-cards three">
          <div className="l-card">
            <span className="l-icon">🗄️</span>
            <strong>Applicant pools go dormant</strong>
            <p>
              Companies sit on hundreds or thousands of past applicants — in inboxes, spreadsheets and old ATS exports —
              and never look at them again.
            </p>
          </div>
          <div className="l-card">
            <span className="l-icon">💸</span>
            <strong>Every vacancy starts from zero</strong>
            <p>
              New job? New job ads, new agency fees, weeks of waiting — while the right person may already be in the
              pool, two years older and more experienced.
            </p>
          </div>
          <div className="l-card">
            <span className="l-icon">⚖️</span>
            <strong>Privacy fear blocks action</strong>
            <p>
              "Can we even still use this data?" GDPR uncertainty means the pool is treated as a liability instead of an
              asset.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- The loop ---------- */}
      <section className="landing-section" id="how-it-works">
        <h2>How it works — the loop</h2>
        <div className="loop-steps">
          <div className="loop-step">
            <span className="loop-num">1</span>
            <strong>Bring the pool in</strong>
            <p>Import a CSV (columns auto-recognized, EN/DE/ZH), paste resumes for AI parsing, or use quick forms.</p>
          </div>
          <span className="loop-arrow">→</span>
          <div className="loop-step">
            <span className="loop-num">2</span>
            <strong>Match on demand</strong>
            <p>
              Every candidate scored on two questions — <em>can they do it?</em> and <em>would they want it?</em> —
              sorted into contact-first / worth-a-try / long-shot, every score explained.
            </p>
          </div>
          <span className="loop-arrow">→</span>
          <div className="loop-step">
            <span className="loop-num">3</span>
            <strong>Reach out</strong>
            <p>Per-tier message templates filled with real data, including a personal chat link. Copy or AI-rewrite.</p>
          </div>
          <span className="loop-arrow">→</span>
          <div className="loop-step">
            <span className="loop-num">4</span>
            <strong>The pool updates itself</strong>
            <p>
              Candidates answer a short AI conversation, unlock the job, apply with a refreshed resume — and everything
              flows back into the pool for the next match.
            </p>
          </div>
        </div>
        <p className="loop-note">
          That fourth step is the point: most tools stop after matching. TalentLoop closes the loop — every outreach
          makes the data better.
        </p>
      </section>

      {/* ---------- Guided tour ---------- */}
      <section className="landing-section">
        <h2>Try it in 3 minutes</h2>
        <p className="section-sub">Sample data is preloaded — nothing to set up, nothing leaves your browser.</p>
        <ol className="tour-list">
          <li>
            <a href="/board">
              <strong>See the reactivation board</strong>
              <span>8 candidates × 5 open jobs, sorted into three action tiers. Hit "Run matching" to re-rank live.</span>
            </a>
          </li>
          <li>
            <a href="/board">
              <strong>Open the match evidence</strong>
              <span>
                Click any card title — all 12 scoring dimensions, in plain language. Find Jonas Becker: no job titles on
                his resume, matched via AI role inference.
              </span>
            </a>
          </li>
          <li>
            <a href="/board">
              <strong>Generate an outreach message</strong>
              <span>"✉ Outreach message" on any card — tier-specific template, filled with real data, editable.</span>
            </a>
          </li>
          <li>
            <a href="/interview/cand_jonas?jd=jd_hvac">
              <strong>Be the candidate</strong>
              <span>
                Experience the chat behind the outreach link: answer questions, unlock the job reveal, apply with a
                resume update — then check the pool to see it all flowed back.
              </span>
            </a>
          </li>
          <li>
            <a href="/pool">
              <strong>Import your own CSV</strong>
              <span>Any column layout — headers are auto-recognized and you confirm the mapping before import.</span>
            </a>
          </li>
        </ol>
      </section>

      {/* ---------- Honest scope ---------- */}
      <section className="landing-section">
        <h2>What this version is (and isn't)</h2>
        <div className="landing-cards three">
          <div className="l-card">
            <span className="l-icon">🔒</span>
            <strong>Local-first by design</strong>
            <p>
              Your pool lives in this browser (IndexedDB) and matching runs client-side. Candidate data never leaves
              your device — only explicit AI features call a server.
            </p>
          </div>
          <div className="l-card">
            <span className="l-icon">🤖</span>
            <strong>Demo mode is honest</strong>
            <p>
              Without an API key, the chat uses a scripted engine and parsing says so instead of pretending. With a key
              (Anthropic / OpenAI-compatible), conversations and parsing are real AI.
            </p>
          </div>
          <div className="l-card">
            <span className="l-icon">🧭</span>
            <strong>Humans decide</strong>
            <p>
              The engine ranks and explains; it never auto-rejects anyone. AI-inferred data is always labeled and kept
              apart from what candidates actually wrote.
            </p>
          </div>
        </div>
        <p className="loop-note">
          On the roadmap: a compliance Q&A assistant (cited answers from labor-law sources) and an onboarding training
          module — same platform, same data spine.{" "}
          <a href="https://github.com/qiaosibj/talentloop" target="_blank" rel="noreferrer">
            Architecture and code on GitHub →
          </a>
        </p>
      </section>
    </main>
  );
}
