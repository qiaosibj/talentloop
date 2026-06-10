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

**Two scores per candidate-job pair**

- **Job fit** — could this person do the job? Combines: overall content similarity, hard requirements met, skill overlap, how closely past roles match, education level, and whether the person's stated goal points at this job.
- **Offer appeal** — would this job interest this person? Combines: salary vs. expectation, benefits, seniority, location, employer brand, and industry preference.
- How much each factor counts depends on the job category (blue-collar / sales / technical / general). When information is missing, that factor scores neutral — absence of information must never punish or reward a candidate.

**Result tiers**

- `optimal` (contact first) — good fit **and** an appealing offer **and** real work history **and** at least one strong, specific signal: a closely matching recent role, a stated goal that points at this job, or high content similarity
- `probe` (worth a try) — plausible; cheap outreach to test interest
- `explore` (long shot) — reachable only via AI-inferred career directions

The "one strong signal" rule exists because two failure modes are symmetric: averaging everything promotes keyword lookalikes with no real experience, while relying purely on text similarity rejects candidates whose similarity score is mediocre but whose actual role history matches the job exactly.

**Role-tendency inference.** Resumes with work descriptions but no job titles (common in blue-collar pools) get an LLM inference pass. The result lives in `derived` with `source: "ai-inferred"` — never merged into source data.

## Conversational extraction

`chat-extractor` implements the two-stage pattern: a ~0.7-temperature dialogue call (natural conversation, persona-driven, one question per turn, easy → sensitive ordering) plus a separate ~0.2-temperature extraction call over the transcript that emits slots, quick replies and a done flag. One combined call reliably degrades both the conversation and the JSON. Slot merging is cumulative and **conversation overrides stored data** — the person talking now outranks a stale resume.

## Compliance posture (EU)

- GDPR: provenance tags, consent/retention designed as product features (Phase 2), synthetic data only in the repo.
- EU AI Act: recruiting AI is high-risk → the engine **ranks and explains, humans decide**. No auto-rejection anywhere.

## Persistence

Phase 1 ships an in-memory `VectorStore`. The interface is one class away from pgvector; portraits are embedded once and reused, offer changes never trigger re-embedding.
