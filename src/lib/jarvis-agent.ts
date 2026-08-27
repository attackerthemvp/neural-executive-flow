// Calls the local helper agent running on the user's machine.
import { getSettings } from "@/lib/settings-store";

export const AGENT_URLS = ["http://127.0.0.1:7337", "http://localhost:7337"];

/** Adds the shared-secret header when the user configured one. */
function withAgentAuth(init: RequestInit): RequestInit {
  const token = getSettings().computer.agentToken.trim();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set("X-Nexus-Token", token);
  return { ...init, headers };
}

export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export async function checkAgentStatus(): Promise<boolean> {
  for (const agentUrl of AGENT_URLS) {
    try {
      const r = await fetch(`${agentUrl}/health`, { method: "GET", cache: "no-store" });
      if (r.ok) return true;
    } catch {
      // Try the next localhost variant before declaring the agent offline.
    }
  }

  return false;
}

export async function fetchAgent(path: string, init: RequestInit = {}) {
  let lastError: unknown;
  const authed = withAgentAuth(init);

  for (const agentUrl of AGENT_URLS) {
    try {
      return await fetch(`${agentUrl}${path}`, authed);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  timeoutMs?: number,
): Promise<string> {
  // A hung local command must surface as an error, never as an infinite wait.
  const budget =
    timeoutMs ??
    (typeof args["timeout_sec"] === "number"
      ? (args["timeout_sec"] as number) * 1000 + 30_000
      : 300_000);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budget);
  try {
    const r = await fetchAgent(`/tool/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    const text = await r.text();
    if (!r.ok) return `ERROR (${r.status}): ${text}`;
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return `ERROR: ${name} exceeded ${Math.round(budget / 1000)}s and was cancelled. Run it in the background with run_command_bg, or narrow the work.`;
    }
    return `ERROR: Local NEXUS agent unreachable at ${AGENT_URLS.join(" or ")}. Make sure it's running. (${
      e instanceof Error ? e.message : String(e)
    })`;
  } finally {
    clearTimeout(timer);
  }
}

