# NEXUS Local Helper Agent

This is the local Python program that gives NEXUS hands on your computer.
The web UI talks to this agent (running on `127.0.0.1:7337`) every time it
needs to actually do something — run a command, open a file, search your
disk, install software, etc.

## Setup

```bash
python -m pip install fastapi uvicorn psutil selenium pyautogui pillow pyperclip pywinauto pytesseract
python nexus_agent.py
```

Leave the terminal window open. In the NEXUS web app, the **LOCAL AGENT**
status indicator should turn cyan within ~5 seconds.

### ⚠️ Restart the agent after every project update

The agent is a plain Python process: it loads `nexus_agent.py`,
`android_manager.py` and `esp_manager.py` **once, at startup**. If you pull new
project files while it is running, the old code keeps serving requests and any
newly added tool answers `404 Not Found` (this is exactly what caused
`POST /tool/device_status 404` and `POST /tool/device_keyevent 404`).

After pulling:

1. `Ctrl+C` in the agent terminal.
2. Make sure `nexus_agent.py`, `android_manager.py` and `esp_manager.py` are all
   in the same folder.
3. `python nexus_agent.py`
4. Check `http://127.0.0.1:7337/health` — it reports `agent_version` and the full
   list of registered tools.

NEXUS now detects this automatically: a 404 from any tool is reported as
"stale local agent — restart it", including the version actually running.


## What it can do

| Tool | What happens |
|---|---|
| `run_command` | Runs any shell command (master tool — installs, scripts, anything) |
| `open_path` | Opens a file/folder/app in its default handler |
| `open_url` | Opens a URL in your default browser |
| `list_dir` | Lists files in a directory |
| `search_files` | Recursively searches files by name |
| `read_file` | Reads a text file |
| `write_file` | Writes/overwrites a text file |
| `system_info` | Returns OS/CPU/RAM/disk info |
| `browser_*` | **Cowork mode** — NEXUS drives your installed Chrome with Selenium and a glowing red cursor overlay; you use the same window with your normal cursor |
| `desktop_*` | **Desktop cowork mode** — NEXUS inspects the active desktop app and uses mouse/keyboard control for launchers, installers, settings windows, etc. |
| `device_*` / `launch_app` | **Android control over ADB** (see below) |
| `android_capabilities` | Diagnostics: agent version, adb path, connected devices, Android tool list |
| `phone_*` | **NEXUS Android Agent** — the on-device app over Tailscale, no ADB and no USB (see below) |

## Android control (ADB, Windows-friendly)

`android_manager.py` must sit next to `nexus_agent.py`. Install Android Platform
Tools and make sure `adb` is on `PATH` (the agent also auto-detects
`C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`,
`C:\Android\sdk\platform-tools\adb.exe` and
`%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`).

| Tool | Body | What happens |
|---|---|---|
| `android_capabilities` | `{}` | Agent version, adb path/errors, devices, exposed tools |
| `device_status` | `{}` | Lists connected devices (USB **or** TCP/IP) |
| `device_connect` | `{"host":"192.168.1.50","port":5555}` | `adb connect` — pairs wirelessly |
| `device_disconnect` | `{"host":"192.168.1.50"}` (host optional) | `adb disconnect` |
| `device_info` | `{"serial":null}` | Model, manufacturer, Android version, resolution, battery |
| `launch_app` | `{"package_name":"com.android.settings"}` | Launches an app |
| `device_screenshot` | `{}` | Base64 PNG of the screen |
| `device_tap` | `{"x":100,"y":200}` | Tap |
| `device_type_text` | `{"text":"hello"}` | Types text |
| `device_keyevent` | `{"keycode":4}` | Key event (3 HOME, 4 BACK, 26 POWER, 66 ENTER) |

`serial` is optional everywhere — the first connected device is used.

### Wireless setup (no USB needed after pairing)

```bash
# once, with the cable attached (or via Wireless debugging pairing on Android 11+)
adb tcpip 5555
# then unplug and connect over Wi-Fi
adb connect 192.168.1.50:5555
```

From then on every `device_*` tool works cable-free; NEXUS can also run the
connect step itself via `device_connect`.

### Verify from the terminal

```bash
curl http://127.0.0.1:7337/health
curl -X POST http://127.0.0.1:7337/tool/android_capabilities
curl -X POST http://127.0.0.1:7337/tool/device_status -H "Content-Type: application/json" -d "{}"
curl -X POST http://127.0.0.1:7337/tool/device_keyevent -H "Content-Type: application/json" -d "{\"keycode\":3}"
```

Add `-H "X-Nexus-Token: <your token>"` if you set `NEXUS_AGENT_TOKEN`.
A `400` with an adb message means the routes are fine and adb/device needs
attention; a `404` means the running process is stale — restart it.

## NEXUS Android Agent (on-device app, over Tailscale)

This is separate from the ADB tools above: it talks to the **NEXUS Android Agent**
app (`dev.nexus.androidagent`, source in `android-agent/`) running on the phone.
No cable, no ADB, no relay.

```
NEXUS AI  ──▶  NEXUS PC Agent (100.104.193.77:7337)  ──Tailscale──▶  NEXUS Android Agent app
```

Phones have no stable listening socket, so the phone dials **out**: it registers,
holds a long-poll open for work, runs the requested capability locally and posts a
structured JSON result back.

| Endpoint | Caller | Purpose |
|---|---|---|
| `POST /agent/hello` | phone | register (`agent_kind: "android"`, model, capabilities) |
| `POST /agent/poll` | phone | long-poll (up to 30s) for queued commands |
| `POST /agent/result` | phone | structured success/error per command |

| Tool | Body | What happens |
|---|---|---|
| `phone_agent_status` | `{}` | Connected phones, models, capabilities, queue depth |
| `phone_ping` | `{}` | Liveness round-trip to the phone |
| `phone_info` | `{}` | Model / manufacturer / Android release / SDK / ABIs |
| `phone_agent_command` | `{"command":"ping","args":{"echo":"hi"},"timeout_sec":30}` | Runs one capability on the phone |

`phone_agent_command` only reaches the app's explicit capability allow-list —
there is no shell on the phone. Unknown commands come back as
`unsupported_command` (HTTP 400). No phone connected → HTTP 503; phone silent →
HTTP 504.

### Make the agent reachable over Tailscale

The agent binds to `127.0.0.1` by default, which the phone cannot reach. Bind it
to your tailnet address and set a token:

```bash
# Windows (PowerShell)
$env:NEXUS_AGENT_HOST="100.104.193.77"; $env:NEXUS_AGENT_TOKEN="some-long-random-string"; python nexus_agent.py

# macOS / Linux
NEXUS_AGENT_HOST=100.104.193.77 NEXUS_AGENT_TOKEN="some-long-random-string" python nexus_agent.py
```

`NEXUS_AGENT_PORT` overrides the port (default `7337`). In the phone app, set the
host to `100.104.193.77:7337`, paste the same token, Save, then Start — the PC
console prints `android agent registered: ...`.

The `/agent/*` routes are **not** public: with `NEXUS_AGENT_TOKEN` set they require
`X-Nexus-Token` (the app also sends `Authorization: Bearer`, which is accepted).
Always set a token once the agent listens on the tailnet.

### Verify from the terminal

```bash
curl -X POST http://127.0.0.1:7337/tool/phone_agent_status -H "X-Nexus-Token: $NEXUS_AGENT_TOKEN"
curl -X POST http://127.0.0.1:7337/tool/phone_ping -H "X-Nexus-Token: $NEXUS_AGENT_TOKEN"
```


**Desktop OCR (REQUIRED for game launchers, custom canvases, Java apps like TLauncher).** Windows UI Automation cannot see custom-drawn buttons, so NEXUS falls back to OCR. Install the Tesseract OCR desktop app:
- **Windows:** https://github.com/UB-Mannheim/tesseract/wiki — install to the default path, then restart the agent. NEXUS auto-locates `tesseract.exe` in `C:\Program Files\Tesseract-OCR\`.
- **macOS:** `brew install tesseract`
- **Linux:** `sudo apt install tesseract-ocr`

Without Tesseract, NEXUS can't read buttons like "Enter the Game" in TLauncher.

## ⚠️ Security

This agent runs **arbitrary shell commands** the web UI tells it to. Treat
it like a remote-code-execution endpoint — because that's what it is.

- It binds to `127.0.0.1` unless you set `NEXUS_AGENT_HOST`
- If you bind it to a tailnet address for the Android Agent, **set
  `NEXUS_AGENT_TOKEN`** — anything on your tailnet can otherwise reach it
- Only run it while you're actively using NEXUS
- Don't expose port 7337 to the internet
- You'll be asked to confirm destructive actions in chat, but ultimately
  you control what NEXUS executes

### Access token (recommended)

Any program on your machine can reach `127.0.0.1:7337`. Lock the agent to
NEXUS with a shared secret:

```bash
# Windows (PowerShell)
$env:NEXUS_AGENT_TOKEN="some-long-random-string"; python nexus_agent.py

# macOS / Linux
NEXUS_AGENT_TOKEN="some-long-random-string" python nexus_agent.py
```

Then paste the same value into **NEXUS → Settings → Computer → Agent access
token**. Every `/tool/*` request must now carry the matching `X-Nexus-Token`
header; `/health` stays open so the status indicator keeps working. If the
variable is unset, the agent behaves as before and accepts any local caller.


## Examples to try

> "What OS am I on?"
> "Open my Downloads folder"
> "Search my home folder for files containing 'invoice'"
> "Install ripgrep using my system package manager"
> "Open github.com in my browser"
> "Create a new folder ~/nexus-test and write a hello.txt inside it"

## ESP / IoT projects (generic)

`esp_manager.py` must sit next to `nexus_agent.py`. Registered projects are saved to
`esp_projects.json` in the same folder, so they survive restarts and never leave your machine.

Register a project either in the web UI ("ESP / DEVICES") or just by telling NEXUS:

> "I made a project called Smart Aquarium at 192.168.1.42. POST /pump/on turns the pump on,
> POST /pump/off turns it off, and POST /led/{brightness} sets the LED from 0-100."

Then: "Turn the aquarium pump on." — the agent performs the HTTP request on your LAN.
No NEXUS code changes are ever needed for a new project.
