export const metadata = { title: "Legal & Privacy — TalentLoop" };

export default function LegalPage() {
  return (
    <main className="legal">
      <h1>Legal & Privacy</h1>
      <p className="muted">Last updated: June 2026 · This is a portfolio demo, not a commercial service.</p>

      <section>
        <h2>Who runs this site</h2>
        <p>
          TalentLoop is a personal portfolio project demonstrating AI product design for recruiting. It is operated by
          an independent developer and is not offered as a commercial service.
        </p>
        <p>
          Contact: <a href="mailto:qiaosi1986@gmail.com">qiaosi1986@gmail.com</a>
        </p>
      </section>

      <section>
        <h2>What this site stores — and where</h2>
        <p>
          The talent pool you see (candidates, jobs, templates, match results) is stored <strong>only in your own
          browser</strong> (IndexedDB). It is never uploaded to our servers, never shared with other visitors, and is
          deleted when you clear your browser's site data. Each visitor has their own independent copy.
        </p>
        <p>All preloaded sample data is synthetic. Any resemblance to real persons is coincidental.</p>
      </section>

      <section>
        <h2>AI features and data transmission</h2>
        <p>
          When you explicitly use an AI feature — the candidate chat, resume/JD parsing, or message rewriting — the
          text you enter is transmitted to third-party AI model providers for processing and immediately returned:
        </p>
        <ul>
          <li>Conversations and parsing: Alibaba Cloud Model Studio (Qwen)</li>
          <li>Semantic matching vectors: Zhipu AI (embedding model)</li>
        </ul>
        <p>
          These providers process data on servers that may be located outside the EU. <strong>Please do not enter real
          personal data into this demo</strong> — use the synthetic samples or invented information. We do not store
          your inputs on our servers.
        </p>
      </section>

      <section>
        <h2>Hosting, logs and rate limiting</h2>
        <p>
          The site is hosted on Vercel. Like virtually all web hosting, Vercel processes technical request data (such
          as IP addresses) in server logs for delivery and security. Our abuse-protection layer additionally counts
          requests per IP address in short-lived server memory; these counters are not persisted or shared.
        </p>
      </section>

      <section>
        <h2>Cookies and tracking</h2>
        <p>
          This site uses <strong>no analytics, no advertising, and no tracking cookies</strong> — which is why you
          don't see a cookie consent banner. Browser storage (IndexedDB) is used solely for the functional purpose of
          keeping your demo data on your device.
        </p>
      </section>

      <section>
        <h2>AI transparency</h2>
        <p>
          Conversational features are clearly labeled as AI. In every flow shown here, the AI ranks, drafts and
          explains — it never makes hiring decisions, and AI-inferred data is labeled and kept separate from source
          data.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Since your demo data lives only in your browser, you can delete it yourself at any time (clear site data, or
          use "Reset to sample data" on the board). For any privacy question or request, email the address above.
        </p>
      </section>
    </main>
  );
}
