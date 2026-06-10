import { AnthropicLlm, LlmClient, OpenAICompatLlm } from "@talentloop/core";
import { DemoLlm } from "./demo-llm";

export interface LlmSelection {
  llm: LlmClient;
  mode: "anthropic" | "openai-compatible" | "demo";
}

/** Pick a real LLM when an API key is configured, otherwise the offline demo stand-in. */
export function selectLlm(): LlmSelection {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      llm: new AnthropicLlm({ apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL }),
      mode: "anthropic",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      llm: new OpenAICompatLlm({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        baseUrl: process.env.OPENAI_BASE_URL,
      }),
      mode: "openai-compatible",
    };
  }
  return { llm: new DemoLlm(), mode: "demo" };
}
