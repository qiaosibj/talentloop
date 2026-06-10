# Design note: two-stage conversational extraction

(Outline — to be expanded into a blog post.)

1. The naive approach: one call that chats AND returns JSON — and how it fails (format breaks under conversational pressure, dialogue turns robotic, fields silently dropped).
2. The split: dialogue call (temp ~0.7, persona, one question per turn) + extraction call (temp ~0.2, full transcript → slots/quickReplies/done).
3. Question ordering: easy → sensitive (status → experience → constraints → salary). Drop-off drops dramatically.
4. Cumulative slot merging; conversation overrides stored data.
5. Cost note: two calls per turn, but the extraction call is short and cacheable; reliability is worth 2×.
6. Quick replies as UX: extraction stage proposes 2–3 tap answers for the question the dialogue stage just asked.
