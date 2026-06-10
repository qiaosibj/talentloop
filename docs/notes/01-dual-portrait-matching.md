# Design note: dual-portrait matching & tier gating

(Outline — to be expanded into a blog post.)

1. Why job-centric search fails for dormant pools; the reverse question.
2. Dual portraits: intention+latest vs. full history — what each hit means for outreach strategy.
3. Job fit vs. offer appeal: you're not just screening, you're *selling* — modeling both sides.
4. Weight profiles per job category: why blue-collar weighs certifications and commute, tech weighs skills and semantics.
5. The optimal-tier gate: failure cases of (a) weighted average only — keyword lookalikes with zero relevant history get promoted; (b) semantic floor only — true matches with low embedding similarity but exact role history get killed. Solution: `max(semantic, experienceFit, intentFit) ≥ floor`.
6. Neutral 0.5 for missing data — absence of evidence is not evidence.
7. Threshold calibration is embedder-specific: ship config profiles, not constants.
