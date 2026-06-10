# TalentLoop

> Turn every resume a company has ever received into a living talent asset.

AI recruiting toolkit for small and mid-sized companies: structured resume/JD parsing, **reverse talent-pool matching** ("which dormant candidates fit the jobs I have open *today*?"), and conversational profile extraction — designed GDPR-first and human-in-the-loop.

**Status:** Phase 1 — core engine packages with an offline runnable demo. All data in this repo is synthetic.

## Quickstart

```bash
npm install
npm run demo     # builds and runs the reactivation board demo — no API key needed
```

The demo indexes 8 synthetic candidates against 5 open positions and prints a reactivation board: every candidate's best opportunity, classified as **optimal** (contact first), **probe** (worth a try) or **explore** (long shot).

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

## Repo layout

```
packages/        core, resume-parser, jd-parser, match-engine, chat-extractor
examples/        runnable demos (offline)
data/synthetic/  generated sample candidates & jobs — no real personal data
docs/            architecture & design notes
```

## Roadmap

- [ ] pgvector-backed `VectorStore`
- [ ] Synthetic data generator (LLM-generated multilingual resume & JD corpus)
- [ ] Web app: reactivation board + AI pre-screening interview links
- [ ] Hybrid RAG package (multi-route retrieval, citation verification, canonical-answer overrides)

## License

MIT
