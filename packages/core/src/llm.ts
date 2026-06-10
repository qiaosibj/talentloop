/**
 * Provider-agnostic LLM client abstraction.
 *
 * Two adapters are provided out of the box (Anthropic and any
 * OpenAI-compatible endpoint). Both use the global `fetch` available in
 * Node >= 18, so the package has zero runtime dependencies.
 */

export interface LlmOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmClient {
  complete(prompt: string, opts?: LlmOptions): Promise<string>;
}

export interface AnthropicConfig {
  apiKey: string;
  /** e.g. "claude-sonnet-4-6" */
  model?: string;
  baseUrl?: string;
}

export class AnthropicLlm implements LlmClient {
  constructor(private cfg: AnthropicConfig) {}

  async complete(prompt: string, opts: LlmOptions = {}): Promise<string> {
    const res = await fetch(`${this.cfg.baseUrl ?? "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.cfg.model ?? "claude-sonnet-4-6",
        max_tokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.3,
        system: opts.system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }
}

export interface OpenAICompatConfig {
  apiKey: string;
  /** e.g. "gpt-4o-mini" or any model served by an OpenAI-compatible API */
  model: string;
  /** e.g. "https://api.openai.com" — override for self-hosted/compatible providers */
  baseUrl?: string;
}

/** Works with OpenAI and any OpenAI-compatible chat completion endpoint. */
export class OpenAICompatLlm implements LlmClient {
  constructor(private cfg: OpenAICompatConfig) {}

  async complete(prompt: string, opts: LlmOptions = {}): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (opts.system) messages.push({ role: "system", content: opts.system });
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${this.cfg.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2048,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  }
}

/**
 * Ask the model for JSON and parse it defensively: strips markdown fences,
 * retries once with an explicit correction prompt on parse failure.
 *
 * Lesson baked in: never ask a model to chat *and* emit JSON in the same
 * call — run a dedicated low-temperature extraction call instead.
 */
export async function completeJson<T>(
  llm: LlmClient,
  prompt: string,
  opts: LlmOptions = {},
): Promise<T> {
  const jsonOpts: LlmOptions = { temperature: 0.1, ...opts };
  let raw = await llm.complete(prompt, jsonOpts);
  for (let attempt = 0; ; attempt++) {
    try {
      return JSON.parse(stripFences(raw)) as T;
    } catch (err) {
      if (attempt >= 1) throw new Error(`LLM returned unparsable JSON: ${raw.slice(0, 400)}`);
      raw = await llm.complete(
        `The following was supposed to be valid JSON but is not. Return ONLY the corrected JSON, no commentary:\n\n${raw}`,
        jsonOpts,
      );
    }
  }
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) return fence[1];
  // Fall back to the first {...} or [...] block in the output.
  const start = trimmed.search(/[[{]/);
  if (start > 0) return trimmed.slice(start);
  return trimmed;
}
