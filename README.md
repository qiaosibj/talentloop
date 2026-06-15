# TalentLoop

> Turn every resume a company has ever received into a living talent asset.

**🔗 Live demo: [talentloop-web.vercel.app](https://talentloop-web.vercel.app)** — sample data preloaded, runs entirely in your browser, no signup. Real AI (conversation, parsing) is enabled with rate-limited keys; matching uses multilingual embeddings.

AI recruiting toolkit for small and mid-sized companies: structured resume/JD parsing, **reverse talent-pool matching** ("which dormant candidates fit the jobs I have open *today*?"), and conversational profile extraction — designed GDPR-first and human-in-the-loop.

**Status:** Phase 1 — core engine packages with an offline runnable demo. All data in this repo is synthetic.

## Quickstart

```bash
npm install
npm run demo     # CLI demo: builds and prints the reactivation board — no API key needed
npm run web      # Web app at http://localhost:3100 — board + AI pre-screening chat
```

The web app is a working product loop, not a static showcase:

1. **Bring your own data** — import a whole spreadsheet (CSV with **automatic column recognition** in English/German/Chinese plus a confirm-mapping step; comma, semicolon and tab delimiters detected), paste raw text (AI parsing), or use quick forms (no API key needed); sample data is preloaded so the loop is explorable immediately.
2. **Run matching on demand** — against all positions or one specific job; results re-rank live as the pool changes, classified **optimal** (contact first), **probe** (worth a try) or **explore** (long shot), each with plain-language reasons.
3. **Generate outreach messages** — per-tier editable templates filled with real opportunity data (including the pre-screening link); one-click copy, optional AI rewrite.
4. **AI pre-screening interview** — the candidate-side chat behind that link, with a structured profile filling live; that profile is what the recruiter receives.

**Local-first privacy:** the talent pool lives in your browser (IndexedDB — room for tens of thousands of candidates) and matching runs client-side — candidate data never leaves your device. Only explicit AI features (parsing, chat, rewrite) call the server. Without an API key those run in honest demo mode; set `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` + `OPENAI_MODEL`) to enable real AI.

## Packages

| Package | What it does |
|---|---|
| [`@talentloop/core`](packages/core) | LLM client abstraction (Anthropic / OpenAI-compatible), embedders incl. an offline `HashEmbedder`, vector store interface |
| [`@talentloop/resume-parser`](packages/resume-parser) | Resume text → structured profile; AI role-tendency inference for resumes without job titles (provenance-tagged) |
| [`@talentloop/jd-parser`](packages/jd-parser) | JD text → hard requirements, skills, offer attributes, category |
| [`@talentloop/match-engine`](packages/match-engine) | Scores every candidate-job pair on two questions — "can they do it?" and "would they want it?" — then sorts results into contact-first / worth-a-try / long-shot |
| [`@talentloop/chat-extractor`](packages/chat-extractor) | Two-stage conversational extraction (dialogue call + separate low-temp JSON call), cumulative slot filling |

## Design principles

1. **"Can they do it" ≠ "will they want it".** Every candidate-job pair gets two separate scores: *job fit* (could this person do the job?) and *offer appeal* (would this job actually interest this person?). What matters most differs by job type — factory roles weigh certificates and commute, tech roles weigh skills — so each job category has its own weighting.
2. **Two views of every candidate.** One profile captures what the person wants *right now* (latest role + stated goals); another captures their full history. A hit on the first suggests active interest; a hit only on the second is a broader lead that needs a softer approach.
3. **Never promote on averages.** A candidate is marked "contact first" only when at least one strong, specific signal exists — their recent role closely matches the job, their stated goal points at it, or the overall content overlap is high. Averages alone promote keyword lookalikes; relying purely on text similarity rejects people whose work history matches exactly.
4. **Pay never enters the search index.** Salary and benefits only affect the appeal score, so re-pricing a job updates results instantly — nothing has to be re-indexed.
5. **You always know where data came from.** Anything the AI inferred is stored separately and clearly labeled, never mixed with what the candidate actually wrote — required for GDPR access requests and EU AI Act explainability.
6. **Humans decide.** The engine ranks and explains; it never auto-rejects anyone. Every suggestion comes with plain-language reasons a recruiter can verify.
7. **Cut-offs are calibration, not magic numbers.** Similarity scores mean different things depending on the embedding model, so thresholds ship as per-model calibration profiles.
8. **Compliance is a product feature, not an afterthought.** A bare reply to outreach is not valid GDPR consent (it isn't specific or informed). So the activation conversation ends with an *explicit, logged* consent step — the candidate is told exactly what they're agreeing to (kept in the pool for N months), can decline, and can withdraw any time. Retention consent gates future matching: declined, withdrawn or expired candidates are excluded automatically. This turns a dormant pool from a liability into a consented asset.

## Repo layout

```
packages/        core, resume-parser, jd-parser, match-engine, chat-extractor
apps/web/        Next.js app: reactivation board + AI pre-screening chat
examples/        runnable demos (offline)
data/synthetic/  generated sample candidates & jobs — no real personal data
docs/            architecture & design notes
```

## AI configuration

Everything works without keys (offline demo mode). Add env vars to unlock real AI — locally in `apps/web/.env.local`, on Vercel via project settings:

| Variable | Unlocks | Examples |
|---|---|---|
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`) | Chat, resume/JD parsing, outreach rewrite | Claude |
| `OPENAI_API_KEY` + `OPENAI_BASE_URL` + `OPENAI_MODEL` | Same, via any OpenAI-compatible endpoint | OpenAI, DeepSeek (`https://api.deepseek.com`, `deepseek-chat`), Qwen (`https://dashscope.aliyuncs.com/compatible-mode`, `qwen-plus`) |
| `ZHIPU_API_KEY` (+ `ZHIPU_EMBED_MODEL`) | Real semantic matching (Zhipu `embedding-3`, multilingual) via the server-side `/api/embed` proxy — keys never reach the browser | Zhipu |
| `EMBEDDING_API_KEY` + `EMBEDDING_BASE_URL` + `EMBEDDING_MODEL` | Same, via any OpenAI-compatible embeddings endpoint | OpenAI `text-embedding-3-small` |

With an embedding key set, the board switches from the offline hash engine to neural embeddings automatically (thresholds re-calibrate via `NEURAL_EMBEDDER_CONFIG`); if the provider errors mid-run it falls back to offline and keeps working.

**Abuse protection** (so a public demo with real keys can't be quota-drained): every AI endpoint enforces per-request size caps, per-IP rate limits and a global daily budget (embeddings are budgeted per text, ~20k/day by default). Limits return an honest 429. Set `DISABLE_RATE_LIMITS=1` to switch them off locally. State is in-memory per instance — a deterrent for demos; back it with Redis for production.

## Deploy (Vercel)

Import the repo, set **Root Directory** to `apps/web` (keep "Include files outside root" on). The build script compiles the workspace packages first. Add the env vars above to enable real AI.

## Roadmap

- [x] Web app: pool & job management, on-demand matching, outreach templates, AI pre-screening interview
- [ ] pgvector-backed `VectorStore`
- [ ] Synthetic data generator (LLM-generated multilingual resume & JD corpus)
- [ ] Hybrid RAG package (multi-route retrieval, citation verification, canonical-answer overrides)

## License

MIT
