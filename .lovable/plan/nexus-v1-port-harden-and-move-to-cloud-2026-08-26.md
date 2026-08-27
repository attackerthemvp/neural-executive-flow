# NEXUS_v1: Port, Harden, and Move to Cloud

Three phases, run in order. Each one leaves the app working.

## Phase 1 — Port the web app

Bring the extracted app into this project so it runs in preview.

- Copy the application source: `src/components`, `src/hooks`, `src/lib`, `src/routes`, `src/styles.css`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, plus `public/` assets. Existing template files at those paths are replaced.
- Skip entirely: `node_modules`, `__pycache__`, `bun.lock`/`package-lock.json` from the archive, `.env`, `routeTree.gen.ts` (regenerated), and any `.git` metadata.
- Merge the archive's dependencies into this project's `package.json` and install: `react-markdown`, `recharts`, `embla-carousel-react`, `vaul`, `cmdk`, `input-otp`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, and the Radix packages the UI components import. Keep this project's existing TanStack/Vite/Tailwind versions rather than downgrading to the archive's.
- Register the four AI provider keys as backend secrets (`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `GEMINI_API_KEY`) so nothing lives in a committed `.env`. You'll paste fresh values into a secure prompt — see the note below.
- Keep the Python agent out of the repo. It cannot run on Lovable's serverless backend (no `child_process`, no desktop access) and must stay on your PC at `127.0.0.1:7337`. `jarvis_agent/` is copied in as reference-only source with its README, not wired into the build.
- Verify: preview loads `/`, `/chat/$chatId` and `/devices`; `/api/ai-status` responds; the local-agent indicator correctly shows offline.

**Before Phase 1 runs:** the keys in the archived `.env` should be considered compromised and rotated at each provider. I'll use the new values, not the old ones.

## Phase 2 — Fix what the review found

- **Server-side tool enforcement.** `tool-policy.ts` currently runs only in the browser, so a bypassed UI can still reach `run_command`. Move authoritative policy checks into the server chat route so blocked categories are rejected before a tool call is ever emitted, and keep the client copy purely for instant UI feedback.
- **Local agent authentication.** Add a shared token, generated in Settings and sent on every call to `127.0.0.1:7337`, so a random page on your machine can't drive the agent. Requires a matching change in the Python agent, which I'll provide as a patch for you to apply on your PC.
- **Split the two oversized components.** `SettingsPanel.tsx` (993 lines) breaks into one file per settings section; `JarvisChat.tsx` (702 lines) separates the message list, composer, and run-status header from the orchestration.
- **Housekeeping.** Rewrite `README.md` for NEXUS (the current one is titled JARVISv2 and contains a stray note about a GitHub repo), keep a single lockfile, and extend `.gitignore` to cover `node_modules`, `__pycache__`, and `.env`.
- Verify: existing tests (`agent-runner.test.ts`, `tool-policy.test.ts`) still pass, plus new tests for server-side policy rejection and token checks.

## Phase 3 — Move storage to Lovable Cloud

Replace localStorage with a real backend so chats, memory, and settings survive and sync.

- Enable Lovable Cloud (database, auth, and secrets, no external account needed).
- Add email/password sign-in with a `/auth` route, and put the app behind it so every row is owned by a user.
- Tables, each with row-level security scoped to the owner so no user can read another's data:
  - `profiles` — display name, linked to the account
  - `chats` — title, timestamps, owner
  - `messages` — chat reference, role, content, tool-call records, ordering
  - `memories` — text, category, tags, timestamps, owner
  - `user_settings` — one row per user holding the settings object
  - `esp_projects` — registered device projects, hosts, and command schemas
- Rewrite `chat-store.ts`, `memory-store.ts`, `settings-store.ts`, and `esp-projects.ts` to read and write through the database while keeping their current function signatures, so the UI barely changes.
- One-time migration on first sign-in: existing localStorage chats, memories, and settings are imported into your account, then the local copies are cleared.
- Verify: sign up, create a chat, save a memory, change a setting, hard-refresh in a different browser and confirm everything is still there.

## Technical notes

- Stack matches exactly (TanStack Start v1, React 19, Vite, Tailwind v4, shadcn/ui), so no framework conversion is needed.
- Server routes stay under `src/routes/api/`. Provider keys are read inside handlers only, never at module scope, so they never reach the browser bundle.
- The web app and the local Python agent stay decoupled: the browser talks to `127.0.0.1:7337` directly, which is why the agent keeps working even though it can't be hosted here.
- ESP/IoT control also happens over your LAN from the local agent, so it's unaffected by the move to Cloud apart from where the project definitions are stored.

## Scope boundary

Nothing in the assistant's behaviour, persona, or agent-loop logic changes. This is a port, a security and structure cleanup, and a storage swap.
