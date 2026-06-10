# TalentLoop

> Turn every resume a company has ever received into a living talent asset.

AI recruiting toolkit for the (German) SME market: structured resume/JD parsing, **reverse talent-pool matching** ("which dormant candidates fit the jobs I have open *today*?"), and conversational profile extraction — designed GDPR-first and human-in-the-loop.

**Status:** Phase 1 — core engine packages with an offline runnable demo. All data in this repo is synthetic.

## Quickstart

```bash
npm install
npm run demo     # builds and runs the reactivation board demo — no API key needed
```

The demo indexes 8 synthetic candidates against 5 open positions and prints a reactivation board: every candidate's best opportunity, classified as **optimal / probe / explore**.

## Packages

| Package | What it does |
|---|---|
| [`@talentloop/core`](packages/core) | LLM client abstraction (Anthropic / OpenAI-compatible), embedders incl. an offline `HashEmbedder`, vector store interface |
| [`@talentloop/resume-parser`](packages/resume-parser) | Resume text → structured profile; AI role-tendency inference for resumes without job titles (provenance-tagged) |
| [`@talentloop/jd-parser`](packages/jd-parser) | JD text → hard requirements, skills, offer attributes, category |
| [`@talentloop/match-engine`](packages/match-engine) | Dual-portrait embeddings, 12-dimension fit × attraction scoring, three-tier opportunity classification |
| [`@talentloop/chat-extractor`](packages/chat-extractor) | Two-stage conversational extraction (dialogue call + separate low-temp JSON call), cumulative slot filling |

## Design principles

1. **Fit ≠ attraction.** Whether a person *can do* the job (M) and whether the job *can win* the person (A) are scored separately, with per-category weight profiles (blue-collar / sales / technical).
2. **Dual portraits.** A match against the *primary* portrait (intention + latest role) signals active interest; a match only against the *full* history is a broader, more speculative lead.
3. **Strong-signal gating.** "Optimal" requires at least one strong fit signal — `max(semantic, experienceFit, intentFit)` — never a weighted average alone. Averages let keyword lookalikes through; a pure semantic floor kills true matches.
4. **Offer attributes stay out of embeddings.** Re-pricing a job re-scores in milliseconds; it never re-embeds.
5. **Provenance is first-class.** AI-inferred data (`derived`, `source: "ai-inferred"`) is never mixed with what the candidate actually wrote — required for GDPR access requests and EU AI Act explainability.
6. **Human in the loop.** The engine ranks and explains; it never auto-rejects. Every opportunity carries human-readable `explain` reasons in business language.
7. **Thresholds are config, not constants.** Similarity scales differ per embedder; calibration profiles ship for neural and hash embedders.

## Repo layout

```
packages/        core, resume-parser, jd-parser, match-engine, chat-extractor
examples/        runnable demos (offline)
data/synthetic/  generated sample candidates & jobs — no real personal data
docs/            architecture & design notes
```

## Roadmap

- [ ] pgvector-backed `VectorStore`
- [ ] Synthetic data generator (LLM-generated German/English resume & JD corpus)
- [ ] Web app: reactivation board + AI pre-screening interview links
- [ ] Hybrid RAG package (multi-route retrieval, citation verification, canonical-answer overrides)

## License

MIT
