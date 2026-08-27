// Provider health monitor. In-memory per server instance; cheap and dependency-free.
import type { ErrorCategory, ProviderId, ProviderState } from "./types";
import { getProviderConfig, PROVIDERS } from "./config";

interface Stats {
  successes: number;
  failures: number;
  consecutiveFailures: number;
  latencies: number[];
  lastSuccess?: number;
  lastFailure?: number;
  lastError?: { category: ErrorCategory; status?: number; message: string };
  cooldownUntil?: number;
  cooldownStreak: number;
  rateLimited?: boolean;
  /** model id -> disabled-until timestamp (permanently unsupported models get a long block) */
  badModels: Record<string, number>;
}

const stats = new Map<ProviderId, Stats>();

function s(id: ProviderId): Stats {
  let v = stats.get(id);
  if (!v) {
    v = { successes: 0, failures: 0, consecutiveFailures: 0, latencies: [], cooldownStreak: 0, badModels: {} };
    stats.set(id, v);
  }
  return v;
}

export function hasSecret(id: ProviderId): boolean {
  const cfg = getProviderConfig(id);
  if (!cfg) return false;
  return Boolean(process.env[cfg.secretName]);
}

export function recordSuccess(id: ProviderId, latencyMs: number) {
  const v = s(id);
  v.successes++;
  v.consecutiveFailures = 0;
  v.cooldownStreak = 0;
  v.rateLimited = false;
  delete v.cooldownUntil;
  v.lastSuccess = Date.now();
  v.latencies.push(latencyMs);
  if (v.latencies.length > 20) v.latencies.shift();
}

export function recordFailure(
  id: ProviderId,
  category: ErrorCategory,
  message: string,
  opts: { status?: number; retryAfterMs?: number } = {},
) {
  const cfg = getProviderConfig(id);
  const v = s(id);
  v.failures++;
  v.consecutiveFailures++;
  v.lastFailure = Date.now();
  v.lastError = { category, message, ...(opts.status !== undefined ? { status: opts.status } : {}) };

  const pol = cfg?.cooldown;
  if (!pol) return;

  if (category === "RATE_LIMIT") {
    v.rateLimited = true;
    const wait = opts.retryAfterMs ?? Math.min(pol.baseCooldownMs * 2 ** v.cooldownStreak, pol.maxCooldownMs);
    v.cooldownStreak++;
    v.cooldownUntil = Date.now() + wait;
    return;
  }
  if (category === "AUTH") {
    // Configuration problem — back off hard but never permanently.
    v.cooldownUntil = Date.now() + pol.maxCooldownMs;
    return;
  }
  if (v.consecutiveFailures >= pol.cooldownAfter) {
    const wait = Math.min(pol.baseCooldownMs * 2 ** v.cooldownStreak, pol.maxCooldownMs);
    v.cooldownStreak++;
    v.cooldownUntil = Date.now() + wait;
  }
}

export function markModelUnavailable(id: ProviderId, model: string, ms = 30 * 60_000) {
  s(id).badModels[model] = Date.now() + ms;
}

export function isModelUsable(id: ProviderId, model: string) {
  const until = s(id).badModels[model];
  return !until || until < Date.now();
}

export function getState(id: ProviderId): ProviderState {
  const cfg = getProviderConfig(id);
  if (!cfg || !cfg.enabled) return "OFFLINE";
  if (!hasSecret(id)) return "CONFIGURATION_MISSING";
  const v = s(id);
  if (v.cooldownUntil && v.cooldownUntil > Date.now()) return v.rateLimited ? "RATE_LIMITED" : "COOLDOWN";
  if (v.successes === 0 && v.failures === 0) return "UNKNOWN";
  if (v.consecutiveFailures >= cfg.cooldown.degradedAfter) return "DEGRADED";
  const total = v.successes + v.failures;
  if (total >= 5 && v.successes / total < 0.7) return "DEGRADED";
  return "HEALTHY";
}

export function isAvailable(id: ProviderId) {
  const st = getState(id);
  return st === "HEALTHY" || st === "UNKNOWN" || st === "DEGRADED";
}

export function snapshot() {
  return PROVIDERS.map((cfg) => cfg.id).map((id) => {
    const cfg = getProviderConfig(id)!;
    const v = s(id);
    const total = v.successes + v.failures;
    const avg = v.latencies.length
      ? Math.round(v.latencies.reduce((a, b) => a + b, 0) / v.latencies.length)
      : null;
    return {
      id,
      name: cfg.name,
      role: cfg.role,
      priority: cfg.priority,
      state: getState(id),
      configured: hasSecret(id),
      successes: v.successes,
      failures: v.failures,
      consecutiveFailures: v.consecutiveFailures,
      successRate: total ? Math.round((v.successes / total) * 100) : null,
      avgLatencyMs: avg,
      lastSuccess: v.lastSuccess ?? null,
      lastFailure: v.lastFailure ?? null,
      lastError: v.lastError?.category ?? null,
      cooldownUntil: v.cooldownUntil ?? null,
      // Non-sensitive model catalogue so the Settings UI can pin a model.
      models: cfg.models.map((m) => ({
        id: m.id,
        label: m.label,
        capabilities: m.capabilities,
        usable: isModelUsable(id, m.id),
      })),
    };
  });
}
