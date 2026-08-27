import { describe, expect, test } from "vitest";
import { runAgent } from "./agent-runner";
import type { ChatMessage } from "./chat-store";

const start: ChatMessage[] = [{ role: "user", content: "Repair and verify the app" }];

function response(content: string, toolCalls?: Array<{ id: string; name: string; args?: object }>) {
  return {
    choices: [
      {
        message: {
          content,
          ...(toolCalls
            ? {
                tool_calls: toolCalls.map((call) => ({
                  id: call.id,
                  function: { name: call.name, arguments: JSON.stringify(call.args ?? {}) },
                })),
              }
            : {}),
        },
      },
    ],
  };
}

describe("runAgent", () => {
  test("completes ordinary chat without requiring a control tool", async () => {
    const result = await runAgent({
      initialHistory: start,
      callModel: async () => response("Hello"),
      executeTool: async () => ({ content: "unused" }),
    });
    expect(result.status).toBe("completed");
    expect(result.finalText).toBe("Hello");
  });

  test("continues after progress-only prose once operational work starts", async () => {
    let calls = 0;
    const result = await runAgent({
      initialHistory: start,
      callModel: async () => {
        calls++;
        if (calls === 1) return response("", [{ id: "1", name: "read_file" }]);
        if (calls === 2) return response("I will now run the tests.");
        if (calls === 3) return response("", [{ id: "2", name: "run_command" }]);
        return response("", [{ id: "3", name: "finish_task", args: { report: "Fixed and verified." } }]);
      },
      executeTool: async () => ({ content: "ok" }),
    });
    expect(result.status).toBe("completed");
    expect(result.finalText).toBe("Fixed and verified.");
    expect(calls).toBe(4);
    expect(result.history.some((m) => typeof m.content === "string" && m.content.includes("execution controller"))).toBe(true);
  });

  test("supports workflows longer than the former eight-step limit", async () => {
    let calls = 0;
    let executions = 0;
    const result = await runAgent({
      initialHistory: start,
      callModel: async () => {
        calls++;
        if (calls <= 12) return response("", [{ id: String(calls), name: "run_command", args: { command: `step-${calls}` } }]);
        return response("", [{ id: "done", name: "finish_task", args: { report: "All 12 steps verified." } }]);
      },
      executeTool: async () => {
        executions++;
        return { content: "ok" };
      },
    });
    expect(result.status).toBe("completed");
    expect(executions).toBe(12);
    expect(result.steps).toBe(13);
  });

  test("returns a genuine user-input blocker", async () => {
    const result = await runAgent({
      initialHistory: start,
      callModel: async () => response("", [{ id: "b", name: "request_user_input", args: { question: "Approve deletion?", reason: "Destructive" } }]),
      executeTool: async () => ({ content: "unused" }),
    });
    expect(result.status).toBe("blocked");
    expect(result.finalText).toBe("Approve deletion?");
  });

  test("blocks repeated identical calls without executing them forever", async () => {
    let modelCalls = 0;
    let executions = 0;
    const result = await runAgent({
      initialHistory: start,
      maxIdenticalCalls: 2,
      callModel: async () => {
        modelCalls++;
        if (modelCalls <= 4) return response("", [{ id: String(modelCalls), name: "read_file", args: { path: "same.py" } }]);
        return response("", [{ id: "done", name: "finish_task", args: { report: "Loop handled." } }]);
      },
      executeTool: async () => {
        executions++;
        return { content: "ok" };
      },
    });
    expect(result.status).toBe("completed");
    expect(executions).toBe(2);
    expect(result.history.some((m) => typeof m.content === "string" && m.content.includes("Repeated identical"))).toBe(true);
  });

  test("preserves tool errors so the model can investigate", async () => {
    let calls = 0;
    const result = await runAgent({
      initialHistory: start,
      callModel: async (history) => {
        calls++;
        if (calls === 1) return response("", [{ id: "1", name: "run_command" }]);
        expect(history.some((m) => m.role === "tool" && String(m.content).startsWith("ERROR"))).toBe(true);
        return response("", [{ id: "2", name: "finish_task", args: { report: "Failure investigated." } }]);
      },
      executeTool: async () => ({ content: "ERROR (408): timed out" }),
    });
    expect(result.finalText).toBe("Failure investigated.");
  });

  test("reports and persists budget exhaustion instead of stopping silently", async () => {
    let persisted: ChatMessage[] = [];
    const result = await runAgent({
      initialHistory: start,
      maxSteps: 3,
      callModel: async (_history) => response("", [{ id: String(Math.random()), name: "run_command", args: { command: String(Math.random()) } }]),
      executeTool: async () => ({ content: "ok" }),
      onUpdate: (history) => { persisted = history; },
    });
    expect(result.status).toBe("exhausted");
    expect(result.finalText).toContain("paused safely");
    expect(persisted.at(-1)?.content).toContain("Send **continue**");
  });

  test("keeps each run's updates isolated", async () => {
    const updatesA: ChatMessage[][] = [];
    const updatesB: ChatMessage[][] = [];
    await Promise.all([
      runAgent({
        initialHistory: [{ role: "user", content: "A" }],
        callModel: async () => response("A done"),
        executeTool: async () => ({ content: "unused" }),
        onUpdate: (history) => updatesA.push(history),
      }),
      runAgent({
        initialHistory: [{ role: "user", content: "B" }],
        callModel: async () => response("B done"),
        executeTool: async () => ({ content: "unused" }),
        onUpdate: (history) => updatesB.push(history),
      }),
    ]);
    expect(updatesA.flat().some((m) => m.content === "B done")).toBe(false);
    expect(updatesB.flat().some((m) => m.content === "A done")).toBe(false);
  });
});
describe("stall protection", () => {
  test("stops after repeated empty model replies instead of hanging", async () => {
    const result = await runAgent({
      initialHistory: [{ role: "user", content: "go", ts: 0 }],
      callModel: async () => ({ choices: [{ message: { content: "" } }] }),
      executeTool: async () => ({ content: "ok" }),
      maxEmptyReplies: 2,
    });
    expect(result.steps).toBe(2);
    expect(result.finalText).toContain("empty responses");
  });

  test("turns a hung tool into an error the model can react to", async () => {
    let calls = 0;
    const result = await runAgent({
      initialHistory: [{ role: "user", content: "go", ts: 0 }],
      callModel: async () => {
        calls++;
        return calls === 1
          ? {
              choices: [
                {
                  message: {
                    tool_calls: [{ id: "t1", function: { name: "run_command", arguments: "{}" } }],
                  },
                },
              ],
            }
          : {
              choices: [
                {
                  message: {
                    tool_calls: [
                      { id: "t2", function: { name: "finish_task", arguments: '{"report":"done"}' } },
                    ],
                  },
                },
              ],
            };
      },
      executeTool: () => new Promise(() => {}),
      toolTimeoutMs: 20,
    });
    expect(result.status).toBe("completed");
    expect(JSON.stringify(result.history)).toContain("did not respond within");
  });

  test("aborts when the user stops the run", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const result = await runAgent({
      initialHistory: [{ role: "user", content: "go", ts: 0 }],
      callModel: async () => ({ choices: [{ message: { content: "hi" } }] }),
      executeTool: async () => ({ content: "ok" }),
      signal: ctrl.signal,
    });
    expect(result.status).toBe("aborted");
  });
});
