# Architecture

## The problem

Companies accumulate thousands of resumes that go dormant after one hiring round. Recruiting starts from zero every time while the answer often already sits in the company's own pool. TalentLoop inverts the usual flow: instead of "post a job, wait for applicants", it continuously asks **"who in the pool fits what's open today — and would the offer actually interest them?"**

## Pipeline

```
resume text ──▶ resume-parser ──▶ ResumeProfile ─┐
                                                  ├─▶ match-engine ──▶ Opportunity board
JD text ─────▶ jd-parser ──────▶ JdRequirement ──┘        │
                                                          ▼
                                          outreach (email) ─▶ chat-extractor
                                                          │   (candidate conversation)
                                                          ▼
                                          profile updates flow back into the pool
```

## Matching model

**Dual portraits per candidate**

| Portrait | Built from | A hit means |
|---|---|---|
| primary | intention + latest role (+ inferred tendency) | likely *active* interest |
| full | entire history, education, certifications | plausible, more speculative |

**Scoring: M × A**

- **Fit (M)** — semantic, mustHave, skills, experienceFit, educationFit, intentFit
- **Attraction (A)** — salary, benefits, level, location, brand, industry
- Weights vary by job category (blue-collar / sales / technical / general); missing data scores neutral 0.5 — absence of information must never punish or reward.

**Tiers**

- `optimal` — M ≥ floor, A ≥ floor, has work history, **and** at least one strong fit signal `max(semantic, experienceFit, intentFit) ≥ optimalFitFloor`
- `probe` — plausible; cheap outreach to test interest
- `explore` — reachable only via AI-inferred career directions

The strong-signal gate exists because two failure modes are symmetric: a weighted average alone promotes keyword lookalikes with no real experience; a pure semantic floor kills candidates whose embedding similarity is mediocre but whose role history matches the job exactly.

**Role-tendency inference.** Resumes with work descriptions but no job titles (common in blue-collar pools) get an LLM inference pass. The result lives in `derived` with `source: "ai-inferred"` — never merged into source data.

## Conversational extraction

`chat-extractor` implements the two-stage pattern: a ~0.7-temperature dialogue call (natural conversation, persona-driven, one question per turn, easy → sensitive ordering) plus a separate ~0.2-temperature extraction call over the transcript that emits slots, quick replies and a done flag. One combined call reliably degrades both the conversation and the JSON. Slot merging is cumulative and **conversation overrides stored data** — the person talking now outranks a stale resume.

## Compliance posture (DE/EU)

- GDPR: provenance tags, consent/retention designed as product features (Phase 2), synthetic data only in the repo.
- EU AI Act: recruiting AI is high-risk → the engine **ranks and explains, humans decide**. No auto-rejection anywhere.

## Persistence

Phase 1 ships an in-memory `VectorStore`. The interface is one class away from pgvector; portraits are embedded once and reused, offer changes never trigger re-embedding.
