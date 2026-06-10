import { LlmClient, completeJson } from "@talentloop/core";

/**
 * Two-stage conversational extractor.
 *
 * The core pattern: NEVER ask one LLM call to both hold a natural
 * conversation and emit structured JSON — quality of both degrades and the
 * JSON intermittently breaks. Instead:
 *
 *   Stage 1 (temperature ~0.7): pure-text dialogue with a persona.
 *   Stage 2 (temperature ~0.2): a separate call that reads the transcript
 *   and emits JSON — extracted slots, suggested quick replies, done flag.
 *
 * Slots accumulate across turns; newer statements in the conversation
 * overwrite older values (the person talking to you now outranks whatever
 * a stale document said).
 */

export interface SlotDef {
  key: string;
  /** Human label, e.g. "Current job status". */
  label: string;
  /** What to extract, phrased for the extraction model. */
  description: string;
}

export interface ExtractorConfig {
  /** System persona for the dialogue stage, e.g. a friendly recruiter. */
  persona: string;
  /** Conversation goal, e.g. "understand the candidate's current situation and expectations". */
  goal: string;
  /** Slots to fill, in the preferred asking order (easy → sensitive). */
  slots: SlotDef[];
  dialogueTemperature?: number;
  extractTemperature?: number;
}

export interface ChatTurn {
  role: "agent" | "user";
  text: string;
}

export interface ChatState {
  history: ChatTurn[];
  profile: Record<string, string>;
  done: boolean;
}

export interface ChatStep {
  reply: string;
  quickReplies: string[];
  state: ChatState;
}

export function emptyState(): ChatState {
  return { history: [], profile: {}, done: false };
}

export class TwoStageExtractor {
  constructor(
    private llm: LlmClient,
    private cfg: ExtractorConfig,
  ) {}

  /** Generate the opening message (no user input yet). */
  async open(context?: string): Promise<ChatStep> {
    const state = emptyState();
    const reply = await this.llm.complete(
      [
        `Goal of this conversation: ${this.cfg.goal}`,
        context ? `Context about the person: ${context}` : "",
        `Open the conversation: greet briefly, explain why you are reaching out in one sentence, and ask the FIRST question only ("${this.cfg.slots[0]?.label}"). Keep it short and human.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      { system: this.cfg.persona, temperature: this.cfg.dialogueTemperature ?? 0.7 },
    );
    state.history.push({ role: "agent", text: reply });
    return { reply, quickReplies: [], state };
  }

  /** One conversation turn: dialogue stage + extraction stage. */
  async chat(state: ChatState, userMessage: string): Promise<ChatStep> {
    const history: ChatTurn[] = [...state.history, { role: "user", text: userMessage }];

    // Stage 1: natural dialogue.
    const missing = this.cfg.slots.filter((s) => !(s.key in state.profile));
    const reply = await this.llm.complete(
      [
        `Goal: ${this.cfg.goal}`,
        `Already learned: ${JSON.stringify(state.profile)}`,
        `Still to learn (ask at most ONE per turn, in this order): ${missing.map((s) => s.label).join("; ") || "nothing — wrap up warmly"}`,
        `Conversation so far:`,
        renderTranscript(history),
        `Respond as the agent: react naturally to what the user just said, then ${missing.length > 0 ? "ask the next question" : "thank them and close"}. Plain text only.`,
      ].join("\n\n"),
      { system: this.cfg.persona, temperature: this.cfg.dialogueTemperature ?? 0.7 },
    );
    history.push({ role: "agent", text: reply });

    // Stage 2: low-temperature structured extraction over the transcript.
    const extracted = await completeJson<{
      slots: Record<string, string>;
      quickReplies: string[];
      done: boolean;
    }>(
      this.llm,
      [
        `Read this conversation transcript and extract the slots below. Later statements override earlier ones and override any prior data.`,
        `Slots: ${JSON.stringify(this.cfg.slots.map((s) => ({ key: s.key, description: s.description })))}`,
        `Transcript:`,
        renderTranscript(history),
        `Return ONLY JSON: { "slots": { <key>: <string value, omit if not yet mentioned> }, "quickReplies": [2-3 short answers the user could tap for the agent's last question], "done": <true when every slot has a value> }`,
      ].join("\n\n"),
      { temperature: this.cfg.extractTemperature ?? 0.2 },
    );

    // Cumulative merge: fresh non-empty values overwrite older ones.
    const profile = { ...state.profile };
    for (const [k, v] of Object.entries(extracted.slots ?? {})) {
      if (v && String(v).trim()) profile[k] = String(v).trim();
    }
    const done = extracted.done || this.cfg.slots.every((s) => s.key in profile);

    // The dialogue stage ran before extraction, so on the final turn it may
    // still have asked another question. Regenerate a proper closing instead.
    let finalReply = reply;
    if (done && missing.length > 0) {
      finalReply = await this.llm.complete(
        [
          `Goal: ${this.cfg.goal}`,
          `Everything needed has now been learned: ${JSON.stringify(profile)}`,
          `Still to learn (ask at most ONE per turn, in this order): nothing — wrap up warmly`,
          `Conversation so far:`,
          renderTranscript(history.slice(0, -1)),
          `Respond as the agent: thank them warmly, confirm a human will follow up, and close. Plain text only, no further questions.`,
        ].join("\n\n"),
        { system: this.cfg.persona, temperature: this.cfg.dialogueTemperature ?? 0.7 },
      );
      history[history.length - 1] = { role: "agent", text: finalReply };
    }

    return {
      reply: finalReply,
      quickReplies: done ? [] : (extracted.quickReplies ?? []),
      state: { history, profile, done },
    };
  }
}

function renderTranscript(history: ChatTurn[]): string {
  return history.map((t) => `${t.role === "agent" ? "Agent" : "User"}: ${t.text}`).join("\n");
}
