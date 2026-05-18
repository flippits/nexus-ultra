<div align="center">

```
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗    ██╗   ██╗██╗  ████████╗██████╗  █████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝    ██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗    ██║   ██║██║     ██║   ██████╔╝███████║
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║    ██║   ██║██║     ██║   ██╔══██╗██╔══██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║    ╚██████╔╝███████╗██║   ██║  ██║██║  ██║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
```

**AI-powered cybersecurity platform — 12 elite agents, free cloud AI, Kali Linux Docker, full OSINT**

[![Release](https://img.shields.io/github/v/release/flippits/nexus-ultra?style=flat-square&color=00f5ff)](https://github.com/flippits/nexus-ultra/releases)
[![License](https://img.shields.io/badge/license-MIT-00f5ff?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-00f5ff?style=flat-square)]()
[![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Claude-00f5ff?style=flat-square)]()
[![MCP](https://img.shields.io/badge/MCP-Claude%20Code%20integration-00f5ff?style=flat-square)]()

</div>

---

## What is NEXUS ULTRA?

NEXUS ULTRA is a desktop cybersecurity platform that puts 12 specialized AI agents at your fingertips — all running locally via Electron, powered by free-tier AI engines (Groq, Gemini) or your own local Ollama models. No cloud subscriptions required.

It was built for penetration testers, red team operators, CTF competitors, and security researchers who want a single unified workspace for reconnaissance, exploitation, OSINT, vulnerability analysis, and reporting.

It also ships a built-in **MCP server** so Claude Code CLI can connect directly to your engagement data — read targets, query findings, and add vulnerabilities from your terminal without leaving your workflow.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
- [Getting Started](#getting-started)
- [AI Engine Setup](#ai-engine-setup)
- [Claude Code Integration](#claude-code-integration)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Features

### 12 Elite AI Agents
| Agent | Role |
|-------|------|
| **RECON** | Passive/active reconnaissance, subdomain enumeration |
| **EXPLOIT** | CVE analysis, exploitation guidance, PoC generation |
| **OSINT** | Open-source intelligence, social footprinting |
| **VULN** | Vulnerability assessment, risk scoring |
| **NETWORK** | Network mapping, traffic analysis |
| **WEB** | Web application security, injection, auth bypass |
| **CRYPTO** | Cryptographic analysis, hash cracking guidance |
| **FORENSICS** | Digital forensics, log analysis, artifact extraction |
| **AUTOPWN** | Automated attack path planning |
| **EVADE** | Defense evasion, AV bypass techniques |
| **LATERAL** | Lateral movement, privilege escalation |
| **CTF** | Capture The Flag specialist, challenge solver |

### AI Engines — Mix and Match
| Engine | Models | Cost |
|--------|--------|------|
| **Groq** | Llama 3.3 70B, DeepSeek R1 | Free — 800+ tok/s |
| **Gemini** | Gemini 2.0 Flash | Free — 1M tokens/day |
| **Ollama** | Any local model | Free — fully offline |
| **Anthropic** | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5 | Paid — best quality |
| **OpenAI** | GPT-4o, GPT-4o Mini | Paid |

### Platform Capabilities
- **Kali Linux Docker** — Full Kali environment with 100+ tools, accessible from the app
- **Live Terminal** — Interactive shell with xterm.js
- **Target Management** — Track hosts, domains, findings per engagement
- **Knowledge Graph** — Visual network topology with Cytoscape.js
- **Vulnerability Database** — Findings with severity scoring and CVE links
- **Report Generation** — AI-generated engagement reports
- **OSINT Suite** — Subdomain, port, email, and social enumeration
- **Command Palette** — `⌘K` / `Ctrl+K` instant navigation across the entire app
- **Claude Code MCP** — Connect Claude Code CLI to your live engagement data

---

## Installation

### macOS

**Requirements:** macOS 12 Monterey or later. Apple Silicon (M1/M2/M3/M4) and Intel both supported.

1. Go to the [**Releases page**](https://github.com/flippits/nexus-ultra/releases) and download `NEXUS ULTRA-*-mac.dmg`
2. Open the `.dmg` file
3. Drag **NEXUS ULTRA** into your Applications folder
4. Eject the disk image

**First launch — bypassing the security warning**

Because the app is not signed with an Apple Developer certificate, macOS will block it on first open. You only need to do this once.

**Option 1 — right-click (easiest):**
1. Open your Applications folder
2. Right-click (or Control-click) `NEXUS ULTRA.app` → **Open**
3. Click **Open** in the dialog

**Option 2 — Terminal (one command):**
```bash
xattr -cr "/Applications/NEXUS ULTRA.app"
```
Then double-click to open normally.

**Option 3 — System Settings:**
System Settings → Privacy & Security → scroll down → **Open Anyway**

---

### Windows

**Requirements:** Windows 10 or Windows 11, 64-bit.

1. Go to the [**Releases page**](https://github.com/flippits/nexus-ultra/releases) and download `NEXUS ULTRA Setup *.exe`
2. Run the installer — Windows SmartScreen may show a warning because the app is not code-signed. Click **More info → Run anyway**
3. Follow the installer steps (choose install directory, create shortcuts)
4. Launch from the Start Menu or Desktop shortcut

**Silent install (no UI):**
```cmd
"NEXUS ULTRA Setup 1.0.6.exe" /S
```

---

### Linux

**Requirements:** Any modern 64-bit Linux distribution with glibc 2.31+ (Ubuntu 20.04+, Debian 11+, Fedora 34+, Arch, etc.).

1. Go to the [**Releases page**](https://github.com/flippits/nexus-ultra/releases) and download `NEXUS ULTRA-*.AppImage`
2. Make it executable and run:

```bash
chmod +x "NEXUS ULTRA-*.AppImage"
./"NEXUS ULTRA-*.AppImage"
```

**Optional — integrate with your desktop:**
```bash
# Move to a permanent location
mv "NEXUS ULTRA-*.AppImage" ~/.local/bin/nexus-ultra.AppImage

# Create a .desktop entry
cat > ~/.local/share/applications/nexus-ultra.desktop << EOF
[Desktop Entry]
Name=NEXUS ULTRA
Exec=/home/$USER/.local/bin/nexus-ultra.AppImage
Type=Application
Categories=Security;
EOF
```

**Troubleshooting on Linux:**

If the AppImage fails to start with a `FUSE` error:
```bash
# Install FUSE (Ubuntu/Debian)
sudo apt install libfuse2

# Or extract and run directly without FUSE
./nexus-ultra.AppImage --appimage-extract
./squashfs-root/AppRun
```

---

## Getting Started

1. **Launch** NEXUS ULTRA after installing
2. The **onboarding wizard** opens on first run — it walks you through AI engine setup
3. **Add an AI engine** (pick one — all are optional, you can change later):
   - Groq (recommended for speed) — paste your free API key
   - Gemini — paste your free API key
   - Ollama — select your installed local model
   - Anthropic / OpenAI — paste a paid API key for best quality
4. **Add a target** — go to Targets → New Target, enter a hostname, IP, or domain
5. **Select your target** using the target picker in the top bar
6. **Choose an agent** in the AI page and start your engagement

**Keyboard shortcut:** Press `⌘K` (macOS) or `Ctrl+K` (Windows/Linux) anywhere in the app to open the command palette for instant navigation.

---

## AI Engine Setup

All AI engines are optional. The app will use whichever engine you have configured, falling back to Ollama if no cloud key is set.

### Groq (free, fastest)

1. Go to [console.groq.com](https://console.groq.com) and sign up (free)
2. Create an API key
3. In NEXUS ULTRA: Settings → API Keys → Groq API Key → paste your key → Save

### Gemini (free, 1M tokens/day)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and sign in with a Google account
2. Click **Create API key**
3. In NEXUS ULTRA: Settings → API Keys → Gemini API Key → paste your key → Save

### Ollama (free, offline)

1. Download and install Ollama from [ollama.com](https://ollama.com)
2. Pull a model (recommended for quality/speed balance):
   ```bash
   ollama pull qwen2.5:32b        # Best quality (~20GB)
   ollama pull llama3.2:latest    # Fastest (~2GB)
   ollama pull mistral:latest     # Balanced (~4GB)
   ```
3. Ollama runs automatically in the background — NEXUS ULTRA detects it on startup

### Anthropic — Claude (paid)

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account
2. Navigate to API Keys → Create Key
3. In NEXUS ULTRA: Settings → API Keys → Anthropic API Key → paste your key → Save
4. In the AI page, select Claude Opus 4.7, Sonnet 4.6, or Haiku 4.5 from the model dropdown

### OpenAI — GPT-4o (paid)

1. Go to [platform.openai.com](https://platform.openai.com) and create an account
2. Navigate to API Keys → Create new secret key
3. In NEXUS ULTRA: Settings → API Keys → OpenAI API Key → paste your key → Save

---

## Claude Code Integration

NEXUS ULTRA runs a built-in **MCP (Model Context Protocol) server** on `http://localhost:8765/mcp`. When the app is open, Claude Code CLI can connect to it and interact with your live engagement data directly from the terminal.

### What Claude Code can do

| Tool | Description |
|------|-------------|
| `list_targets` | List all tracked engagement targets |
| `get_target(id)` | Get full details for a target |
| `list_findings(target_id?, severity?)` | Query findings — filter by target and/or severity |
| `add_finding(target_id, title, severity, ...)` | Add a vulnerability finding from the terminal |
| `list_scans(target_id)` | View scan history and tool output |
| `get_report(target_id)` | Pull the AI-generated pentest report |

### Setup

**Step 1 — Install Claude Code** (requires Node.js 18+):
```bash
npm install -g @anthropic-ai/claude-code
```

**Step 2 — Open NEXUS ULTRA.** The backend must be running for Claude Code to reach it.

**Step 3 — Add the MCP server to your config.**

Open (or create) `~/.claude.json` and add the following. If the file already has content, merge the `mcpServers` key into it.

```json
{
  "mcpServers": {
    "nexus-ultra": {
      "type": "http",
      "url": "http://localhost:8765/mcp"
    }
  }
}
```

| OS | Config file location |
|----|---------------------|
| macOS / Linux | `~/.claude.json` |
| Windows | `%USERPROFILE%\.claude.json` |

> **Shortcut:** Settings → Claude Code Integration inside the app shows this exact block pre-filled with your configured port and a one-click **COPY** button.

**Step 4 — Launch Claude Code:**
```bash
claude
```

Claude Code will automatically discover the `nexus-ultra` MCP server on startup.

### Example prompts

Once connected, you can use natural language — Claude Code calls the MCP tools automatically:

```
list my NEXUS targets
show all critical findings across all targets
show high and critical findings for target 2
add a finding to target 1: SQL injection on /login endpoint, severity high
what scans have been run against example.com?
summarize the pentest report for target 3
how many findings does each target have, grouped by severity?
```

### Notes

- **NEXUS ULTRA must be open** while you use the integration — the MCP server only runs while the Electron app is running.
- The server binds to `localhost` only and is not reachable from other machines on your network.
- Active scanning tools (`run_tool`, `nmap`, `gobuster`, etc.) are intentionally not exposed over MCP — use the app's Tools page or terminal for active operations.

---

## Development Setup

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://python.org) — 3.12 and 3.13 also work |
| Git | any | |
| Docker | optional | For Kali Linux integration |
| Ollama | optional | For local AI models |

### Clone and install

```bash
git clone https://github.com/flippits/nexus-ultra.git
cd nexus-ultra
```

**Backend:**
```bash
cd backend

# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate        # macOS/Linux
# or: .venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Configure API keys

```bash
# Copy the example env file (never committed to git)
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add any keys you have:

```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

At least one key is needed for cloud AI. Leave all blank to use Ollama only.

### Start the app

```bash
cd frontend
npm start
```

This single command starts everything in parallel via `concurrently`:
- **Vite** dev server on `http://localhost:5173`
- **FastAPI** backend on `http://localhost:8765`
- **Electron** (waits for Vite, then opens the app window)

Hot reload is active — React/Vite changes reflect instantly; Python changes require a backend restart.

### Build a distributable installer

```bash
cd frontend

# macOS DMG (run on macOS)
npm run build:mac

# Windows NSIS installer (run on Windows)
npm run build:win

# Linux AppImage (run on Linux)
npm run build:linux
```

Output goes to `dist-app/`. The Python backend is bundled by PyInstaller into the installer so end users don't need Python installed.

### Common issues

**`Backend offline` in the status bar**
- Make sure you ran `pip install -r requirements.txt` in the `backend/` directory
- Check that port 8765 is not already in use: `lsof -i :8765` (macOS/Linux) or `netstat -ano | findstr 8765` (Windows)

**Electron window is blank / white**
- Vite may still be starting. Wait 5 seconds and reload with `Ctrl+R`

**Python `ModuleNotFoundError`**
- Make sure your virtual environment is activated before running `npm start`, or set the Python path in Settings

**`ollama: command not found` / Ollama not detected**
- Install Ollama from [ollama.com](https://ollama.com) and ensure the daemon is running (`ollama serve`)

---

## Project Structure

```
nexus-ultra/
├── backend/                    # Python FastAPI backend
│   ├── routers/
│   │   ├── ai.py               # 12 AI agents, model routing, streaming
│   │   ├── targets.py          # Engagement target CRUD
│   │   ├── findings.py         # Vulnerability findings CRUD
│   │   ├── reports.py          # AI-generated report endpoints
│   │   ├── osint.py            # OSINT tools (subdomain, email, social)
│   │   ├── tools.py            # Tool wrappers (nmap, gobuster, ffuf, etc.)
│   │   ├── network.py          # Live network discovery
│   │   ├── graph.py            # Knowledge graph nodes/edges
│   │   ├── docker_router.py    # Kali Linux container management
│   │   ├── flipper.py          # Flipper Zero serial integration
│   │   └── mcp_router.py       # MCP server — Claude Code integration
│   ├── main.py                 # FastAPI app entry point, middleware, MCP mount
│   ├── database.py             # SQLAlchemy async models (Target, Finding, Scan, Report)
│   ├── docker_manager.py       # Docker SDK wrapper
│   ├── nexus_backend.spec      # PyInstaller bundle spec
│   ├── .env.example            # API key template (copy to .env)
│   └── requirements.txt        # Python dependencies
├── frontend/                   # Electron + React app
│   ├── src/
│   │   ├── pages/              # Full-page views
│   │   │   ├── AIPage.jsx      # AI agents interface
│   │   │   ├── WarRoom.jsx     # Dashboard / command center
│   │   │   ├── TargetManager.jsx
│   │   │   ├── FindingsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── OsintPage.jsx
│   │   │   ├── ToolsPage.jsx
│   │   │   ├── GraphView.jsx
│   │   │   ├── NetworkPage.jsx
│   │   │   ├── CTFPage.jsx
│   │   │   ├── DockerPage.jsx
│   │   │   ├── FlipperPage.jsx
│   │   │   ├── UtilitiesPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── components/
│   │   │   ├── TopBar.jsx      # Global nav, target selector, clock
│   │   │   ├── Sidebar.jsx     # Navigation sidebar
│   │   │   ├── CommandPalette.jsx  # ⌘K palette
│   │   │   └── ...
│   │   └── store/
│   │       └── index.js        # Zustand global state
│   ├── electron.cjs            # Electron main process, backend lifecycle
│   ├── preload.cjs             # Electron preload bridge (contextBridge)
│   ├── vite.config.js          # Vite config
│   └── package.json            # Dependencies + electron-builder config
├── docker/                     # Kali Linux Docker configuration
├── data/
│   └── wordlists/              # Optional wordlists (not committed)
└── .github/
    └── workflows/
        └── release.yml         # CI/CD — builds Mac/Win/Linux on git tag push
```

---

## Contributing

Contributions are welcome and appreciated. Here's how to get involved quickly.

### Good first contributions

- **Improve agent prompts** — the system prompts in `backend/routers/ai.py` shape every agent's personality and output quality. Small prompt improvements have a big impact.
- **Add a new MCP tool** — expose more data to Claude Code in `backend/routers/mcp_router.py` (e.g. `search_findings`, `get_scan_output`, `list_graph_nodes`)
- **Bug fixes** — check the [Issues tab](https://github.com/flippits/nexus-ultra/issues) for open bugs
- **UI polish** — improve any page in `frontend/src/pages/`
- **Documentation** — clarify anything in this README or add inline code comments

### Quick start for contributors

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/nexus-ultra.git
cd nexus-ultra

# 2. Create a branch
git checkout -b feat/your-feature-name

# 3. Set up dev environment (see Development Setup above)

# 4. Make your changes, test them end-to-end

# 5. Commit and push
git add .
git commit -m "feat: describe what you changed"
git push origin feat/your-feature-name

# 6. Open a Pull Request against main on GitHub
```

### Branch naming

```
feat/short-description       new feature
fix/short-description        bug fix
agent/agent-name             new or improved AI agent
docs/short-description       documentation only
refactor/short-description   refactor with no behaviour change
```

### Adding a new AI agent

Agents are defined in two places — both must use the same `id`:

1. **Backend** (`backend/routers/ai.py`) — add an entry to the `AGENTS` dict with `id`, `name`, and `system` (the full system prompt)
2. **Frontend** (`frontend/src/pages/AIPage.jsx`) — add an entry to the `AGENTS` array with `id`, `name`, `color`, `icon`, and `desc`

### Pull request checklist

- The app starts cleanly (`npm start`)
- Your change works end-to-end, not just in isolation
- No secrets, `.env` files, or personal data in the commit
- PR title is clear and describes the change (not "fix stuff")
- One feature or fix per PR — keep them small and focused

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide including code style, sensitive data rules, and more.

---

## Security

NEXUS ULTRA is built for **authorized security testing only**. Do not use it against systems you do not have explicit written permission to test.

If you discover a security vulnerability in NEXUS ULTRA itself, please open a private GitHub issue or contact the maintainers directly rather than disclosing publicly.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built by <a href="https://github.com/flippits">flippits</a> — contributions welcome
</div>
