// Central NEXUS provider/model registry. Change models & priorities HERE only.
import type { ProviderConfig } from "./types";

const defaultRetry = { maxAttemptsPerProvider: 2, timeoutMs: 45_000 };
const defaultCooldown = {
  degradedAfter: 2,
  cooldownAfter: 3,
  baseCooldownMs: 30_000,
  maxCooldownMs: 10 * 60_000,
};

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    // OpenAI-compatible surface of the Gemini API (keeps one common adapter).
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    secretName: "GEMINI_API_KEY",
    enabled: true,
    priority: 1,
    role: "primary",
    capabilities: ["tools", "vision", "coding", "reasoning", "long_context", "fast"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    models: [
      {
        id: "gemini-3.7-flash",
        label: "Gemini 3.7 Flash",
        capabilities: ["tools", "vision", "coding", "reasoning", "long_context", "fast"],
        weight: 100,
        bestFor: ["GENERAL", "TOOL_USE", "COMPUTER_CONTROL", "RESEARCH", "VISION"],
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro",
        capabilities: ["tools", "vision", "coding", "reasoning", "long_context"],
        weight: 90,
        bestFor: ["CODING", "DEBUGGING", "REASONING", "LONG_CONTEXT"],
      },
      {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        capabilities: ["tools", "fast"],
        weight: 70,
        bestFor: ["SIMPLE_FAST"],
      },
      {
        id: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash",
        capabilities: ["tools", "vision", "coding", "reasoning", "fast"],
        weight: 60,
      },
    ],
  },
  {
    id: "lovable",
    name: "Lovable AI",
    baseUrl: "https://ai.gateway.lovable.dev/v1",
    secretName: "LOVABLE_API_KEY",
    enabled: true,  // No API key — disable to skip attempts
    priority: 2,
    role: "fallback",
    capabilities: ["tools", "vision", "coding", "reasoning", "long_context", "fast"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    models: [
      {
        id: "google/gemini-2.5-flash",
        label: "Gemini 2.5 Flash (Lovable)",
        capabilities: ["tools", "vision", "coding", "reasoning", "long_context", "fast"],
        weight: 100,
      },
      {
        id: "google/gemini-2.5-pro",
        label: "Gemini 2.5 Pro (Lovable)",
        capabilities: ["tools", "vision", "coding", "reasoning", "long_context"],
        weight: 80,
        bestFor: ["CODING", "DEBUGGING", "REASONING"],
      },
      {
        id: "google/gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash Lite (Lovable)",
        capabilities: ["tools", "fast"],
        weight: 60,
        bestFor: ["SIMPLE_FAST"],
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    secretName: "OPENROUTER_API_KEY",
    enabled: true,
    priority: 3,
    role: "fallback",
    capabilities: ["tools", "coding", "reasoning", "long_context", "fast"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    discovery: true,
    headers: { "X-Title": "NEXUS" },
    models: [
      {
        id: "nvidia/nemotron-3-ultra-550b-a55b:free",
        label: "Nemotron Ultra 550B (free)",
        capabilities: ["tools", "reasoning", "coding", "long_context"],
        weight: 100,
        bestFor: ["REASONING", "CODING", "LONG_CONTEXT"],
        free: true,
      },
      {
        id: "nvidia/nemotron-3-super-120b-a12b:free",
        label: "Nemotron Super 120B (free)",
        capabilities: ["tools", "reasoning", "coding"],
        weight: 90,
        bestFor: ["GENERAL", "TOOL_USE"],
        free: true,
      },
      {
        id: "google/gemma-4-31b-it:free",
        label: "Gemma 4 31B (free)",
        capabilities: ["tools", "vision", "coding", "reasoning"],
        weight: 80,
        bestFor: ["CODING", "VISION"],
        free: true,
      },
      {
        id: "google/gemma-4-26b-a4b-it:free",
        label: "Gemma 4 26B MoE (free)",
        capabilities: ["tools", "reasoning", "fast"],
        weight: 70,
        free: true,
      },
      {
        id: "z-ai/glm-5.2:free",
        label: "GLM 5.2 (free)",
        capabilities: ["tools", "reasoning"],
        weight: 65,
        free: true,
      },
      {
        id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        label: "Nemotron Nano Reasoning (free)",
        capabilities: ["reasoning", "fast"],
        weight: 55,
        bestFor: ["SIMPLE_FAST"],
        free: true,
      },
      {
        id: "minimax/minimax-m3:free",
        label: "MiniMax M3 (free)",
        capabilities: ["tools", "long_context"],
        weight: 50,
        free: true,
      },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    secretName: "CEREBRAS_API_KEY",
    enabled: true,
    priority: 4,
    role: "emergency",
    capabilities: ["tools", "coding", "reasoning", "fast"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    models: [
      {
        id: "gpt-oss-120b",
        label: "GPT OSS 120B (Cerebras)",
        capabilities: ["tools", "reasoning", "coding", "fast"],
        weight: 100,
      },
      {
        id: "gemma-4-31b",
        label: "Gemma 4 31B (Cerebras)",
        capabilities: ["tools", "coding", "fast"],
        weight: 80,
        bestFor: ["CODING"],
      },
    ],
  },
  {
    id: "grok",
    name: "xAI Grok",
    baseUrl: "https://api.x.ai/v1",
    secretName: "XAI_API_KEY",
    enabled: false,  // No API key — disable to skip attempts
    priority: 5,
    role: "emergency",
    capabilities: ["tools", "vision", "coding", "reasoning", "long_context"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    models: [
      {
        id: "grok-3-mini",
        label: "Grok 3 Mini",
        capabilities: ["tools", "reasoning", "fast"],
        weight: 100,
      },
      {
        id: "grok-3",
        label: "Grok 3",
        capabilities: ["tools", "reasoning", "coding", "long_context"],
        weight: 80,
        bestFor: ["CODING", "REASONING"],
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    secretName: "GROQ_API_KEY",
    enabled: true,
    priority: 6,
    role: "emergency",
    capabilities: ["tools", "coding", "reasoning", "fast"],
    retry: defaultRetry,
    cooldown: defaultCooldown,
    models: [
      {
        id: "openai/gpt-oss-120b",
        label: "GPT OSS 120B (Groq)",
        capabilities: ["tools", "reasoning", "coding", "fast"],
        weight: 100,
      },
      {
        id: "openai/gpt-oss-20b",
        label: "GPT OSS 20B (Groq)",
        capabilities: ["tools", "fast"],
        weight: 80,
        bestFor: ["SIMPLE_FAST"],
      },
      {
        id: "qwen/qwen3.6-27b",
        label: "Qwen 3.6 27B (Groq)",
        capabilities: ["tools", "coding", "reasoning"],
        weight: 70,
        bestFor: ["CODING"],
      },
      {
        id: "qwen/qwen3.8-27b",
        label: "Qwen 3.8 27B (Groq)",
        capabilities: ["tools", "coding", "reasoning"],
        weight: 65,
      },
      {
        id: "groq/compound",
        label: "Groq Compound (Groq)",
        capabilities: ["tools", "reasoning"],
        weight: 60,
      },
      {
        id: "groq/compound-mini",
        label: "Groq Compound Mini (Groq)",
        capabilities: ["tools", "fast"],
        weight: 50,
        bestFor: ["SIMPLE_FAST"],
      },
    ],
  },
];

/** Max provider attempts for a single user request (prevents infinite loops). */
export const MAX_PROVIDER_ATTEMPTS = 6;

export function getProviderConfig(id: string) {
  return PROVIDERS.find((p) => p.id === id);
}
