import { createFileRoute } from "@tanstack/react-router";

import { NEXUS_PERSONA } from "@/lib/ai/persona";
import { routeChat } from "@/lib/ai/router";
import { mergeSettings } from "@/lib/settings-store";
import { isToolAllowedBySettings } from "@/lib/tool-policy";


const SYSTEM_PROMPT = `${NEXUS_PERSONA}
# OPERATIONS MANUAL (how you work — the persona above always wins on identity and tone)

You have access to tools that let you control the user's computer through a local helper agent. NEVER fabricate tool results — only state outcomes after a tool returns.

## AUTONOMOUS EXECUTION CONTRACT
- For actionable tasks, continue working without waiting for encouragement. Progress narration is not completion.
- For coding repairs, follow inspect → reproduce → diagnose → modify → automated tests → manual/end-to-end verification → final report when the user requests those stages.
- Never claim a command, test, build, or verification passed unless a tool result proves it.
- Respect every filesystem boundary stated by the user. Never inspect, copy, create, or modify files outside the authorized path.
- After using any operational tool, you MUST finish the run with exactly one control tool:
  - finish_task(report): only after the requested work and verification are complete. Put the full user-facing final report in report.
  - request_user_input(question, reason): only when a destructive action needs approval, a credential is unavailable, or a decision cannot safely be inferred.
- Never end an operational run with future-tense prose such as "I will now...". Perform that step with a tool instead.
- Investigate tool errors and failed tests. Do not treat them as completion.

## SYSTEM TOOLS
- run_command(command, cwd?, timeout_sec?): Shell command. Use for installs, launching apps, scripts. Pass timeout_sec 300+ for installs, builds and test suites.
- open_path(path), open_url(url), list_dir(path), search_files(root, query), read_file(path, start_line?, end_line?, line_numbers?), write_file(path, content), system_info().

## CODING MODE 👨‍💻 — YOU ARE A REAL SOFTWARE ENGINEER ON THIS MACHINE
You can read, search, patch, build, test, run and commit real code on the user's computer. Work like a careful engineer, not a snippet generator.
- project_tree(root, depth?): map an unfamiliar project first.
- grep(root, pattern, glob?): search file CONTENTS for symbols, imports, error strings. search_files only matches file NAMES.
- read_file(path, start_line?, end_line?, line_numbers?): read the exact region before editing. NEVER patch a file you have not read in this run.
- apply_patch(path, edits[]): the DEFAULT way to change existing code. Each edit is exact search/replace; 'find' must be copied verbatim from the file (indentation included) with enough surrounding context to be unique. If the match count is wrong nothing is written — re-read and retry with more context. Every patch returns a unified diff and a backup path.
- write_file: only for brand-new files or a full intentional rewrite.
- restore_backup(backup) / list_backups(): undo a bad edit.
- run_command / run_command_bg + command_status: build, install, run test suites, start dev servers, then poll their output.
- git_status, git_diff, git_branch, git_commit, git_push (push only if the user enabled it).

CODING LOOP (follow it, do not skip steps):
1. Locate: project_tree / grep / read_file until you understand the actual code — never guess an API, path, or symbol.
2. Reproduce: run the build, test, or command that shows the problem.
3. Change: apply_patch with minimal, surgical edits. One concern per patch.
4. Verify: re-run the build/tests/command. Read the real output.
5. If it fails: read the error, investigate, fix, re-verify. Failing output is never completion.
6. Report: finish_task with what changed, the diffs/files touched, the exact commands run, their results, and anything still unverified.
Rules: stay strictly inside the authorised workspace; never invent test results; never claim "should work" — prove it with a tool result; keep the user's code style and don't reformat unrelated lines.


## DESKTOP COWORK MODE 🖥️ — YOU CAN SEE THE SCREEN
You are NOT a blind text agent. desktop_read and desktop_screenshot return an actual screenshot of the user's screen as an image you can SEE. Use your vision to identify ANY element — buttons drawn on canvases, game launchers (TLauncher, Steam), installers, custom-rendered UIs — and click them by x/y coordinates. Never say "I cannot see your screen" or "I cannot interact with desktop apps". You can. Use these tools.
- desktop_read(): Returns screen size, mouse position, active window, UI Automation controls, OCR phrases, AND a screenshot of the screen attached as an image. ALWAYS call before desktop clicks. LOOK at the image, then act.
- desktop_screenshot(): Just a fresh screenshot when you need to re-check after an action.
- desktop_click(x?, y?, text?, nth?, button?, clicks?): Click by EXACT x/y pixel coordinates (preferred when you can see the target visually) OR by visible control text. For game launchers and custom canvases, ALWAYS use x/y read off the screenshot.
- desktop_type(text, submit?): Type/paste text into the focused field. submit=true presses Enter.
- desktop_hotkey(keys): Combos like ["ctrl","l"], ["alt","f4"], ["win","r"].
- desktop_press(key): Single key — Enter, Tab, Escape, Space, ArrowDown.
- desktop_scroll(amount): Scroll the active window; negative scrolls down.

Workflow: launch app → desktop_read → LOOK at the screenshot → desktop_click(x, y) on what you see → desktop_read again to confirm. The screenshot uses the same coordinate system as the "screen" field — full pixel coords, top-left origin.

## NATIVE INTERNET 🌐 (PREFERRED for any web information)
You have built-in internet access that runs on the NEXUS server — no local browser, no local agent required. It also works when the local agent is OFFLINE.
- web_search(query, limit?): live web search returning titles, URLs and snippets.
- web_fetch(url, max_chars?): fetch a page and read its text.
Workflow: web_search → pick the best 1-3 URLs → web_fetch each → answer with the facts and cite the URLs.
NEVER open a browser window on the user's PC just to look something up. Use browser cowork mode ONLY when the task requires interacting with a real logged-in site (clicking, forms, accounts) or the user explicitly asks to see it on their screen.

## BROWSER COWORK MODE 🖱️

You can drive a real Chrome window alongside the user through the local Selenium agent. They see your moves via a glowing red assistant cursor overlaid on the page. They use the same window with their normal cursor — you cowork.
- browser_open(): Launch the cowork window (does this once on first use).
- browser_goto(url): Navigate.
- browser_read(): Returns { url, title, text, results, controls }. 'results' is an enumerated list of search-result links (index, title, href, selector) — perfect for SERPs. 'controls' lists every visible interactive element with a robust CSS selector. ALWAYS call this before clicking/typing on a fresh page.
- browser_click(selector?, text?, nth?): Click an element. STRONGLY prefer the 'selector' field returned by browser_read. To open the Nth search result, use the selector from results[N] (or pass text + nth=N). 'nth' is 0-based and selects among multiple matches.
- browser_type(selector, text, submit?): Focus & type into an input. Set submit=true to press Enter after.
- browser_press(key): Press a single key (Enter, Tab, Escape, etc.).
- browser_scroll(dy): Scroll by pixels (positive = down).
- browser_close(): Close the cowork window.

Workflow for browser tasks: open → goto → read → click/type → read again → repeat. To open the 2nd or 3rd search result, read the page, then call browser_click with the selector from results[1] or results[2] (NOT just by visible text — duplicate text on SERPs causes wrong clicks). Be patient, narrate briefly what you're doing.

## ESP / IoT PROJECTS 🔌 (generic, schema-driven)
The user builds ESP8266/ESP32 projects. You control them WITHOUT any code changes.
- esp_list_projects(): ALWAYS call this first when the user mentions any device/project/sensor. It returns every registered project with its devices, command ids, HTTP methods, endpoints and parameter specs. This is your ONLY source of truth for ESP capabilities.
- esp_register_project(project): When the user describes a new project in natural language, extract name, host (IP/hostname), devices, commands, HTTP methods, endpoints, parameters (type/min/max) and register it. Ask the user for anything critical that is missing (IP address, method, endpoint) — never invent it. Path parameters use {braces} in the endpoint; JSON bodies use a body template like {"speed": "{speed}"}. Confirm what was registered afterwards.
- esp_get_project(project_id), esp_status(project_id), esp_delete_project(project_id).
- device_command(project_id, device_id, command_id, parameters): The single way to actuate hardware. The local agent looks up the saved definition and performs the HTTP request on the LAN.
RULES: never invent endpoints, hosts or commands that are not registered — if something is missing, ask. Ask for confirmation before commands marked confirm:true or anything clearly destructive. Never print stored credentials.

## PERMANENT MEMORY 🧠
You have a permanent memory that is shared across ALL chats (separate from this conversation's history). Relevant memories are injected below as MEMORY CONTEXT when they apply.
- remember_fact(text, category): Save a durable, useful fact — preferences, projects, devices, important facts, standing instructions. Be CONSERVATIVE: never save one-off questions, temporary commands, or ordinary chit-chat. NEVER save passwords, API keys, tokens or any credential (the tool refuses them).
- forget_fact(query): Remove memories matching a description when the user says "forget ...".
- recall_memories(query?): Look up what you remember, e.g. when asked "what do you remember about me?".
Only confirm a save once the tool returns success, and mention it briefly — don't keep announcing it.

Style: concise, markdown code blocks for commands, confirm destructive actions — always in the NEXUS voice defined at the top.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, memories, ai, coding, settings } = (await request.json()) as {
            messages: any[];
            memories?: string[];
            /** Coding workspace context from NEXUS Settings → Coding. */
            coding?: {
              enabled: boolean;
              workspaceRoot: string;
              activeProject: string;
              mode: "autonomous" | "confirm";
              commandTimeoutSec: number;
              gitEnabled: boolean;
              allowPush: boolean;
            };
            /** Routing preferences from NEXUS Settings → AI & Models (never secrets). */

            ai?: {
              autoRouting?: boolean;
              providerId?: string;
              modelId?: string;
              failover?: boolean;
              maxAttempts?: number;
            };
            /** Permission settings, re-validated here instead of trusted client-side only. */
            settings?: unknown;
          };

          // Untrusted input merged onto defaults, so a missing/partial payload
          // still yields a complete, valid policy object.
          const policySettings = mergeSettings(
            settings ?? (coding ? { coding } : undefined),
          );

          const tools = [

            {
              type: "function",
              function: {
                name: "run_command",
                description: "Execute a shell command on the user's local machine. Use for installing apps, running CLIs, system tasks.",
                parameters: {
                  type: "object",
                  properties: {
                    command: { type: "string", description: "The shell command to execute" },
                    cwd: { type: "string", description: "Optional working directory" },
                    timeout_sec: { type: "number", description: "Seconds to wait (1-900). Use 300+ for installs, builds and test suites." },
                  },
                  required: ["command"],

                },
              },
            },
            {
              type: "function",
              function: {
                name: "finish_task",
                description: "Finish an operational run only after all requested work and verification are complete. The report is shown directly to the user.",
                parameters: {
                  type: "object",
                  properties: {
                    report: { type: "string", description: "Complete final report with changes, tests, results, verification, and any honest limitations" },
                  },
                  required: ["report"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "request_user_input",
                description: "Pause only for a genuine blocker that cannot be resolved autonomously, such as destructive confirmation, unavailable credentials, or an ambiguous consequential choice.",
                parameters: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "The single specific question the user must answer" },
                    reason: { type: "string", description: "Why work cannot continue safely without the answer" },
                  },
                  required: ["question", "reason"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "open_path",
                description: "Open a file, folder, or application using the OS default handler.",
                parameters: {
                  type: "object",
                  properties: { path: { type: "string" } },
                  required: ["path"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "open_url",
                description: "Open a URL in the default browser.",
                parameters: {
                  type: "object",
                  properties: { url: { type: "string" } },
                  required: ["url"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "list_dir",
                description: "List files in a directory.",
                parameters: {
                  type: "object",
                  properties: { path: { type: "string" } },
                  required: ["path"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "search_files",
                description: "Recursively search for files by name pattern.",
                parameters: {
                  type: "object",
                  properties: {
                    root: { type: "string" },
                    query: { type: "string" },
                  },
                  required: ["root", "query"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "read_file",
                description: "Read a text file. Use start_line/end_line to window large files and line_numbers=true when planning a patch.",
                parameters: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    start_line: { type: "number" },
                    end_line: { type: "number" },
                    line_numbers: { type: "boolean" },
                  },
                  required: ["path"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "write_file",
                description: "Write or overwrite a whole text file. Prefer apply_patch for edits to existing files.",
                parameters: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    content: { type: "string" },
                  },
                  required: ["path", "content"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "apply_patch",
                description: "Surgically edit a file with exact search/replace edits. Each edit must match exactly the expected number of times or NOTHING is written. Returns a unified diff and a backup path.",
                parameters: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                    create_if_missing: { type: "boolean" },
                    edits: {
                      type: "array",
                      description: "Ordered edits. 'find' must be verbatim text from the file including indentation, with enough context to be unique.",
                      items: {
                        type: "object",
                        properties: {
                          find: { type: "string" },
                          replace: { type: "string" },
                          expected_count: { type: "number", description: "How many matches to replace (default 1)" },
                        },
                        required: ["find", "replace"],
                      },
                    },
                  },
                  required: ["path", "edits"],
                },
              },
            },
            { type: "function", function: { name: "grep", description: "Search file CONTENTS across a project (regex by default). Use this to locate symbols, imports and error strings before editing.", parameters: { type: "object", properties: { root: { type: "string" }, pattern: { type: "string" }, glob: { type: "string", description: "Optional filename glob, e.g. *.tsx" }, regex: { type: "boolean" }, ignore_case: { type: "boolean" }, max_results: { type: "number" } }, required: ["root", "pattern"] } } },
            { type: "function", function: { name: "project_tree", description: "Show a project's folder structure (build/vendor folders skipped). Call this first when opening an unfamiliar codebase.", parameters: { type: "object", properties: { root: { type: "string" }, depth: { type: "number" }, max_entries: { type: "number" } }, required: ["root"] } } },
            { type: "function", function: { name: "run_command_bg", description: "Start a long-running process (dev server, watcher) in the background and get a job_id.", parameters: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" } }, required: ["command"] } } },
            { type: "function", function: { name: "command_status", description: "Poll a background job's output; set stop=true to terminate it.", parameters: { type: "object", properties: { job_id: { type: "string" }, stop: { type: "boolean" } }, required: ["job_id"] } } },
            { type: "function", function: { name: "list_backups", description: "List recent automatic backups NEXUS made before edits.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "restore_backup", description: "Undo an edit by restoring a backup path returned by apply_patch/write_file.", parameters: { type: "object", properties: { backup: { type: "string" } }, required: ["backup"] } } },
            { type: "function", function: { name: "git_status", description: "git status of a repo.", parameters: { type: "object", properties: { repo: { type: "string" } }, required: ["repo"] } } },
            { type: "function", function: { name: "git_diff", description: "git diff of a repo, optionally limited to paths.", parameters: { type: "object", properties: { repo: { type: "string" }, paths: { type: "array", items: { type: "string" } } }, required: ["repo"] } } },
            { type: "function", function: { name: "git_branch", description: "Show the current branch, or switch/create one.", parameters: { type: "object", properties: { repo: { type: "string" }, branch: { type: "string" }, create: { type: "boolean" } }, required: ["repo"] } } },
            { type: "function", function: { name: "git_commit", description: "Stage and commit changes with a message.", parameters: { type: "object", properties: { repo: { type: "string" }, message: { type: "string" }, paths: { type: "array", items: { type: "string" } } }, required: ["repo", "message"] } } },
            { type: "function", function: { name: "git_push", description: "Push commits to a remote (disabled unless the user enabled pushing).", parameters: { type: "object", properties: { repo: { type: "string" }, remote: { type: "string" }, branch: { type: "string" } }, required: ["repo"] } } },

            {
              type: "function",
              function: {
                name: "system_info",
                description: "Get OS, CPU, RAM, and disk info from the local machine.",
                parameters: { type: "object", properties: {} },
              },
            },
            { type: "function", function: { name: "desktop_read", description: "Inspect the active desktop screen. Returns screen size, mouse position, active window, UI controls, OCR phrases, AND a screenshot image you can SEE. Always call before desktop clicks. Look at the image to find anything UIA/OCR misses (game buttons, custom canvases).", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "desktop_screenshot", description: "Take a fresh screenshot of the screen — you receive it as a visible image. Use after an action to confirm the result.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "desktop_click", description: "Click in a desktop app by coordinates or by visible text from desktop_read. Prefer text for real controls; use x/y for visual/OCR targets.", parameters: { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, text: { type: "string" }, nth: { type: "number", description: "0-based match index when multiple controls/text items match" }, button: { type: "string", description: "left, right, or middle" }, clicks: { type: "number" } } } } },
            { type: "function", function: { name: "desktop_type", description: "Type or paste text into the focused desktop control. submit=true presses Enter after typing.", parameters: { type: "object", properties: { text: { type: "string" }, submit: { type: "boolean" } }, required: ["text"] } } },
            { type: "function", function: { name: "desktop_hotkey", description: "Press a desktop keyboard shortcut, e.g. ['ctrl','l'], ['alt','f4'], ['win','r'].", parameters: { type: "object", properties: { keys: { type: "array", items: { type: "string" } } }, required: ["keys"] } } },
            { type: "function", function: { name: "desktop_press", description: "Press one desktop key such as Enter, Tab, Escape, Space, ArrowDown.", parameters: { type: "object", properties: { key: { type: "string" } }, required: ["key"] } } },
            { type: "function", function: { name: "desktop_scroll", description: "Scroll the active desktop window; negative usually scrolls down, positive scrolls up.", parameters: { type: "object", properties: { amount: { type: "number" } } } } },
            { type: "function", function: { name: "esp_list_projects", description: "List every registered ESP/IoT project with its devices, commands, endpoints and parameter specs. Call before any device control so you never guess an endpoint.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "esp_get_project", description: "Get one registered ESP project definition (credentials redacted).", parameters: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] } } },
            { type: "function", function: { name: "esp_status", description: "Check whether a registered ESP project is reachable on the LAN.", parameters: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] } } },
            { type: "function", function: { name: "esp_delete_project", description: "Delete a registered ESP project.", parameters: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] } } },
            { type: "function", function: { name: "esp_register_project", description: "Register (or update) an ESP/IoT project from the user's natural-language description. Build the structured definition yourself; ask the user for missing critical details instead of guessing.", parameters: { type: "object", properties: { id: { type: "string", description: "optional slug; omit to derive from name" }, name: { type: "string" }, description: { type: "string" }, host: { type: "string", description: "IP address or hostname of the ESP" }, protocol: { type: "string", description: "http or https" }, port: { type: "number" }, timeout: { type: "number" }, auth: { type: "object", description: "optional { type: none|basic|bearer|header, username, password, token, header_name, header_value }" }, devices: { type: "array", description: "Devices/components. Each: { id, name, description, commands: [{ id, name, method, endpoint, parameters, body, headers, confirm }], sensors: [{ id, name, method, endpoint, unit }] }. Path params use {braces} in endpoint; JSON body templates use \"{param}\" placeholders.", items: { type: "object" } } }, required: ["name", "host", "devices"] } } },
            { type: "function", function: { name: "device_command", description: "Execute a registered command or read a registered sensor on an ESP project through the local agent. Only use project/device/command ids returned by esp_list_projects.", parameters: { type: "object", properties: { project_id: { type: "string" }, device_id: { type: "string" }, command_id: { type: "string" }, parameters: { type: "object", description: "Values for the command's registered parameters" } }, required: ["project_id", "device_id", "command_id"] } } },
            { type: "function", function: { name: "browser_open", description: "Launch the cowork Chrome window with the NEXUS red cursor overlay.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "browser_goto", description: "Navigate the cowork browser to a URL.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
            { type: "function", function: { name: "browser_read", description: "Read the current page: text + clickable controls with selectors. Call before clicking/typing.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "browser_click", description: "Click an element. Prefer 'selector' from browser_read.results[n].selector or controls[n].selector. Use 'text' + 'nth' (0-based) to pick the Nth match by visible text. For the 2nd/3rd search result, use results[1]/results[2] selector.", parameters: { type: "object", properties: { selector: { type: "string" }, text: { type: "string" }, nth: { type: "number", description: "0-based index when multiple elements match (default 0)" } } } } },
            { type: "function", function: { name: "browser_type", description: "Type into an input. submit=true presses Enter after.", parameters: { type: "object", properties: { selector: { type: "string" }, text: { type: "string" }, submit: { type: "boolean" } }, required: ["selector", "text"] } } },
            { type: "function", function: { name: "browser_press", description: "Press a single key (Enter, Tab, Escape, ArrowDown, etc.).", parameters: { type: "object", properties: { key: { type: "string" } }, required: ["key"] } } },
            { type: "function", function: { name: "browser_scroll", description: "Scroll the page by dy pixels (positive = down).", parameters: { type: "object", properties: { dy: { type: "number" } } } } },
            { type: "function", function: { name: "remember_fact", description: "Save a durable, useful long-term fact to permanent cross-chat memory (preferences, projects, devices, important facts, standing instructions). Never use for credentials or temporary/one-off details.", parameters: { type: "object", properties: { text: { type: "string", description: "The fact, written as a concise standalone statement" }, category: { type: "string", description: "preference | project | device | fact | instruction" } }, required: ["text"] } } },
            { type: "function", function: { name: "forget_fact", description: "Delete memories from permanent memory matching a description.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
            { type: "function", function: { name: "recall_memories", description: "List or search permanent memories, e.g. when asked what you remember.", parameters: { type: "object", properties: { query: { type: "string" } } } } },
            { type: "function", function: { name: "browser_close", description: "Close the cowork browser window.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "web_search", description: "Search the live internet natively (no local browser, works even when the local agent is offline). Returns titles, URLs and snippets.", parameters: { type: "object", properties: { query: { type: "string", description: "Search query" }, limit: { type: "number", description: "Number of results (1-15, default 6)" } }, required: ["query"] } } },
            { type: "function", function: { name: "web_fetch", description: "Fetch a URL natively and return its readable text content. Use after web_search to read a page.", parameters: { type: "object", properties: { url: { type: "string" }, max_chars: { type: "number", description: "Max characters of text to return (default 12000)" } }, required: ["url"] } } },
            
            // Android Tools
            { type: "function", function: { name: "device_status", description: "List connected Android devices.", parameters: { type: "object", properties: {} } } },
            {
              type: "function",
              function: {
                name: "device_info",
                description: "Retrieve specifications and states (model, battery, android version, screen resolution) for a connected Android device.",
                parameters: {
                  type: "object",
                  properties: {
                    serial: { type: "string", description: "Optional serial number of the device. Defaults to first connected device." }
                  }
                }
              }
            },
            {
              type: "function",
              function: {
                name: "launch_app",
                description: "Launch an Android app on the device by its package name (e.g. com.android.settings).",
                parameters: {
                  type: "object",
                  properties: {
                    package_name: { type: "string", description: "The Android app package name to launch" },
                    serial: { type: "string", description: "Optional serial number of the device." }
                  },
                  required: ["package_name"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "device_screenshot",
                description: "Take a screenshot of the connected Android device's screen and return it as base64 PNG data.",
                parameters: {
                  type: "object",
                  properties: {
                    serial: { type: "string", description: "Optional serial number of the device." }
                  }
                }
              }
            },
            {
              type: "function",
              function: {
                name: "device_tap",
                description: "Tap the screen of the connected Android device at coordinate (x, y).",
                parameters: {
                  type: "object",
                  properties: {
                    x: { type: "integer", description: "The x pixel coordinate to tap" },
                    y: { type: "integer", description: "The y pixel coordinate to tap" },
                    serial: { type: "string", description: "Optional serial number of the device." }
                  },
                  required: ["x", "y"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "device_type_text",
                description: "Type text on the connected Android device.",
                parameters: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "The text to type" },
                    serial: { type: "string", description: "Optional serial number of the device." }
                  },
                  required: ["text"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "device_keyevent",
                description: "Send a hardware keyevent to the connected Android device (e.g. 4 for BACK, 3 for HOME).",
                parameters: {
                  type: "object",
                  properties: {
                    keycode: { type: "integer", description: "The android keyevent keycode to send" },
                    serial: { type: "string", description: "Optional serial number of the device." }
                  },
                  required: ["keycode"]
                }
              }
            },
          ];

          // First gate: never even offer the model a tool the user's Security /
          // Computer / Devices / Memory / Coding settings forbid.
          const allowedTools = tools.filter(
            (t) => isToolAllowedBySettings(t.function.name, policySettings).allow,
          );




          const codingContext = coding?.enabled
            ? `\n\n## CODING WORKSPACE (authoritative)\n- Workspace root: ${
                coding.workspaceRoot || "(not set — ask the user for an absolute folder path before touching any code)"
              }\n- Active project: ${coding.activeProject || "(none)"}\n- Safety mode: ${
                coding.mode === "confirm"
                  ? "confirm-every-action (each write/command is approved by the user; keep steps small and explain them)"
                  : "autonomous inside the workspace (do not stop for routine approval)"
              }\n- Default command timeout: ${coding.commandTimeoutSec}s — pass timeout_sec on long builds/tests.\n- Git: ${
                coding.gitEnabled ? "enabled" : "disabled"
              }, pushing ${coding.allowPush ? "allowed" : "NOT allowed"}.\nAny path outside the workspace root is refused by the client. Never attempt it.`
            : "";

          const systemContent =
            (memories && memories.length
              ? `${SYSTEM_PROMPT}\n\n## MEMORY CONTEXT (permanent, all chats)\n${memories
                  .map((m) => `- ${m}`)
                  .join("\n")}`
              : SYSTEM_PROMPT) + codingContext;


          const { response, attempts } = await routeChat({
            messages: [{ role: "system", content: systemContent }, ...messages],
            tools: allowedTools,
            ...(ai ? { overrides: ai } : {}),
          });

          // Second gate: a model can still emit a call for a tool it was not
          // offered. Strip those server-side and tell it why.
          const blockedCalls: string[] = [];
          const allowedCalls = response.toolCalls.filter((c) => {
            const verdict = isToolAllowedBySettings(c.function.name, policySettings);
            if (verdict.allow) return true;
            blockedCalls.push(`${c.function.name}: ${verdict.reason}`);
            return false;
          });

          const assistantText = blockedCalls.length
            ? [response.text, `Blocked by NEXUS policy — ${blockedCalls.join(" | ")}`]
                .filter(Boolean)
                .join("\n\n")
            : response.text;

          // Same OpenAI-shaped payload the NEXUS frontend already consumes,
          // plus non-sensitive provider metadata.
          return new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: response.finishReason,
                  message: {
                    role: "assistant",
                    content: assistantText,
                    ...(allowedCalls.length ? { tool_calls: allowedCalls } : {}),
                  },
                },
              ],

              usage: response.usage,
              _nexus: {
                provider: response.provider,
                providerName: response.providerName,
                model: response.model,
                modelLabel: response.modelLabel,
                latencyMs: response.latencyMs,
                fallbacks: attempts.length,
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          );

        } catch (e) {
          console.error(e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
