// Single source of truth for Android app aliases → package names and for the
// NEXUS Android Agent capability semantics NEXUS relies on. Do not duplicate
// this table elsewhere — import from here (server prompt, client normaliser,
// lookup tool, tests).
//
// Package lists are ORDERED candidates: the first installed one wins. When an
// app has OEM / Google / AOSP variants they are all listed so the resolver can
// pick the one actually present on the phone (verified with list_apps) instead
// of guessing.

type AppEntry = { names: string[]; packages: string[] };

const APPS: AppEntry[] = [
  // --- System / OEM (Samsung first, then Google, then AOSP) ---
  // On this Samsung device the dialer lives inside the contacts package
  // (verified on-device); keep it first so NEXUS never guesses *.dialer.
  { names: ["phone", "dialer", "phone app", "call app", "samsung phone", "google phone", "google dialer"],
    packages: ["com.samsung.android.contacts", "com.samsung.android.dialer", "com.google.android.dialer", "com.android.dialer"] },
  { names: ["contacts", "samsung contacts", "google contacts", "people"],
    packages: ["com.samsung.android.contacts", "com.google.android.contacts", "com.android.contacts"] },
  { names: ["gallery", "samsung gallery", "photos app"], packages: ["com.sec.android.gallery3d"] },
  { names: ["camera", "samsung camera", "google camera"], packages: ["com.sec.android.app.camera", "com.google.android.GoogleCamera", "com.android.camera2"] },
  { names: ["calculator", "calc"], packages: ["com.sec.android.app.popupcalculator", "com.google.android.calculator", "com.android.calculator2"] },
  { names: ["clock", "alarm", "alarms", "timer", "stopwatch"], packages: ["com.sec.android.app.clockpackage", "com.google.android.deskclock", "com.android.deskclock"] },
  { names: ["calendar", "samsung calendar", "google calendar"], packages: ["com.samsung.android.calendar", "com.google.android.calendar"] },
  { names: ["my files", "myfiles", "file manager", "files", "files by google", "google files"],
    packages: ["com.sec.android.app.myfiles", "com.google.android.apps.nbu.files"] },
  { names: ["samsung internet", "internet", "samsung browser", "sbrowser"], packages: ["com.sec.android.app.sbrowser"] },
  { names: ["messages", "samsung messages", "sms", "texts", "text messages", "google messages", "messaging"],
    packages: ["com.samsung.android.messaging", "com.google.android.apps.messaging"] },
  { names: ["settings", "samsung settings", "android settings", "system settings", "android system settings"], packages: ["com.android.settings"] },
  { names: ["downloads", "download manager"], packages: ["com.android.documentsui", "com.android.providers.downloads.ui", "com.sec.android.app.myfiles"] },
  { names: ["system ui", "systemui", "android system ui"], packages: ["com.android.systemui"] },
  { names: ["webview", "android system webview", "android webview"], packages: ["com.google.android.webview"] },
  { names: ["google play services", "play services", "gms"], packages: ["com.google.android.gms"] },
  { names: ["google", "google app", "google search", "search"], packages: ["com.google.android.googlequicksearchbox"] },
  { names: ["nexus android agent", "nexus agent", "android agent", "nexus app"], packages: ["dev.nexus.androidagent"] },

  // --- Google ---
  { names: ["janitor ai", "janitor", "janitorai"], packages: ["com.janitor.ai"] },
  { names: ["youtube", "yt"], packages: ["com.google.android.youtube"] },
  { names: ["youtube music", "yt music", "ytm"], packages: ["com.google.android.apps.youtube.music"] },
  { names: ["youtube studio", "yt studio"], packages: ["com.google.android.apps.youtube.creator"] },
  { names: ["chrome", "google chrome", "the browser", "browser", "web browser"], packages: ["com.android.chrome", "com.sec.android.app.sbrowser"] },
  { names: ["play store", "playstore", "google play", "play", "app store"], packages: ["com.android.vending"] },
  { names: ["google photos", "gphotos"], packages: ["com.google.android.apps.photos"] },
  { names: ["google maps", "maps", "gmaps", "navigation"], packages: ["com.google.android.apps.maps"] },
  { names: ["gmail", "google mail", "mail", "email"], packages: ["com.google.android.gm"] },
  { names: ["google drive", "drive", "gdrive"], packages: ["com.google.android.apps.docs"] },
  { names: ["google keep", "keep", "keep notes", "notes"], packages: ["com.google.android.keep", "com.samsung.android.app.notes"] },
  { names: ["google docs", "docs"], packages: ["com.google.android.apps.docs.editors.docs"] },
  { names: ["google sheets", "sheets"], packages: ["com.google.android.apps.docs.editors.sheets"] },
  { names: ["google slides", "slides"], packages: ["com.google.android.apps.docs.editors.slides"] },
  { names: ["gemini", "google gemini", "bard"], packages: ["com.google.android.apps.bard"] },
  { names: ["google wallet", "wallet", "gpay", "google pay"], packages: ["com.google.android.apps.walletnfcrel"] },
  { names: ["google authenticator", "authenticator"], packages: ["com.google.android.apps.authenticator2"] },

  // --- AI ---
  { names: ["chatgpt", "chat gpt", "openai", "gpt"], packages: ["com.openai.chatgpt"] },
  { names: ["copilot", "microsoft copilot", "ms copilot"], packages: ["com.microsoft.copilot"] },
  { names: ["perplexity"], packages: ["ai.perplexity.app.android"] },
  { names: ["claude", "anthropic"], packages: ["com.anthropic.claude"] },

  // --- Messaging / social ---
  { names: ["whatsapp", "whats app", "wa"], packages: ["com.whatsapp"] },
  { names: ["whatsapp business", "wa business", "whatsapp biz"], packages: ["com.whatsapp.w4b"] },
  { names: ["facebook", "fb"], packages: ["com.facebook.katana"] },
  { names: ["messenger", "facebook messenger", "fb messenger", "dm", "dms"], packages: ["com.facebook.orca"] },
  { names: ["instagram", "insta", "ig"], packages: ["com.instagram.android"] },
  { names: ["threads"], packages: ["com.instagram.barcelona"] },
  { names: ["tiktok", "tik tok"], packages: ["com.zhiliaoapp.musically"] },
  { names: ["snapchat", "snap"], packages: ["com.snapchat.android"] },
  { names: ["x", "twitter", "x twitter"], packages: ["com.twitter.android"] },
  { names: ["reddit"], packages: ["com.reddit.frontpage"] },
  { names: ["discord"], packages: ["com.discord"] },
  { names: ["telegram", "tg"], packages: ["org.telegram.messenger"] },
  { names: ["signal"], packages: ["org.thoughtcrime.securesms"] },
  { names: ["skype"], packages: ["com.skype.raider"] },
  { names: ["zoom"], packages: ["us.zoom.videomeetings"] },
  { names: ["teams", "microsoft teams", "ms teams"], packages: ["com.microsoft.teams"] },
  { names: ["slack"], packages: ["com.Slack"] },
  { names: ["linkedin"], packages: ["com.linkedin.android"] },

  // --- Media ---
  { names: ["spotify"], packages: ["com.spotify.music"] },
  { names: ["amazon music"], packages: ["com.amazon.mp3"] },
  { names: ["netflix"], packages: ["com.netflix.mediaclient"] },
  { names: ["disney plus", "disney+", "disney"], packages: ["com.disney.disneyplus"] },
  { names: ["prime video", "amazon prime video", "prime"], packages: ["com.amazon.avod.thirdpartyclient"] },
  { names: ["hulu"], packages: ["com.hulu.livingroomplus"] },
  { names: ["twitch"], packages: ["tv.twitch.android.app"] },
  { names: ["vlc", "vlc player"], packages: ["org.videolan.vlc"] },
  { names: ["mx player", "mxplayer"], packages: ["com.mxtech.videoplayer.ad"] },
  { names: ["kindle", "amazon kindle"], packages: ["com.amazon.kindle"] },
  { names: ["audible"], packages: ["com.audible.application"] },
  { names: ["audiorelay", "audio relay"], packages: ["com.azefsw.audioconnect"] },
  { names: ["wo mic", "womic"], packages: ["com.wo.voice2"] },

  // --- Transport / food / shopping / money ---
  { names: ["uber"], packages: ["com.ubercab"] },
  { names: ["lyft"], packages: ["me.lyft.android"] },
  { names: ["doordash", "door dash"], packages: ["com.dd.doordash"] },
  { names: ["grubhub"], packages: ["com.grubhub.android"] },
  { names: ["instacart"], packages: ["com.instacart.client"] },
  { names: ["paypal"], packages: ["com.paypal.android.p2pmobile"] },
  { names: ["venmo"], packages: ["com.venmo"] },
  { names: ["cash app", "cashapp"], packages: ["com.squareup.cash"] },
  { names: ["ebay"], packages: ["com.ebay.mobile"] },
  { names: ["amazon", "amazon shopping"], packages: ["com.amazon.mShop.android.shopping"] },
  { names: ["walmart"], packages: ["com.walmart.android"] },
  { names: ["target"], packages: ["com.target.ui"] },
  { names: ["honeygain"], packages: ["com.honeygain.make.money"] },

  // --- Productivity ---
  { names: ["outlook", "microsoft outlook"], packages: ["com.microsoft.office.outlook"] },
  { names: ["onedrive", "microsoft onedrive"], packages: ["com.microsoft.skydrive"] },
  { names: ["word", "microsoft word", "ms word"], packages: ["com.microsoft.office.word"] },
  { names: ["excel", "microsoft excel", "ms excel"], packages: ["com.microsoft.office.excel"] },
  { names: ["powerpoint", "microsoft powerpoint", "ppt"], packages: ["com.microsoft.office.powerpoint"] },
  { names: ["onenote", "microsoft onenote"], packages: ["com.microsoft.office.onenote"] },
  { names: ["dropbox"], packages: ["com.dropbox.android"] },
  { names: ["notion"], packages: ["notion.id"] },
  { names: ["evernote"], packages: ["com.evernote"] },
  { names: ["todoist"], packages: ["com.todoist"] },
  { names: ["trello"], packages: ["com.trello"] },
  { names: ["asana"], packages: ["com.asana.app"] },
  { names: ["github"], packages: ["com.github.android"] },
  { names: ["gitlab"], packages: ["com.gitlab.android"] },
  { names: ["termux"], packages: ["com.termux"] },
  { names: ["f-droid", "fdroid"], packages: ["org.fdroid.fdroid"] },
  { names: ["tailscale"], packages: ["com.tailscale.ipn"] },

  // --- Browsers / security ---
  { names: ["firefox", "mozilla firefox"], packages: ["org.mozilla.firefox"] },
  { names: ["brave", "brave browser"], packages: ["com.brave.browser"] },
  { names: ["edge", "microsoft edge"], packages: ["com.microsoft.emmx"] },
  { names: ["opera", "opera browser"], packages: ["com.opera.browser"] },
  { names: ["duckduckgo", "duck duck go", "ddg"], packages: ["com.duckduckgo.mobile.android"] },
  { names: ["1password", "one password"], packages: ["com.onepassword.android"] },
  { names: ["bitwarden"], packages: ["com.x8bit.bitwarden"] },
  { names: ["authy"], packages: ["com.authy.authy"] },
];

/** Lower-case, strip punctuation, collapse spaces, drop filler words. */
export function normalizeAppName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[+]/g, " plus ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|app|application|my|please|on my phone)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PACKAGE_RX = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;

/** True when the string already looks like an Android package id. */
export function looksLikePackage(value: string): boolean {
  return PACKAGE_RX.test(value.trim());
}

export type AppResolution = {
  query: string;
  /** Ordered candidate packages (first = preferred). Empty when unknown. */
  candidates: string[];
  /** Candidates that appear in `installed`, when an installed list was given. */
  installed?: string[] | undefined;
  /** The package to use, or null when it cannot be decided safely. */
  resolved: string | null;
  exact: boolean;
};

/**
 * Resolve a spoken app name to package candidates. When `installedPackages`
 * is supplied (from the phone's list_apps capability) only installed
 * candidates are returned as `resolved`, so NEXUS never opens a guess.
 */
export function resolveAndroidApp(query: string, installedPackages?: string[]): AppResolution {
  const raw = query.trim();
  if (looksLikePackage(raw)) {
    const inst = installedPackages ? installedPackages.filter((p) => p === raw) : undefined;
    return { query: raw, candidates: [raw], installed: inst, resolved: inst && !inst.length ? null : raw, exact: true };
  }
  const q = normalizeAppName(raw);
  let entry = APPS.find((a) => a.names.some((n) => normalizeAppName(n) === q));
  let exact = !!entry;
  if (!entry && q) {
    // Loose match: alias contained in query or query contained in alias ("open up whatsapp now").
    const scored = APPS.map((a) => ({
      a,
      score: Math.max(
        ...a.names.map((n) => {
          const nn = normalizeAppName(n);
          if (nn.length < 2) return 0;
          if (q.includes(nn)) return nn.length;
          if (nn.includes(q) && q.length >= 3) return q.length / 2;
          return 0;
        }),
      ),
    })).filter((s) => s.score > 0);
    scored.sort((x, y) => y.score - x.score);
    entry = scored[0]?.a;
    exact = false;
  }
  const candidates = entry ? [...entry.packages] : [];
  if (!installedPackages) {
    return { query: raw, candidates, resolved: candidates.length === 1 || exact ? candidates[0] ?? null : null, exact };
  }
  const set = new Set(installedPackages.map((p) => p.toLowerCase()));
  const installed = candidates.filter((p) => set.has(p.toLowerCase()));
  return { query: raw, candidates, installed, resolved: installed[0] ?? null, exact };
}

/** Every known package, useful for tests and for the lookup tool. */
export function allKnownPackages(): string[] {
  return [...new Set(APPS.flatMap((a) => a.packages))];
}

// ---------------------------------------------------------------------------
// NEXUS Android Agent capability semantics
// ---------------------------------------------------------------------------

/**
 * Argument schema confirmed from the Android Agent implementation. Only entries
 * listed here are treated as verified; anything else must come from the
 * phone's own capability list / error detail, never guessed.
 */
export const ANDROID_VERIFIED_ARGS: Record<string, Record<string, string>> = {
  open_app: { package: "Android package id, e.g. com.whatsapp (NOT package_name)" },
  home: {},
  back: {},
  ping: { echo: "optional string echoed back" },
  device_info: {},
};

/** Legacy / wrong argument keys the model tends to emit for open_app. */
const OPEN_APP_ALIAS_KEYS = ["package_name", "packageName", "app", "app_name", "name"];

/**
 * Capabilities that only observe state or move to a stable screen. Repeating
 * them is harmless, so the loop guard must not treat repeats as a bug.
 */
export const ANDROID_REPEAT_SAFE_COMMANDS = new Set([
  "ping",
  "device_info",
  "battery",
  "home",
  "back",
  "foreground_app",
  "list_apps",
  "screen_read",
  "find_element",
  "wait_for_app",
  "wait_for_element",
  "wait_for_text",
  "recents",
  "recent_apps",
]);

/**
 * Fix the argument shape of a phone_agent_command call using the verified
 * schema. Returns the (possibly) corrected args plus a human note describing
 * what changed so the model learns the real schema.
 */
export function normalizePhoneCommandArgs(
  command: string,
  args: Record<string, unknown> | undefined,
): { args: Record<string, unknown>; note?: string | undefined } {
  const a: Record<string, unknown> = { ...(args ?? {}) };
  if (command !== "open_app") return { args: a };

  let note: string | undefined;
  if (typeof a["package"] !== "string" || !(a["package"] as string).trim()) {
    for (const key of OPEN_APP_ALIAS_KEYS) {
      const v = a[key];
      if (typeof v === "string" && v.trim()) {
        a["package"] = v.trim();
        delete a[key];
        note = `open_app takes {package}; "${key}" was renamed to "package".`;
        break;
      }
    }
  }
  const pkg = a["package"];
  if (typeof pkg === "string" && !looksLikePackage(pkg)) {
    const r = resolveAndroidApp(pkg);
    if (r.resolved) {
      a["package"] = r.resolved;
      note = `${note ? note + " " : ""}"${pkg}" resolved to ${r.resolved}${
        r.candidates.length > 1 ? ` (other variants: ${r.candidates.slice(1).join(", ")} — confirm with list_apps)` : ""
      }.`;
    }
  }
  return { args: a, note };
}

/** Prompt fragment shared with the server so the rules live in one place. */
export const ANDROID_INTENT_RULES = `ANDROID CAPABILITY ARGUMENTS (verified — use exactly):
- open_app → args {"package": "<package id>"}  (NOT package_name). Example: {"command":"open_app","args":{"package":"com.whatsapp"}}
- home → {} · back → {} · ping → {"echo"?: string} · device_info → {}
- For every other capability (close_app, foreground_app, list_apps, screen_read, find_element, click_element, set_element_text, scroll, wait_for_app, wait_for_element, wait_for_text, …): use only names that appear in phone_agent_status().agents[].capabilities. If a call returns 400 with a missing/invalid-argument detail, read the detail and correct the argument NAME — never retry the same guess.

APP NAME → PACKAGE (act, do not interview the user):
- Call android_app_lookup(name) to turn a spoken app name ("YT", "IG", "the browser", "Play Store") into candidate package ids. It is the ONLY mapping; do not recall package names from memory when the lookup knows the app.
- When the lookup returns a "resolved" package, USE IT IMMEDIATELY. Do not ask the user to choose between candidates, and do not ask which app they meant — the extra candidates are OEM variants, not a real ambiguity. Only the first attempt failing (open_app error, or foreground_app showing a different app) justifies trying the next candidate.
- NEVER invent, guess or improvise a package id, and never use a placeholder like com.example.*. If the lookup knows nothing and list_apps does not show the app, ask the user for the package id — that is a genuine blocker.
- list_apps on this device is INCOMPLETE: it omits many system and preinstalled apps (YouTube, for example). An app missing from list_apps is NOT proof it is absent. If a lookup-resolved package exists, just try open_app and judge by the result; never tell the user an app is not installed based only on list_apps.

INTENT SEMANTICS (these are different Android operations — never conflate them):
- "open / launch / start X" → open_app.
- "open recent apps / recents / app switcher / multitasking" → the recents capability (check phone_agent_status().agents[].capabilities for its exact name, e.g. recents). That shows the Recents UI; it is not open_app.
- "switch to X (it's in the background) / go back to X from recents" → open Recents, then locate X's card with screen_read / find_element and click_element to activate the existing task. Say "switched to X", not "launched X". If the recents card cannot be found, say so and only then offer open_app as a normal launch — and label it as a relaunch, not a switch.
- "go home / home screen / return home" → home. "go back / back" → back.
- "close / exit / leave X" (normal wording) → home (move it out of the foreground). Say "moved to the background", never "terminated", "killed" or "force-stopped".
- Actual termination (force-stop / kill / terminate) ONLY when the user explicitly asks for it AND a matching capability (e.g. close_app) is in the phone's list. Otherwise explain that the app was only backgrounded.

VERIFICATION — five distinct states, keep them apart:
1. action attempted · 2. Android Agent reported success · 3. state independently verified (foreground_app / wait_for_app agrees) · 4. verification data unavailable or inconclusive · 5. action failed (agent reported an error).
- After open_app or a recents switch, verify once with wait_for_app or foreground_app when the phone advertises them.
- foreground_app on this device sometimes returns null/empty package or class. That is state 4, NOT state 5. Inconclusive verification must NEVER cause you to repeat the action, restart the workflow, or wait for a new instruction. Retry the check at most once, then finish the task and report honestly: "the agent reported the launch succeeded; foreground_app returned no package, so I could not independently confirm it".
- Only claim "X is on screen / verified" when a check actually returned X. Only say the action failed when a tool reported an error.

COMPLETION:
- Simple Android commands are one-shot tasks: resolve → act → verify once → finish_task in the SAME run. Do not narrate what you are about to do and stop; do not wait for a "continue".
- Once the requested Android operation has been performed (or definitively failed), call finish_task with the outcome. Do not keep reasoning, re-checking or re-listing apps afterwards.
- request_user_input is ONLY for a genuine blocker: no phone online, a truly unknown app with no resolvable package, or an explicitly destructive action needing approval. Choosing between known package variants is not a blocker.
- Repeating home / recents / status / foreground_app / wait_for_* checks is fine; repeating an action that already failed the same way is not — change approach or report the blocker.`;
